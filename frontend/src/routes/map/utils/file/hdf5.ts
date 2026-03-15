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

/** 日付変更線をまたぐかどうかを判定する（経度差が180度超） */
const crossesAntimeridian = (lon1: number, lon2: number): boolean => Math.abs(lon2 - lon1) > 180;

/**
 * 座標配列を日付変更線で分割してLineStringセグメントの配列を返す
 */
const splitLineAtAntimeridian = (
	coords: [number, number][]
): [number, number][][] => {
	if (coords.length < 2) return [coords];

	const segments: [number, number][][] = [];
	let current: [number, number][] = [coords[0]];

	for (let i = 1; i < coords.length; i++) {
		if (crossesAntimeridian(coords[i - 1][0], coords[i][0])) {
			// 前のセグメントを閉じる（p1側の境界点）
			current.push(interpolateAtAntimeridian(coords[i - 1], coords[i]));
			segments.push(current);

			// 新しいセグメントを開始（p2側の境界点）
			current = [interpolateAtAntimeridian(coords[i], coords[i - 1]), coords[i]];
		} else {
			current.push(coords[i]);
		}
	}

	if (current.length > 0) {
		segments.push(current);
	}

	return segments;
};

/**
 * 座標配列から日付変更線で分割された軌道トラックGeoJSONを生成する
 */
const buildOrbitTrackFeatures = (coords: [number, number][]): FeatureCollection => {
	const segments = splitLineAtAntimeridian(coords);

	return {
		type: 'FeatureCollection',
		features: segments.map((seg) => ({
			type: 'Feature' as const,
			geometry: { type: 'LineString' as const, coordinates: seg },
			properties: { type: 'orbit_track', num_points: seg.length }
		}))
	};
};

/**
 * 2点間の日付変更線上の緯度を線形補間する
 * p1 → p2 が日付変更線をまたぐとき、p1側の±180境界上の点を返す
 */
const interpolateAtAntimeridian = (
	p1: [number, number],
	p2: [number, number]
): [number, number] => {
	const [lon1, lat1] = p1;
	const [lon2, lat2] = p2;

	// p1からの距離（±180境界まで）と p2からの距離を計算
	const d1 = lon1 < 0 ? 180 + lon1 : 180 - lon1; // p1から境界までの距離
	const d2 = lon2 < 0 ? 180 + lon2 : 180 - lon2; // p2から境界までの距離
	const t = d1 / (d1 + d2);
	const latMid = lat1 + (lat2 - lat1) * t;
	return [lon1 < 0 ? -180 : 180, latMid];
};

/**
 * スキャンラインの左辺と右辺が日付変更線の同じ側にあるか判定
 * 両方が同じ符号 → same side, 異なる符号で差が180超 → straddle
 */
const straddlesAntimeridian = (leftLon: number, rightLon: number): boolean =>
	(leftLon < 0 && rightLon > 0 && rightLon - leftLon > 180) ||
	(rightLon < 0 && leftLon > 0 && leftLon - rightLon > 180);

/**
 * 左端・右端の座標ペアから日付変更線で分割されたポリゴン群を生成する
 *
 * 3つのケースを処理:
 * 1. 日付変更線をまたがないセグメント → 通常のポリゴン
 * 2. スワスが日付変更線にまたがるセグメント → 西側(-180境界)と東側(+180境界)に分割
 * 3. セグメント境界 → 補間点を追加
 */
