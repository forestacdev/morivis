import type { LngLatBoundsLike } from 'maplibre-gl';

// ECEF座標を緯度経度に変換
function ecefToLngLat(x: number, y: number, z: number): [number, number, number] {
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
		(lon * 180) / Math.PI, // 経度
		(lat * 180) / Math.PI, // 緯度
		Math.sqrt(x * x + y * y + z * z) - a // 高度（概算）
	];
}

function tiles3DToLngLatBounds(tileset: any): LngLatBoundsLike {
	const root = tileset.root;
	const box = root.boundingVolume.box;
	const transform = root.transform;

	// transform行列から中心座標を取得（最後の列）
	const centerX = transform[12];
	const centerY = transform[13];
	const centerZ = transform[14];

	// ボックスの半分のサイズ（メートル単位）
	const halfX = box[3];
	const halfY = box[7];

	// 8つの角の座標を計算してECEFに変換
	const corners = [
		[centerX - halfX, centerY - halfY, centerZ],
		[centerX + halfX, centerY - halfY, centerZ],
		[centerX - halfX, centerY + halfY, centerZ],
		[centerX + halfX, centerY + halfY, centerZ]
	];

	// 各角を緯度経度に変換
	const lngLats = corners.map(([x, y, z]) => ecefToLngLat(x, y, z));

	const lngs = lngLats.map(([lng]) => lng);
	const lats = lngLats.map(([, lat]) => lat);

	return [
		[Math.min(...lngs), Math.min(...lats)], // southwest
		[Math.max(...lngs), Math.max(...lats)] // northeast
	];
}
