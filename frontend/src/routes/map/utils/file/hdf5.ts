import * as hdf5 from 'jsfive';
import type { FeatureCollection } from '$routes/map/types/geojson';

/** HDF5データセットの情報 */
export interface Hdf5DatasetInfo {
	path: string;
	shape: number[];
	dtype: string;
}

/** HDF5ファイルの情報 */
export interface Hdf5FileInfo {
	datasets: Hdf5DatasetInfo[];
	groups: string[];
	attrs: Record<string, unknown>;
}

/** File APIからjsfive.Fileオブジェクトを返す */
const openHdf5File = async (file: File): Promise<InstanceType<typeof hdf5.File>> => {
	const buffer = await file.arrayBuffer();
	return new hdf5.File(buffer, file.name);
};

/**
 * HDF5ファイル内のグループとデータセットを再帰的に走査する
 */
const collectItems = (
	group: InstanceType<typeof hdf5.Group>,
	basePath: string
): { datasets: Hdf5DatasetInfo[]; groups: string[] } => {
	const datasets: Hdf5DatasetInfo[] = [];
	const groups: string[] = [];

	for (const key of group.keys) {
		const path = basePath ? `${basePath}/${key}` : key;
		const item = group.get(key);
		if (!item) continue;

		if (item instanceof hdf5.Dataset) {
			datasets.push({
				path,
				shape: item.shape ?? [],
				dtype: item.dtype ?? ''
			});
		} else if (item instanceof hdf5.Group) {
			groups.push(path);
			const nested = collectItems(item, path);
			datasets.push(...nested.datasets);
			groups.push(...nested.groups);
		}
	}

	return { datasets, groups };
};

/**
 * HDF5ファイルの情報（データセット一覧・グループ一覧・属性）を取得する
 * @param file - HDF5ファイル
 */
export const getHdf5FileInfo = async (file: File): Promise<Hdf5FileInfo> => {
	try {
		const f = await openHdf5File(file);
		const { datasets, groups } = collectItems(f, '');
		const attrs = f.attrs ?? {};

		return { datasets, groups, attrs };
	} catch (error) {
		console.error('HDF5ファイルの情報取得に失敗しました:', error);
		throw new Error('Failed to read HDF5 file info');
	}
};

/**
 * HDF5ファイルから指定パスのデータセットの値を取得する
 * @param file - HDF5ファイル
 * @param datasetPath - データセットのパス (例: "data/temperature")
 */
export const getHdf5Dataset = async (
	file: File,
	datasetPath: string
): Promise<{ value: unknown; shape: number[]; dtype: string; attrs: Record<string, unknown> }> => {
	try {
		const f = await openHdf5File(file);
		const dataset = f.get(datasetPath);

		if (!dataset) {
			throw new Error(`データセット '${datasetPath}' が見つかりません`);
		}

		if (!(dataset instanceof hdf5.Dataset)) {
			throw new Error(`'${datasetPath}' はデータセットではありません`);
		}

		return {
			value: dataset.value,
			shape: dataset.shape ?? [],
			dtype: dataset.dtype ?? '',
			attrs: dataset.attrs ?? {}
		};
	} catch (error) {
		console.error('HDF5データセットの読み込みに失敗しました:', error);
		throw error;
	}
};

/**
 * EarthCARE MSI CLP HDF5ファイルからスワス範囲ポリゴンGeoJSONを生成する
 * latitude/longitude (2D: scanlines x pixels) の左端・右端列で観測範囲ポリゴンを構築
 * @param file - HDF5ファイル (File API)
 */
export const msiClpToOrbitTrackGeojson = async (file: File): Promise<FeatureCollection> => {
	const f = await openHdf5File(file);
	return buildMsiClpSwathGeojson(f);
};

/** HDF5のfill valueかどうかを判定する */
const isFillValue = (v: number): boolean => Math.abs(v) > 1e36 || isNaN(v);

/**
 * 2D flat arrayの各行から有効な最左端/最右端のインデックスを探す
 */
const getValidEdges = (
	latFlat: ArrayLike<number>,
	lonFlat: ArrayLike<number>,
	rows: number,
	cols: number
): { left: [number, number][]; right: [number, number][] } => {
	const left: [number, number][] = [];
	const right: [number, number][] = [];

	for (let r = 0; r < rows; r++) {
		const offset = r * cols;

		// 左端: 最初の有効ピクセル
		let lIdx = -1;
		for (let c = 0; c < cols; c++) {
			if (!isFillValue(latFlat[offset + c]) && !isFillValue(lonFlat[offset + c])) {
				lIdx = c;
				break;
			}
		}

		// 右端: 最後の有効ピクセル
		let rIdx = -1;
		for (let c = cols - 1; c >= 0; c--) {
			if (!isFillValue(latFlat[offset + c]) && !isFillValue(lonFlat[offset + c])) {
				rIdx = c;
				break;
			}
		}

		if (lIdx >= 0 && rIdx >= 0) {
			left.push([lonFlat[offset + lIdx], latFlat[offset + lIdx]]);
			right.push([lonFlat[offset + rIdx], latFlat[offset + rIdx]]);
		}
	}

	return { left, right };
};