const buildSwathPolygons = (
	left: [number, number][],
	right: [number, number][]
): [number, number][][][] => {
	// 分割ポイントのインデックスを収集
	const splitIndices: number[] = [];
	for (let i = 1; i < left.length; i++) {
		if (crossesAntimeridian(left[i - 1][0], left[i][0]) ||
			crossesAntimeridian(right[i - 1][0], right[i][0])) {
			splitIndices.push(i);
		}
	}

	if (splitIndices.length === 0) {
		const ring: [number, number][] = [...left, ...[...right].reverse(), left[0]];
		return [[ring]];
	}

	const polygons: [number, number][][][] = [];
	const boundaries = [0, ...splitIndices, left.length];

	for (let b = 0; b < boundaries.length - 1; b++) {
		const start = boundaries[b];
		const end = boundaries[b + 1];
		if (end - start < 2) continue;

		// このセグメントがスワスとして日付変更線をまたいでいるか判定
		const isStraddling = straddlesAntimeridian(left[start][0], right[start][0]);

		if (isStraddling) {
			// スワスが日付変更線をまたぐ: 西側と東側に分割
			const westLeft: [number, number][] = [];
			const westRight: [number, number][] = []; // -180境界
			const eastLeft: [number, number][] = []; // +180境界
			const eastRight: [number, number][] = [];

			for (let i = start; i < end; i++) {
				// 左辺は負の経度側（西側）
				if (left[i][0] < 0) {
					westLeft.push(left[i]);
					westRight.push([-180, left[i][1]]);
				} else {
					westLeft.push(left[i]);
					westRight.push([-180, left[i][1]]);
				}
				// 右辺は正の経度側（東側）
				if (right[i][0] > 0) {
					eastRight.push(right[i]);
					eastLeft.push([180, right[i][1]]);
				} else {
					eastRight.push(right[i]);
					eastLeft.push([180, right[i][1]]);
				}
			}

			// 西側ポリゴン: 左辺 → -180境界を逆順 → 閉じる
			if (westLeft.length >= 2) {
				const ring: [number, number][] = [...westLeft, ...[...westRight].reverse(), westLeft[0]];
				polygons.push([ring]);
			}
			// 東側ポリゴン: +180境界 → 右辺を逆順 → 閉じる
			if (eastRight.length >= 2) {
				const ring: [number, number][] = [...eastLeft, ...[...eastRight].reverse(), eastLeft[0]];
				polygons.push([ring]);
			}
		} else {
			// 日付変更線をまたがない通常のセグメント
			const segLeft: [number, number][] = [];
			const segRight: [number, number][] = [];

			// 境界での補間点
			if (start > 0) {
				if (crossesAntimeridian(left[start - 1][0], left[start][0])) {
					segLeft.push(interpolateAtAntimeridian(left[start], left[start - 1]));
				}
				if (crossesAntimeridian(right[start - 1][0], right[start][0])) {
					segRight.push(interpolateAtAntimeridian(right[start], right[start - 1]));
				}
			}

			for (let i = start; i < end; i++) {
				segLeft.push(left[i]);
				segRight.push(right[i]);
			}

			if (end < left.length) {
				if (crossesAntimeridian(left[end - 1][0], left[end][0])) {
					segLeft.push(interpolateAtAntimeridian(left[end - 1], left[end]));
				}
				if (crossesAntimeridian(right[end - 1][0], right[end][0])) {
					segRight.push(interpolateAtAntimeridian(right[end - 1], right[end]));
				}
			}

			if (segLeft.length > 0 && segRight.length > 0) {
				const ring: [number, number][] = [...segLeft, ...[...segRight].reverse(), segLeft[0]];
				polygons.push([ring]);
			}
		}
	}

	return polygons;
};

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

	// 日付変更線で分割してポリゴンを生成
	const polygons = buildSwathPolygons(left, right);

	if (polygons.length === 1) {
		return {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					geometry: { type: 'Polygon', coordinates: polygons[0] },
					properties: { type: 'swath', num_scanlines: rows, num_pixels: cols }
				}
			]
		};
	}

	return {
		type: 'FeatureCollection',
		features: polygons.map((ring) => ({
			type: 'Feature' as const,
			geometry: { type: 'Polygon' as const, coordinates: ring },
			properties: { type: 'swath', num_scanlines: rows, num_pixels: cols }
		}))
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

	const coords: [number, number][] = latitude.map((lat, i) => [longitude[i], lat]);
	return buildOrbitTrackFeatures(coords);
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

	const coords: [number, number][] = latitude.map((lat, i) => [longitude[i], lat]);
	return buildOrbitTrackFeatures(coords);
};
