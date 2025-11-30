import type { Map } from 'maplibre-gl';
import { LngLat } from 'maplibre-gl';

/**
 * 経緯度をWeb メルカトル座標(メートル)に変換
 */
const lngLatToWebMercator = (lng: number, lat: number): { x: number; y: number } => {
	const EARTH_RADIUS = 6378137; // WGS84楕円体の赤道半径(メートル)

	const x = ((lng * Math.PI) / 180) * EARTH_RADIUS;
	const y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * EARTH_RADIUS;

	return { x, y };
};

/**
 * MapLibreの現在のbboxからワールドファイルのパラメータを生成
 * @param map MapLibreのMapインスタンス
 * @param imageWidth 出力画像の幅(px)
 * @param imageHeight 出力画像の高さ(px)
 * @param epsg 座標系（4326 or 3857）
 * @returns ワールドファイルの6行のパラメータ
 */
export const generateWorldFile = (
	map: Map,
	imageWidth: number,
	imageHeight: number,
	epsg: number = 4326
): string => {
	const bounds = map.getBounds();

	let west: number, south: number, east: number, north: number;

	if (epsg === 3857) {
		// Web メルカトル座標系の場合
		// 経緯度をメートル単位に変換
		const sw = lngLatToWebMercator(bounds.getWest(), bounds.getSouth());
		const ne = lngLatToWebMercator(bounds.getEast(), bounds.getNorth());

		west = sw.x;
		south = sw.y;
		east = ne.x;
		north = ne.y;
	} else {
		// WGS84 地理座標系の場合（デフォルト）
		west = bounds.getWest();
		south = bounds.getSouth();
		east = bounds.getEast();
		north = bounds.getNorth();
	}

	// X方向のピクセルサイズ
	const pixelSizeX = (east - west) / imageWidth;

	// Y方向のピクセルサイズ（負の値）
	const pixelSizeY = -(north - south) / imageHeight;

	// 回転パラメータ(通常は0)
	const rotationX = 0;
	const rotationY = 0;

	// 左上ピクセルの中心座標
	const upperLeftX = west + pixelSizeX / 2;
	const upperLeftY = north + pixelSizeY / 2;

	// ワールドファイルの形式(6行)
	return [
		pixelSizeX.toFixed(10), // Line 1: X方向のピクセルサイズ
		rotationX.toFixed(10), // Line 2: Y軸方向の回転
		rotationY.toFixed(10), // Line 3: X軸方向の回転
		pixelSizeY.toFixed(10), // Line 4: Y方向のピクセルサイズ(負)
		upperLeftX.toFixed(10), // Line 5: 左上ピクセル中心のX座標
		upperLeftY.toFixed(10) // Line 6: 左上ピクセル中心のY座標
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
