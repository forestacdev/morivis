/**
 * NetCDFファイルの解析ユーティリティ
 * netcdfjsを使ってブラウザ上でNetCDFを読み込み、
 * 2Dラスターデータを抽出してTiffエントリに変換するための情報を提供する
 */
import { NetCDFReader } from 'netcdfjs';

export interface NetCDFVariableInfo {
	name: string;
	dimensions: string[];
	shape: number[];
	type: string;
	attributes: Record<string, string | number>;
}

export interface NetCDFDimensionInfo {
	name: string;
	size: number;
}

export interface NetCDFInfo {
	dimensions: NetCDFDimensionInfo[];
	variables: NetCDFVariableInfo[];
	globalAttributes: Record<string, string | number>;
	/** 2Dラスターとして使える変数（次元が2以上） */
	rasterVariables: NetCDFVariableInfo[];
	/** 緯度の変数名 */
	latVar?: string;
	/** 経度の変数名 */
	lonVar?: string;
}

/** 緯度変数の候補名 */
const LAT_NAMES = ['lat', 'latitude', 'y', 'nav_lat', 'nlat', 'rlat'];
/** 経度変数の候補名 */
const LON_NAMES = ['lon', 'longitude', 'x', 'nav_lon', 'nlon', 'rlon'];

const findCoordVar = (variables: NetCDFVariableInfo[], candidates: string[]): string | undefined =>
	variables.find((v) =>
		candidates.some((c) => v.name.toLowerCase() === c || v.name.toLowerCase().startsWith(c))
	)?.name;

/**
 * NetCDFファイルを解析してメタデータを取得
 */
export const parseNetCDF = (arrayBuffer: ArrayBuffer): { reader: NetCDFReader; info: NetCDFInfo } => {
	const reader = new NetCDFReader(arrayBuffer);

	const dimensions: NetCDFDimensionInfo[] = reader.dimensions.map((d: any) => ({
		name: d.name,
		size: d.size
	}));

	const variables: NetCDFVariableInfo[] = reader.variables.map((v: any) => {
		const attrs: Record<string, string | number> = {};
		if (v.attributes) {
			for (const a of v.attributes) {
				attrs[a.name] = a.value;
			}
		}

		// dimensionsがインデックス配列の場合、reader.dimensionsから名前とサイズを取得
		const dimIndices = Array.isArray(v.dimensions) ? v.dimensions : Array.from(v.dimensions);
		const dimNames: string[] = [];
		let shape: number[] = [];

		for (const d of dimIndices) {
			if (typeof d === 'string') {
				dimNames.push(d);
				const dim = reader.dimensions.find((rd: any) => rd.name === d);
				shape.push(dim ? (dim.size as number) : 0);
			} else if (typeof d === 'number') {
				const dim = reader.dimensions[d];
				dimNames.push(dim ? dim.name : `dim_${d}`);
				shape.push(dim ? (dim.size as number) : 0);
			} else if (d && typeof d === 'object' && 'name' in d) {
				dimNames.push(d.name);
				shape.push((d.size as number) ?? 0);
			}
		}

		// shapeが全部0の場合、v.sizeから推定を試みる
		if (shape.every((s) => s === 0) && v.size != null) {
			const totalSize = v.size as number;
			if (shape.length === 2) {
				const side = Math.round(Math.sqrt(totalSize));
				if (side * side === totalSize) {
					shape = [side, side];
				} else {
					for (let i = Math.round(Math.sqrt(totalSize)); i > 0; i--) {
						if (totalSize % i === 0) {
							shape = [totalSize / i, i];
							break;
						}
					}
				}
			}
		}

		return {
			name: v.name,
			dimensions: dimNames,
			shape: shape as number[],
			type: v.type,
			attributes: attrs
		};
	});

	const globalAttributes: Record<string, string | number> = {};
	if (reader.globalAttributes) {
		for (const a of reader.globalAttributes) {
			globalAttributes[a.name] = a.value;
		}
	}

	// 2D以上の変数をラスター候補としてフィルタ
	const rasterVariables = variables.filter((v) => v.dimensions.length >= 2);

	const latVar = findCoordVar(variables, LAT_NAMES);
	const lonVar = findCoordVar(variables, LON_NAMES);

	return {
		reader,
		info: {
			dimensions,
			variables,
			globalAttributes,
			rasterVariables,
			latVar,
			lonVar
		}
	};
};

