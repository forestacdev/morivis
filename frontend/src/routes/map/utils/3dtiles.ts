import type { LngLatBoundsLike } from 'maplibre-gl';

// ECEF座標を緯度経度に変換
const ecefToLngLat = (x: number, y: number, z: number): [number, number, number] => {
	const a = 6378137.0; // WGS84の赤道半径
	const e2 = 0.00669437999014; // 第一離心率の2乗

	const lon = Math.atan2(y, x);
	const p = Math.sqrt(x * x + y * y);
	let lat = Math.atan2(z, p * (1 - e2));

	// 反復計算で緯度を精密化
	for (let i = 0; i < 5; i++) {
		const sinLat = Math.sin(lat);
		const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
		const h = p / Math.cos(lat) - N;
		lat = Math.atan2(z, p * (1 - (e2 * N) / (N + h)));
	}

	return [
		(lon * 180) / Math.PI,
		(lat * 180) / Math.PI,
		Math.sqrt(x * x + y * y + z * z) - a
	];
};

/**
 * boundingVolume.box + transform からLngLatBoundsを計算
 */
const boxToBbox = (
	box: number[],
	transform?: number[]
): [number, number, number, number] => {
	// box: [cx, cy, cz, xx, xy, xz, yx, yy, yz, zx, zy, zz]
	const cx = box[0],
		cy = box[1],
		cz = box[2];
	const halfX = Math.sqrt(box[3] ** 2 + box[4] ** 2 + box[5] ** 2);
	const halfY = Math.sqrt(box[6] ** 2 + box[7] ** 2 + box[8] ** 2);
	const halfZ = Math.sqrt(box[9] ** 2 + box[10] ** 2 + box[11] ** 2);

	// ローカル空間の8角
	const localCorners = [
		[cx - halfX, cy - halfY, cz - halfZ],
		[cx + halfX, cy - halfY, cz - halfZ],
		[cx - halfX, cy + halfY, cz - halfZ],
		[cx + halfX, cy + halfY, cz - halfZ],
		[cx - halfX, cy - halfY, cz + halfZ],
		[cx + halfX, cy - halfY, cz + halfZ],
		[cx - halfX, cy + halfY, cz + halfZ],
		[cx + halfX, cy + halfY, cz + halfZ]
	];

	// transform行列がある場合はECEFに変換
	const ecefCorners = transform
		? localCorners.map(([lx, ly, lz]) => [
				transform[0] * lx + transform[4] * ly + transform[8] * lz + transform[12],
				transform[1] * lx + transform[5] * ly + transform[9] * lz + transform[13],
				transform[2] * lx + transform[6] * ly + transform[10] * lz + transform[14]
			])
		: localCorners;

	const lngLats = ecefCorners.map(([x, y, z]) => ecefToLngLat(x, y, z));
	const lngs = lngLats.map(([lng]) => lng);
	const lats = lngLats.map(([, lat]) => lat);

	return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
};

/**
 * boundingVolume.region からbboxを計算
 * region: [west, south, east, north, minHeight, maxHeight] (ラジアン)
 */
const regionToBbox = (region: number[]): [number, number, number, number] => {
	const toDeg = (rad: number) => (rad * 180) / Math.PI;
	return [toDeg(region[0]), toDeg(region[1]), toDeg(region[2]), toDeg(region[3])];
};

/**
 * boundingVolume.sphere + transform からbboxを計算
 */
const sphereToBbox = (
	sphere: number[],
	transform?: number[]
): [number, number, number, number] => {
	const [cx, cy, cz, radius] = sphere;

	// 中心をECEFに変換
	let ecefX = cx,
		ecefY = cy,
		ecefZ = cz;
	if (transform) {
		ecefX = transform[0] * cx + transform[4] * cy + transform[8] * cz + transform[12];
		ecefY = transform[1] * cx + transform[5] * cy + transform[9] * cz + transform[13];
		ecefZ = transform[2] * cx + transform[6] * cy + transform[10] * cz + transform[14];
	}

	// 半径分オフセットした角を生成
	const corners = [
		[ecefX - radius, ecefY - radius, ecefZ],
		[ecefX + radius, ecefY + radius, ecefZ]
	];

	const lngLats = corners.map(([x, y, z]) => ecefToLngLat(x, y, z));
	return [lngLats[0][0], lngLats[0][1], lngLats[1][0], lngLats[1][1]];
};

/**
 * tileset.jsonのrootからbboxを計算する
 */
const rootToBbox = (root: {
	boundingVolume: { box?: number[]; region?: number[]; sphere?: number[] };
	transform?: number[];
}): [number, number, number, number] | null => {
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

/**
 * tileset.json URLからbboxを取得する
 * @param url tileset.jsonのURL
 * @returns [minLng, minLat, maxLng, maxLat] または null
 */
export const fetchTileset3DBbox = async (
	url: string
): Promise<[number, number, number, number] | null> => {
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const tileset = await res.json();

		if (!tileset.root?.boundingVolume) return null;

		return rootToBbox(tileset.root);
	} catch (e) {
		console.error('tileset.json の読み込みに失敗しました:', e);
		return null;
	}
};

/**
 * tileset.jsonからLngLatBoundsを計算する（レガシー互換）
 */
export const tiles3DToLngLatBounds = (tileset: {
	root: {
		boundingVolume: { box?: number[]; region?: number[]; sphere?: number[] };
		transform?: number[];
	};
}): LngLatBoundsLike | null => {
	const bbox = rootToBbox(tileset.root);
	if (!bbox) return null;
	return [
		[bbox[0], bbox[1]],
		[bbox[2], bbox[3]]
	];
};
