import type { Map } from 'maplibre-gl';

/**
 * 経緯度をWeb メルカトル座標(メートル)に変換
 */
const lngLatToWebMercator = (lng: number, lat: number): { x: number; y: number } => {
	const EARTH_RADIUS = 6378137;

	const x = ((lng * Math.PI) / 180) * EARTH_RADIUS;
	const y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * EARTH_RADIUS;

	return { x, y };
};

/**
 * MapLibreの現在のbboxからワールドファイルのパラメータを生成（回転考慮）
 */
export const generateWorldFile = (
	map: Map,
	imageWidth: number,
	imageHeight: number,
	epsg: number = 4326
): string => {
	// 四隅の座標を取得
	const canvas = map.getCanvas();
	const topLeft = map.unproject([0, 0]);
	const topRight = map.unproject([canvas.width, 0]);
	const bottomLeft = map.unproject([0, canvas.height]);

	let x1: number, y1: number, x2: number, y2: number, x3: number, y3: number;

	if (epsg === 3857) {
		const tl = lngLatToWebMercator(topLeft.lng, topLeft.lat);
		const tr = lngLatToWebMercator(topRight.lng, topRight.lat);
		const bl = lngLatToWebMercator(bottomLeft.lng, bottomLeft.lat);

		x1 = tl.x;
		y1 = tl.y;
		x2 = tr.x;
		y2 = tr.y;
		x3 = bl.x;
		y3 = bl.y;
	} else {
		x1 = topLeft.lng;
		y1 = topLeft.lat;
		x2 = topRight.lng;
		y2 = topRight.lat;
		x3 = bottomLeft.lng;
		y3 = bottomLeft.lat;
	}

	// ワールドファイルのパラメータを計算
	// A, D: X方向の変換（1ピクセル右に移動したときの座標変化）
	const A = (x2 - x1) / imageWidth;
	const D = (y2 - y1) / imageWidth;

	// B, E: Y方向の変換（1ピクセル下に移動したときの座標変化）
	const B = (x3 - x1) / imageHeight;
	const E = (y3 - y1) / imageHeight;

	// C, F: 左上ピクセル中心の座標
	const C = x1 + A * 0.5 + B * 0.5;
	const F = y1 + D * 0.5 + E * 0.5;

	// ワールドファイルの形式(6行)
	return [
		A.toFixed(10), // Line 1: X方向のピクセルサイズ
		D.toFixed(10), // Line 2: Y軸方向の回転
		B.toFixed(10), // Line 3: X軸方向の回転
		E.toFixed(10), // Line 4: Y方向のピクセルサイズ
		C.toFixed(10), // Line 5: 左上ピクセル中心のX座標
		F.toFixed(10) // Line 6: 左上ピクセル中心のY座標
	].join('\n');
};

/**
 * ワールドファイルをダウンロード
 */
export const downloadWorldFile = (
	map: Map,
	imageWidth: number,
	imageHeight: number,
	filename: string = 'map.pgw',
	epsg: number = 4326
) => {
	const worldFileContent = generateWorldFile(map, imageWidth, imageHeight, epsg);

	const blob = new Blob([worldFileContent], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};