/**
 * NetCDFから2Dラスターデータを抽出する
 * 3次元以上の場合はsliceIndexで指定した次元のスライスを取得
 */
export const extractRasterData = (
	reader: NetCDFReader,
	variableName: string,
	info: NetCDFInfo,
	sliceIndices?: Record<string, number>
): {
	data: Float32Array;
	width: number;
	height: number;
	bbox: [number, number, number, number] | null;
	nodata: number | null;
} => {
	const variable = info.variables.find((v) => v.name === variableName);
	if (!variable) throw new Error(`Variable "${variableName}" not found`);

	// 変数データを取得
	const rawData = reader.getDataVariable(variableName);

	// 変数の属性からnodataを取得
	const nodata =
		variable.attributes['_FillValue'] != null
			? Number(variable.attributes['_FillValue'])
			: variable.attributes['missing_value'] != null
				? Number(variable.attributes['missing_value'])
				: null;

	// 次元情報を解析
	const dims = variable.dimensions;
	const shape = variable.shape;

	// 最後の2次元をY, Xとして扱う
	const yDimIdx = dims.length - 2;
	const xDimIdx = dims.length - 1;
	let height = shape[yDimIdx] ?? 0;
	let width = shape[xDimIdx] ?? 0;

	// shapeが取得できなかった場合、データ長から推定
	if ((width === 0 || height === 0) && rawData.length > 0) {
		const totalPixels = rawData.length;
		// 座標変数があればそのサイズを使う
		if (info.latVar && info.lonVar) {
			try {
				const latSize = (reader.getDataVariable(info.latVar) as number[]).length;
				const lonSize = (reader.getDataVariable(info.lonVar) as number[]).length;
				if (latSize * lonSize === totalPixels) {
					height = latSize;
					width = lonSize;
				}
			} catch { /* ignore */ }
		}
		// それでもダメなら正方形を推定
		if (width === 0 || height === 0) {
			const side = Math.round(Math.sqrt(totalPixels));
			if (side * side === totalPixels) {
				height = side;
				width = side;
			} else {
				for (let i = Math.round(Math.sqrt(totalPixels)); i > 0; i--) {
					if (totalPixels % i === 0) {
						height = totalPixels / i;
						width = i;
						break;
					}
				}
			}
		}
	}

	let data: Float32Array;

	// rawDataを数値配列として扱う
	const numericData = rawData as number[];

	if (dims.length === 2) {
		data = new Float32Array(numericData);
	} else {
		data = new Float32Array(width * height);
		const totalPixels = width * height;

		let offset = 0;
		for (let i = 0; i < dims.length - 2; i++) {
			const idx = sliceIndices?.[dims[i]] ?? 0;
			let stride = 1;
			for (let j = i + 1; j < dims.length; j++) {
				stride *= shape[j];
			}
			offset += idx * stride;
		}

		for (let i = 0; i < totalPixels; i++) {
			data[i] = numericData[offset + i];
		}
	}

	// bbox取得
	let bbox: [number, number, number, number] | null = null;
	if (info.latVar && info.lonVar) {
		try {
			const latData = reader.getDataVariable(info.latVar) as number[];
			const lonData = reader.getDataVariable(info.lonVar) as number[];

			if (latData.length > 0 && lonData.length > 0) {
				const minLat = Math.min(...latData);
				const maxLat = Math.max(...latData);
				const minLon = Math.min(...lonData);
				const maxLon = Math.max(...lonData);
				bbox = [minLon, minLat, maxLon, maxLat];
			}
		} catch {
			// 座標変数の読み込み失敗
		}
	}

	return { data, width, height, bbox, nodata };
};

/**
 * 次元のスライス用の値一覧を取得（time等）
 * 次元に対応する座標変数がある場合はその値を返す
 */
export const getDimensionValues = (
	reader: NetCDFReader,
	dimensionName: string,
	info: NetCDFInfo
): number[] | string[] | null => {
	// 次元と同名の変数があれば、その値を返す
	const coordVar = info.variables.find((v) => v.name === dimensionName);
	if (coordVar && coordVar.dimensions.length === 1) {
		try {
			return reader.getDataVariable(dimensionName) as number[] | string[];
		} catch {
			return null;
		}
	}
	return null;
};
