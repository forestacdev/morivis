import tilebelt from '@mapbox/tilebelt';

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
// 経緯度からピクセル座標を取得
export const getTilePixelColor = async (
	lng: number,
	lat: number,
	zoom: number,
	tileUrl: string
) => {
	// asyncを追加
	// ズームレベルを取得

	const tile = tilebelt.pointToTile(lng, lat, zoom);
	const bbox = tilebelt.tileToBBOX(tile);

	// 地図タイルのURLを取得
	const url = tileUrl
		.replace('{z}', tile[2].toString())
		.replace('{x}', tile[0].toString())
		.replace('{y}', tile[1].toString());

	// クリックしたタイルの色を取得
	const [r, g, b, a] = await getPixelColor(lng, lat, bbox, url);

	// 透明色の場合は処理を終了
	if (a === 0) return;

	return [r, g, b, a];
	// 省略
};
