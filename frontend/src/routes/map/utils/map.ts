import type { LngLat, LngLatBoundsLike, Coordinates } from 'maplibre-gl';
import type { Map as MaplibreMap } from 'maplibre-gl';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import {
	WEB_MERCATOR_MIN_LAT,
	WEB_MERCATOR_MAX_LAT,
	WEB_MERCATOR_MIN_LNG,
	WEB_MERCATOR_MAX_LNG
} from '$routes/map/data/location_bbox';
import { map } from 'es-toolkit/compat';

type BBox = [number, number, number, number];

/**
 * Check if a point is inside a bounding box.
 * @param point - The point as maplibregl.LngLat.
 * @param bbox - The bounding box as [minLng, minLat, maxLng, maxLat].
 * @returns true if the point is inside the bbox, false otherwise.
 */
export const isPointInBbox = (point: LngLat, bbox: BBox): boolean => {
	const [minLng, minLat, maxLng, maxLat] = bbox;

	const lng = point.lng;
	const lat = point.lat;

	return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
};

/** bbox同士が重なっているか */
export const isBBoxOverlapping = (bbox1: BBox, bbox2: BBox): boolean => {
	const [minX1, minY1, maxX1, maxY1] = bbox1;
	const [minX2, minY2, maxX2, maxY2] = bbox2;
	return minX1 < maxX2 && maxX1 > minX2 && minY1 < maxY2 && maxY1 > minY2;
};

/** bbox同士が完全に重なっているか */
export const isBBoxInside = (inner: BBox, outer: BBox): boolean => {
	const [minX1, minY1, maxX1, maxY1] = inner;
	const [minX2, minY2, maxX2, maxY2] = outer;

	return minX1 >= minX2 && maxX1 <= maxX2 && minY1 >= minY2 && maxY1 <= maxY2;
};

/**
 * Check if a bounding box is valid.
 * @param bbox - The bounding box as [minLng, minLat, maxLng, maxLat].
 * @returns true if the bbox is valid, false otherwise.
 */
export const isBboxValid = (bbox: [number, number, number, number]): boolean => {
	const [minLng, minLat, maxLng, maxLat] = bbox;

	// 緯度が制限範囲内にあるかチェック
	const isLatitudeValid = (lat: number): boolean => {
		return lat >= WEB_MERCATOR_MIN_LAT && lat <= WEB_MERCATOR_MAX_LAT;
	};

	// 経度が制限範囲内にあるかチェック（-180 ~ 180の範囲）
	const isLongitudeValid = (lng: number): boolean => {
		return lng >= -180 && lng <= 180;
	};

	// すべての境界が有効範囲内にあるかチェック
	const minLatValid = isLatitudeValid(minLat);
	const maxLatValid = isLatitudeValid(maxLat);
	const minLngValid = isLongitudeValid(minLng);
	const maxLngValid = isLongitudeValid(maxLng);

	// bbox内で最小値が最大値より小さいかチェック
	const latOrderValid = minLat <= maxLat;
	const lngOrderValid = minLng <= maxLng;

	// NaNや無限大でないかチェック
	const isFiniteNumber = (num: number): boolean => {
		return isFinite(num) && !isNaN(num);
	};

	const allFinite = [minLng, minLat, maxLng, maxLat].every(isFiniteNumber);

	return (
		minLatValid &&
		maxLatValid &&
		minLngValid &&
		maxLngValid &&
		latOrderValid &&
		lngOrderValid &&
		allFinite
	);
};

/**
 * [minLon, minLat, maxLon, maxLat] の形式のバウンディングボックスから、
 * その4隅の座標ペアの配列 [[minLon, minLat], [maxLon, maxLat], [maxLon, minLat], [minLon, minLat]] を生成。
 * @param bbox - [最小経度, 最小緯度, 最大経度, 最大緯度] の形式の配列 (バウンディングボックス)
 * @returns バウンディングボックスの4隅の座標ペアの配列
 */
