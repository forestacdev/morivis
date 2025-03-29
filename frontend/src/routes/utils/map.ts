import type { LngLat } from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import html2canvas from 'html2canvas';

/**
 * Check if a point is inside a bounding box.
 * @param point - The point as maplibregl.LngLat.
 * @param bbox - The bounding box as [minLng, minLat, maxLng, maxLat].
 * @returns true if the point is inside the bbox, false otherwise.
 */
export const isPointInBbox = (point: LngLat, bbox: [number, number, number, number]): boolean => {
	const [minLng, minLat, maxLng, maxLat] = bbox;

	const lng = point.lng;
	const lat = point.lat;

	return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
};

/**
 * Export the map as an image with a scale bar and compass.
 * @param map
 */
export const imageExport = (map: MaplibreMap) => {
	map.once('render', async () => {
		const mapCanvas = map.getCanvas();
		const mapImage = mapCanvas.toDataURL('image/png');
		const image = new Image();

		image.onload = async () => {
			// スケールバーの要素を取得
			const scaleDiv = document.querySelector('.maplibregl-ctrl-scale') as HTMLElement;

			try {
				const finalCanvas = document.createElement('canvas');
				finalCanvas.width = mapCanvas.width;
				finalCanvas.height = mapCanvas.height;
				const ctx = finalCanvas.getContext('2d') as CanvasRenderingContext2D;

				// 地図の画像を描画
				ctx.drawImage(image, 0, 0);

				// スケールバーの画像をキャプチャ
				const scaleCanvas = await html2canvas(scaleDiv);

				// スケールバーの画像を左下に描画
				const scaleWidth = scaleCanvas.width;
				const scaleHeight = scaleCanvas.height;
				const scaleMargin = 10; // スケールバーの余白

				// 透過度を設定
				ctx.globalAlpha = 0.7;

				ctx.drawImage(
					scaleCanvas,
					scaleMargin,
					finalCanvas.height - scaleHeight - scaleMargin,
					scaleWidth,
					scaleHeight
				);

				// 方位の画像を取得
				const connpassImageElement = await new Promise<HTMLImageElement>((resolve) => {
					const image = new Image();
					image.onload = () => resolve(image);
					image.src = './images/map_connpass.png';
				});

				// 余白
				const connpassMargin = 20;

				// コンパス画像のサイズ
				const connpassWidth = connpassImageElement.width;
				const connpassHeight = connpassImageElement.height;

				// 回転の中心を指定（例: 画像の中央）
				const centerX = finalCanvas.width - connpassWidth / 2 - connpassMargin;
				const centerY = connpassMargin + connpassHeight / 2;

				// キャンバスの状態を保存
				ctx.save();

				// 透過度を設定
				ctx.globalAlpha = 0.7;

				// 回転
				const bearing360 = (Number(map.getBearing().toFixed(1)) + 360) % 360;
				ctx.translate(centerX, centerY);
				const angleInRadians = (bearing360 * Math.PI) / -180;
				ctx.rotate(angleInRadians);

				// 画像を描画（回転の中心に戻して描画するため、位置を調整）
				ctx.drawImage(
					connpassImageElement,
					-connpassWidth / 2,
					-connpassHeight / 2,
					connpassWidth,
					connpassHeight
				);

				// キャンバスの状態を復元
				ctx.restore();

				// 地図画像をダウンロード
				const link = document.createElement('a');
				link.href = finalCanvas.toDataURL('image/png');

				// 現在の日時を取得してフォーマット（YYYYMMDDhhmmss）
				const now = new Date();
				const formattedDate =
					now.getFullYear() +
					String(now.getMonth() + 1).padStart(2, '0') +
					String(now.getDate()).padStart(2, '0') +
					String(now.getHours()).padStart(2, '0') +
					String(now.getMinutes()).padStart(2, '0') +
					String(now.getSeconds()).padStart(2, '0');

				link.download = formattedDate + '.png';
				link.click();
			} catch (error) {
				console.error('エクスポートエラー:', error);
			} finally {
				console.log('エクスポート完了');
			}
		};

		image.src = mapImage;
	});

	map.triggerRepaint();
};

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

/** bbox */
