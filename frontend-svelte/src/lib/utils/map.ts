import tilebelt from '@mapbox/tilebelt';
import type {
	Map,
	StyleSpecification,
	SourceSpecification,
	LayerSpecification,
	TerrainSpecification,
	Marker,
	CircleLayerSpecification
} from 'maplibre-gl';

type BBOX = [number, number, number, number];
type RGBA = [number, number, number, number];

const getPixelColor = (lng: number, lat: number, bbox: BBOX, url: string): Promise<RGBA> => {
	// クリックした座標がらタイル画像のピクセル座標を計算
	const [lngMin, latMin, lngMax, latMax] = bbox;
	const x = ((lng - lngMin) / (lngMax - lngMin)) * 256;
	const y = ((latMax - lat) / (latMax - latMin)) * 256;

	// タイル画像を読み込み、ピクセル座標の色を返す
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = url;
		img.onload = () => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			canvas.width = img.width;
			canvas.height = img.height;
			ctx?.drawImage(img, 0, 0);
			const pixel = ctx?.getImageData(x, y, 1, 1).data;
			if (!pixel) return;
			const [r, g, b, a] = [...pixel];
			resolve([r, g, b, a / 255]);
		};
	});
};

/* タイルURLを取得 */
export const getTileUrl = (lng: number, lat: number, zoom: number, tileUrl: string): string => {
	const tile = tilebelt.pointToTile(lng, lat, zoom);

	return tileUrl
		.replace('{z}', tile[2].toString())
		.replace('{x}', tile[0].toString())
		.replace('{y}', tile[1].toString());
};

/* 経緯度からピクセル座標を取得 */
export const getTilePixelColor = async (
	lng: number,
	lat: number,
	zoom: number,
	tileUrl: string
) => {
	// asyncを追加
	// ズームレベルを取得
	const bbox = tilebelt.tileToBBOX(tilebelt.pointToTile(lng, lat, zoom));

	const url = getTileUrl(lng, lat, zoom, tileUrl);

	// クリックしたタイルの色を取得
	const [r, g, b, a] = await getPixelColor(lng, lat, bbox, url);

	// 透明色の場合は処理を終了
	if (a === 0) return;

	return [r, g, b, a];
	// 省略
};

// 地球の赤道周長 (メートル)
const EARTH_CIRCUMFERENCE = 40075016.686; // 約40,075km

// タイルのサイズ (ピクセル数)
const TILE_SIZE = 256;

// 与えられたズームレベルでの1ピクセルあたりの地上距離を計算する関数
function distancePerPixel(zoomLevel) {
	// ズームレベルに基づいて、1ピクセルあたりのメートル数を計算
	return EARTH_CIRCUMFERENCE / Math.pow(2, zoomLevel) / TILE_SIZE;
}

// ズームレベルを指定して、1ピクセルあたりの高さスケールを計算
const zoomLevel = 14; // 任意のズームレベル
const pixelDistance = distancePerPixel(zoomLevel);
console.log(
	`Zoom level ${zoomLevel} の1ピクセルあたりの地上距離は約 ${pixelDistance} メートルです。`
);

// タイル内の高さデータをスケーリングする
function scaleHeightToZoomLevel(heightValue, zoomLevel) {
	const pixelDistance = distancePerPixel(zoomLevel);

	// 高さのスケールは通常標高タイルのデータ（例えばcm単位など）に依存するので、
	// 必要に応じて適切なスケールファクターを適用する
	const scaleFactor = 1; // 適切なスケールを設定
	return heightValue * scaleFactor * pixelDistance;
}

/* style.jsonを取得 */
export const getFieldDictJson = async (url: string): Promise<{ [key: string]: string }> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}`);
	}
	return await response.json();
};