export const getBoundingBoxCorners = (bbox: BBox): Coordinates => {
	if (bbox.length !== 4) {
		throw new Error('Input array must contain exactly 4 numbers (minLon, minLat, maxLon, maxLat).');
	}

	const minLon = bbox[0];
	const minLat = bbox[1];
	const maxLon = bbox[2];
	const maxLat = bbox[3];

	// 4隅の座標を生成 (例: 左上, 右上, 右下, 左下の順)
	const corners: Coordinates = [
		[minLon, maxLat], // 左上
		[maxLon, maxLat], // 右上
		[maxLon, minLat], // 右下
		[minLon, minLat] // 左下
	];

	return corners;
};

/**
 * Detect the longitude domain based on the first and last longitude values.
 *
 * https://github.com/cf-convention/cf-conventions/issues/435?utm_source=chatgpt.com
 *
 * @param first - The first longitude value.
 * @param last - The last longitude value.
 * @returns '180' if both values are in the range [0, 180], '360' if both are in [0, 360], or 'indeterminate' otherwise.
 */
export const detectLongitudeDomain = (
	first: number,
	last: number
): '180' | '360' | 'indeterminate' => {
	if (first < 0 || last < 0) return '180';
	if (first > 180 || last > 180) return '360';
	return 'indeterminate'; // 両方 0〜180 の場合
};

/**
 * Export the map as an image with a scale bar and compass.
 * @param map
 * @returns Promise<void> 処理が完了したら解決し、エラーがあれば拒否されるPromise
 */
export const imageExport = (map: MaplibreMap): Promise<void> => {
	return new Promise((resolve, reject) => {
		// Promiseを返すようにラップ
		map.once('render', async () => {
			try {
				const mapCanvas = map.getCanvas();
				const mapImage = mapCanvas.toDataURL('image/png');
				const image = new Image();

				// 地図画像のロードが完了したら次の処理へ
				image.onload = async () => {
					try {
						const scaleDiv = document.querySelector('.maplibregl-ctrl-scale') as HTMLElement;
						if (!scaleDiv) {
							throw new Error('スケールバー要素が見つかりません。');
						}

						const finalCanvas = document.createElement('canvas');
						finalCanvas.width = mapCanvas.width;
						finalCanvas.height = mapCanvas.height;
						const ctx = finalCanvas.getContext('2d') as CanvasRenderingContext2D;

						// 地図の画像を描画
						ctx.drawImage(image, 0, 0);

						// スケールバーの画像をキャプチャ
						// html2canvasはPromiseを返すのでawaitで待機
						const scaleCanvas = await html2canvas(scaleDiv);

						// スケールバーの画像を左下に描画
						const scaleWidth = scaleCanvas.width;
						const scaleHeight = scaleCanvas.height;
						const scaleMargin = 10;

						// 透過度を設定
						ctx.globalAlpha = 0.7;
						ctx.drawImage(
							scaleCanvas,
							scaleMargin,
							finalCanvas.height - scaleHeight - scaleMargin,
							scaleWidth,
							scaleHeight
						);
						ctx.globalAlpha = 1.0; // 透過度をリセット

						// 方位の画像を取得
						const connpassImageElement = await new Promise<HTMLImageElement>(
							(imgResolve, imgReject) => {
								const img = new Image();
								img.onload = () => imgResolve(img);
								img.onerror = (e) => {
									if (e instanceof Error)
										imgReject(new Error(`方位画像のロードに失敗しました: ${e.message || e}`));
								};

								img.src = './images/map_connpass.png'; // 画像パスを確認
							}
						);

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
						ctx.globalAlpha = 1.0; // 透過度をリセット

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

						// 全ての処理が成功したらPromiseを解決
						console.log('エクスポート完了');
						resolve();
					} catch (innerError) {
						// 内部のエラーが発生した場合
						console.error('エクスポート処理中のエラー:', innerError);
						reject(innerError); // Promiseを拒否
					}
				};
				// mapImageのロードエラーハンドリング
				image.onerror = (e) => {
					if (e instanceof Error) {
						reject(new Error(`地図画像のロードに失敗しました: ${e.message || e}`));
					}
				};
				image.src = mapImage;
			} catch (outerError) {
				// map.once('render')の直後や初期化処理中のエラー
				console.error('エクスポート初期化エラー:', outerError);
				reject(outerError); // Promiseを拒否
			}
		});

		// Maplibre GL JS のレンダリングをトリガー
		map.triggerRepaint();
	});
};