/**
 * jsfive.FileオブジェクトからMSI CLPスワスポリゴンGeoJSONを構築する
 * 各スキャンラインの有効な最左端・最右端の座標でポリゴンを作成
 */
const buildMsiClpSwathGeojson = (f: InstanceType<typeof hdf5.File>): FeatureCollection => {
	const latDataset = f.get('ScienceData/Geo/latitude');
	const lonDataset = f.get('ScienceData/Geo/longitude');

	if (!latDataset || !lonDataset) {
		throw new Error('latitude/longitude データセットが見つかりません');
	}
	if (!(latDataset instanceof hdf5.Dataset) || !(lonDataset instanceof hdf5.Dataset)) {
		throw new Error('latitude/longitude がデータセットではありません');
	}

	const latFlat = latDataset.value as ArrayLike<number>;
	const lonFlat = lonDataset.value as ArrayLike<number>;
	const [rows, cols] = latDataset.shape as [number, number];

	const { left, right } = getValidEdges(latFlat, lonFlat, rows, cols);

	if (left.length === 0) {
		throw new Error('有効な座標データがありません');
	}

	// 左端を順方向 → 右端を逆方向 → 始点に戻して閉じる
	const coordinates: [number, number][] = [...left, ...[...right].reverse(), left[0]];

	return {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [coordinates]
				},
				properties: { type: 'swath', num_scanlines: rows, num_pixels: cols }
			}
		]
	};
};

/**
 * EarthCARE CPR CLP HDF5ファイルから軌道トラックGeoJSONを生成する
 * latitude/longitude/profile_class (1D) を使用
 * @param file - HDF5ファイル (File API)
 */
export const cprClpToOrbitTrackGeojson = async (file: File): Promise<FeatureCollection> => {
	const f = await openHdf5File(file);
	return buildCprClpOrbitTrackGeojson(f);
};

/**
 * jsfive.FileオブジェクトからCPR CLP軌道トラックGeoJSONを構築する
 */
const buildCprClpOrbitTrackGeojson = (f: InstanceType<typeof hdf5.File>): FeatureCollection => {
	const latDataset = f.get('ScienceData/Geo/latitude');
	const lonDataset = f.get('ScienceData/Geo/longitude');

	if (!latDataset || !lonDataset) {
		throw new Error('latitude/longitude データセットが見つかりません');
	}
	if (!(latDataset instanceof hdf5.Dataset) || !(lonDataset instanceof hdf5.Dataset)) {
		throw new Error('latitude/longitude がデータセットではありません');
	}

	const latitude = latDataset.value as number[];
	const longitude = lonDataset.value as number[];

	const features: FeatureCollection['features'] = [];

	// // 各観測点をPointとして追加
	// for (let i = 0; i < latitude.length; i++) {
	// 	features.push({
	// 		type: 'Feature',
	// 		geometry: {
	// 			type: 'Point',
	// 			coordinates: [longitude[i], latitude[i]]
	// 		},
	// 		properties: { index: i }
	// 	});
	// }

	// 軌道全体をLineStringとして追加
	features.push({
		type: 'Feature',
		geometry: {
			type: 'LineString',
			coordinates: latitude.map((lat, i) => [longitude[i], lat])
		},
		properties: { type: 'orbit_track', num_points: latitude.length }
	});

	return { type: 'FeatureCollection', features };
};

/**
 * EarthCARE CPR FMR HDF5ファイルから軌道トラックGeoJSONを生成する
 * latitude/longitude (1D, ScienceData直下) を使用
 * @param file - HDF5ファイル (File API)
 */
export const cprFmrToOrbitTrackGeojson = async (file: File): Promise<FeatureCollection> => {
	const f = await openHdf5File(file);
	return buildCprFmrOrbitTrackGeojson(f);
};

/**
 * jsfive.FileオブジェクトからCPR FMR軌道トラックGeoJSONを構築する
 */
const buildCprFmrOrbitTrackGeojson = (f: InstanceType<typeof hdf5.File>): FeatureCollection => {
	const latDataset = f.get('ScienceData/latitude');
	const lonDataset = f.get('ScienceData/longitude');

	if (!latDataset || !lonDataset) {
		throw new Error('latitude/longitude データセットが見つかりません');
	}
	if (!(latDataset instanceof hdf5.Dataset) || !(lonDataset instanceof hdf5.Dataset)) {
		throw new Error('latitude/longitude がデータセットではありません');
	}

	const latitude = latDataset.value as number[];
	const longitude = lonDataset.value as number[];

	const features: FeatureCollection['features'] = [];

	// 軌道全体をLineStringとして追加
	features.push({
		type: 'Feature',
		geometry: {
			type: 'LineString',
			coordinates: latitude.map((lat, i) => [longitude[i], lat])
		},
		properties: { type: 'orbit_track', num_points: latitude.length }
	});

	return { type: 'FeatureCollection', features };
};
