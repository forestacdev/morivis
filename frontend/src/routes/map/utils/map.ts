// 標高の取得
// export const getElevation = async (lngLat: LngLat, zoom: number) => {
// 	const zoomLevel = Math.min(Math.round(zoom), 14);
// 	const rgba = await getTilePixelColor(
// 		lngLat.lng,
// 		lngLat.lat,
// 		zoomLevel,
// 		'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
// 	);

// 	if (!rgba) return;

// 	// RGB値を取得
// 	const r = rgba[0];
// 	const g = rgba[1];
// 	const b = rgba[2];

// 	// 高さを計算
// 	const rgb = r * 65536.0 + g * 256.0 + b;
// 	let h = 0.0;
// 	if (rgb < 8388608.0) {
// 		h = rgb * 0.01;
// 	} else if (rgb > 8388608.0) {
// 		h = (rgb - 16777216.0) * 0.01;
// 	}

// 	return h;

// 	// const tileurl = getTileUrl(
// 	// 	lngLat.lng,
// 	// 	lngLat.lat,
// 	// 	14,
// 	// 	'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
// 	// );
// 	// targetDemData = tileurl;
// };

// 地球の赤道周長 (メートル)
const EARTH_CIRCUMFERENCE = 40075016.686; // 約40,075km

// タイルのサイズ (ピクセル数)
const TILE_SIZE = 256;

// 与えられたズームレベルでの1ピクセルあたりの地上距離を計算する関数
const distancePerPixel = (zoomLevel) => {
	// ズームレベルに基づいて、1ピクセルあたりのメートル数を計算
	return EARTH_CIRCUMFERENCE / Math.pow(2, zoomLevel) / TILE_SIZE;
};

// ズームレベルを指定して、1ピクセルあたりの高さスケールを計算
const zoomLevel = 14; // 任意のズームレベル
const pixelDistance = distancePerPixel(zoomLevel);

// タイル内の高さデータをスケーリングする
const scaleHeightToZoomLevel = (heightValue, zoomLevel) => {
	const pixelDistance = distancePerPixel(zoomLevel);

	// 高さのスケールは通常標高タイルのデータ（例えばcm単位など）に依存するので、
	// 必要に応じて適切なスケールファクターを適用する
	const scaleFactor = 1; // 適切なスケールを設定
	return heightValue * scaleFactor * pixelDistance;
};

/* style.jsonを取得 */
export const getFieldDictJson = async (url: string): Promise<{ [key: string]: string }> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}`);
	}
	return await response.json();
};