export const exportPDF = async (map: MaplibreMap): Promise<void> => {
	return new Promise((resolve, reject) => {
		// Promiseを返すようにラップ
		map.once('render', async () => {
			try {
				const mapCanvas = map.getCanvas();
				const mapImage = mapCanvas.toDataURL('image/png');
				const image = new Image();

				// 地図画像のロードが完了したら次の処理へ
				image.onload = async () => {
					try {
						const scaleDiv = document.querySelector('.maplibregl-ctrl-scale') as HTMLElement;
						if (!scaleDiv) {
							throw new Error('スケールバー要素が見つかりません。');
						}

						const finalCanvas = document.createElement('canvas');
						finalCanvas.width = mapCanvas.width;
						finalCanvas.height = mapCanvas.height;
						const ctx = finalCanvas.getContext('2d') as CanvasRenderingContext2D;

						// 地図の画像を描画
						ctx.drawImage(image, 0, 0);

						// スケールバーの画像をキャプチャ
						// html2canvasはPromiseを返すのでawaitで待機
						const scaleCanvas = await html2canvas(scaleDiv);

						// スケールバーの画像を左下に描画
						const scaleWidth = scaleCanvas.width;
						const scaleHeight = scaleCanvas.height;
						const scaleMargin = 10;

						// 透過度を設定
						ctx.globalAlpha = 0.7;
						ctx.drawImage(
							scaleCanvas,
							scaleMargin,
							finalCanvas.height - scaleHeight - scaleMargin,
							scaleWidth,
							scaleHeight
						);
						ctx.globalAlpha = 1.0; // 透過度をリセット

						// 方位の画像を取得
						const connpassImageElement = await new Promise<HTMLImageElement>(
							(imgResolve, imgReject) => {
								const img = new Image();
								img.onload = () => imgResolve(img);
								img.onerror = (e) => {
									if (e instanceof Error)
										imgReject(new Error(`方位画像のロードに失敗しました: ${e.message || e}`));
								};
								img.src = './images/map_connpass.png'; // 画像パスを確認
							}
						);

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
						ctx.globalAlpha = 1.0; // 透過度をリセット

						const pdf = new jsPDF('l', 'mm', 'a4');
						const imgWidth = 297; // A4横幅
						const pageHeight = pdf.internal.pageSize.height;
						const imgHeight = (image.height * imgWidth) / image.width;
						let heightLeft = imgHeight;

						let position = 0;

						pdf.addImage(image, 'PNG', 0, position, imgWidth, imgHeight);
						heightLeft -= pageHeight;

						while (heightLeft >= 0) {
							position = heightLeft - imgHeight;
							pdf.addPage();
							pdf.addImage(image, 'PNG', 0, position, imgWidth, imgHeight);
							heightLeft -= pageHeight;
						}

						pdf.save('map.pdf');
						resolve();
					} catch (innerError) {
						// 内部のエラーが発生した場合
						console.error('エクスポート処理中のエラー:', innerError);
						reject(innerError); // Promiseを拒否
					}
				};
				// mapImageのロードエラーハンドリング
				image.onerror = (e) => {
					if (e instanceof Error) {
						reject(new Error(`地図画像のロードに失敗しました: ${e.message || e}`));
					}
				};
				image.src = mapImage;
			} catch (outerError) {
				// map.once('render')の直後や初期化処理中のエラー
				console.error('エクスポート初期化エラー:', outerError);
				reject(outerError); // Promiseを拒否
			}
		});

		// Maplibre GL JS のレンダリングをトリガー
		map.triggerRepaint();
	});
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
const distancePerPixel = (zoomLevel: number) => {
	// ズームレベルに基づいて、1ピクセルあたりのメートル数を計算
	return EARTH_CIRCUMFERENCE / Math.pow(2, zoomLevel) / TILE_SIZE;
};

// ズームレベルを指定して、1ピクセルあたりの高さスケールを計算
const zoomLevel = 14; // 任意のズームレベル
const pixelDistance = distancePerPixel(zoomLevel);

// タイル内の高さデータをスケーリングする
const scaleHeightToZoomLevel = (heightValue: number, zoomLevel: number) => {
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
