import { fetchWithDevProxy } from '$routes/map/utils/platform/request';
import type { LngLatBoundsLike } from 'maplibre-gl';

type Tiles3DBoundingVolume = { box?: number[]; region?: number[]; sphere?: number[]; };

interface Tiles3DRoot {
	boundingVolume: Tiles3DBoundingVolume;
	transform?: number[];
}

// ECEF座標を緯度経度に変換
const ecefToLngLat = (x: number, y: number, z: number): [number, number, number] => {
	const a = 6378137.0;
	const e2 = 0.00669437999014;

	const lon = Math.atan2(y, x);
	const p = Math.sqrt(x * x + y * y);
	let lat = Math.atan2(z, p * (1 - e2));

	for (let i = 0; i < 5; i++) {
		const sinLat = Math.sin(lat);
		const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
		const h = p / Math.cos(lat) - N;
		lat = Math.atan2(z, p * (1 - (e2 * N) / (N + h)));
	}

	return [(lon * 180) / Math.PI, (lat * 180) / Math.PI, Math.sqrt(x * x + y * y + z * z) - a];
};

const transformPoint = (
	transform: number[] | undefined,
	[x, y, z]: [number, number, number]
): [number, number, number] => {
	if (!transform) return [x, y, z];

	return [
		transform[0] * x + transform[4] * y + transform[8] * z + transform[12],
		transform[1] * x + transform[5] * y + transform[9] * z + transform[13],
		transform[2] * x + transform[6] * y + transform[10] * z + transform[14]
	];
};

/** boundingVolume.box + transform からLngLatBoundsを計算 */
const boxToBbox = (box: number[], transform?: number[]): [number, number, number, number] => {
	const center: [number, number, number] = [box[0], box[1], box[2]];
	const axisX: [number, number, number] = [box[3], box[4], box[5]];
	const axisY: [number, number, number] = [box[6], box[7], box[8]];
	const axisZ: [number, number, number] = [box[9], box[10], box[11]];

	// 3D Tiles の box は center + 3本の half-axis ベクトルで定義される。
	// ベクトル長だけに潰すと、回転済みボックスで bbox が大きく崩れる。
	const ecefCorners: [number, number, number][] = [];
	for (const signX of [-1, 1] as const) {
		for (const signY of [-1, 1] as const) {
			for (const signZ of [-1, 1] as const) {
				ecefCorners.push(
					transformPoint(transform, [
						center[0] + signX * axisX[0] + signY * axisY[0] + signZ * axisZ[0],
						center[1] + signX * axisX[1] + signY * axisY[1] + signZ * axisZ[1],
						center[2] + signX * axisX[2] + signY * axisY[2] + signZ * axisZ[2]
					])
				);
			}
		}
	}

	const lngLats = ecefCorners.map(([x, y, z]) => ecefToLngLat(x, y, z));
	const lngs = lngLats.map(([lng]) => lng);
	const lats = lngLats.map(([, lat]) => lat);

	return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
};

/** boundingVolume.region からbboxを計算 */
const regionToBbox = (region: number[]): [number, number, number, number] => {
	const toDeg = (rad: number) => (rad * 180) / Math.PI;
	return [toDeg(region[0]), toDeg(region[1]), toDeg(region[2]), toDeg(region[3])];
};

/** boundingVolume.sphere + transform からbboxを計算 */
const sphereToBbox = (sphere: number[], transform?: number[]): [number, number, number, number] => {
	const [cx, cy, cz, radius] = sphere;
	const [ecefX, ecefY, ecefZ] = transformPoint(transform, [cx, cy, cz]);

	const corners = [
		[ecefX - radius, ecefY - radius, ecefZ],
		[ecefX + radius, ecefY + radius, ecefZ]
	];

	const lngLats = corners.map(([x, y, z]) => ecefToLngLat(x, y, z));
	return [lngLats[0][0], lngLats[0][1], lngLats[1][0], lngLats[1][1]];
};

/** tileset.jsonのrootからbboxを計算する */
const rootToBbox = (root: Tiles3DRoot): [number, number, number, number] | null => {
	const bv = root.boundingVolume;

	if (bv.region) {
		return regionToBbox(bv.region);
	}
	if (bv.box) {
		return boxToBbox(bv.box, root.transform);
	}
	if (bv.sphere) {
		return sphereToBbox(bv.sphere, root.transform);
	}

	return null;
};

export interface FetchTileset3DBboxResult {
	bbox: [number, number, number, number] | null;
	error: string | null;
}

const toFetchTileset3DErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		if (error.message.startsWith('HTTP ')) {
			return `tileset.json の取得に失敗しました (${error.message})`;
		}
		if (error.message === 'Failed to fetch') {
			return 'tileset.json の取得に失敗しました。CORS またはネットワーク設定を確認してください';
		}
		return `tileset.json の取得に失敗しました (${error.message})`;
	}

	return 'tileset.json の取得に失敗しました';
};

/**
 * tileset.json URLからbboxを取得する
 * @param url tileset.jsonのURL
 * @returns bbox と失敗理由
 */
export const fetchTileset3DBbox = async (
	url: string
): Promise<FetchTileset3DBboxResult> => {
	try {
		const res = await fetchWithDevProxy(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const tileset = await res.json();

		if (!tileset.root?.boundingVolume) {
			return {
				bbox: null,
				error: 'tileset.json に root.boundingVolume がありません'
			};
		}

		const bbox = rootToBbox(tileset.root);
		if (!bbox) {
			return {
				bbox: null,
				error: 'tileset.json の boundingVolume から bbox を計算できませんでした'
			};
		}

		return { bbox, error: null };
	} catch (e) {
		console.error('tileset.json の読み込みに失敗しました:', e);
		return {
			bbox: null,
			error: toFetchTileset3DErrorMessage(e)
		};
	}
};

/** tileset.jsonからLngLatBoundsを計算する（レガシー互換） */
export const tiles3DToLngLatBounds = (tileset: { root: Tiles3DRoot; }): LngLatBoundsLike | null => {
	const bbox = rootToBbox(tileset.root);
	if (!bbox) return null;
	return [
		[bbox[0], bbox[1]],
		[bbox[2], bbox[3]]
	];
};
