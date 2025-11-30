import html2canvas from 'html2canvas';
import { Map as MapLibreMap } from 'maplibre-gl';
import { downloadWorldFile, generateWorldFile } from './worldfile';

import JSZip from 'jszip';
import type { image } from 'html2canvas/dist/types/css/types/image';

export const getMapCanvasImage = (map: MapLibreMap): Promise<string> => {
	return new Promise((resolve, reject) => {
		map.once('render', () => {
			try {
				const mapCanvas = map.getCanvas();
				const mapImage = mapCanvas.toDataURL('image/png');
				resolve(mapImage);
			} catch (error) {
				reject(error);
			}
		});
		// Maplibre GL JS のレンダリングをトリガー
		map.triggerRepaint();
	});
};

/**
 * Export the map as an image with a scale bar and compass.
 * @param map
 * @returns Promise<void> 処理が完了したら解決し、エラーがあれば拒否されるPromise
 */
export const imageExport = (map: MapLibreMap): Promise<void> => {
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
						const finalCanvas = document.createElement('canvas');
						finalCanvas.width = mapCanvas.width;
						finalCanvas.height = mapCanvas.height;
						const ctx = finalCanvas.getContext('2d') as CanvasRenderingContext2D;

						// 地図の画像を描画
						ctx.drawImage(image, 0, 0);

						// const scaleDiv = document.querySelector('.maplibregl-ctrl-scale') as HTMLElement;
						// if (!scaleDiv) {
						// 	throw new Error('スケールバー要素が見つかりません。');
						// }

						// スケールバーの画像をキャプチャ
						// html2canvasはPromiseを返すのでawaitで待機
						// const scaleCanvas = await html2canvas(scaleDiv);

						// // スケールバーの画像を左下に描画
						// const scaleWidth = scaleCanvas.width;
						// const scaleHeight = scaleCanvas.height;
						// const scaleMargin = 10;

						// // 透過度を設定
						// ctx.globalAlpha = 0.7;
						// ctx.drawImage(
						// 	scaleCanvas,
						// 	scaleMargin,
						// 	finalCanvas.height - scaleHeight - scaleMargin,
						// 	scaleWidth,
						// 	scaleHeight
						// );
						// ctx.globalAlpha = 1.0; // 透過度をリセット

						// 方位の画像を取得
						// const connpassImageElement = await new Promise<HTMLImageElement>(
						// 	(imgResolve, imgReject) => {
						// 		const img = new Image();
						// 		img.onload = () => imgResolve(img);
						// 		img.onerror = (e) => {
						// 			if (e instanceof Error)
						// 				imgReject(new Error(`方位画像のロードに失敗しました: ${e.message || e}`));
						// 		};

						// 		img.src = './images/map_connpass.png'; // 画像パスを確認
						// 	}
						// );

						// // 余白
						// const connpassMargin = 20;

						// // コンパス画像のサイズ
						// const connpassWidth = connpassImageElement.width;
						// const connpassHeight = connpassImageElement.height;

						// // 回転の中心を指定（例: 画像の中央）
						// const centerX = finalCanvas.width - connpassWidth / 2 - connpassMargin;
						// const centerY = connpassMargin + connpassHeight / 2;

						// キャンバスの状態を保存
						ctx.save();

						// 透過度を設定
						// ctx.globalAlpha = 0.7;

						// // 回転
						// const bearing360 = (Number(map.getBearing().toFixed(1)) + 360) % 360;
						// ctx.translate(centerX, centerY);
						// const angleInRadians = (bearing360 * Math.PI) / -180;
						// ctx.rotate(angleInRadians);

						// // 画像を描画（回転の中心に戻して描画するため、位置を調整）
						// ctx.drawImage(
						// 	connpassImageElement,
						// 	-connpassWidth / 2,
						// 	-connpassHeight / 2,
						// 	connpassWidth,
						// 	connpassHeight
						// );

						// キャンバスの状態を復元
						ctx.restore();
						ctx.globalAlpha = 1.0; // 透過度をリセット

						// 地図画像をダウンロード
						// const link = document.createElement('a');
						// link.href = finalCanvas.toDataURL('image/png');

						// 現在の日時を取得してフォーマット（YYYYMMDDhhmmss）
						const now = new Date();
						const formattedDate =
							now.getFullYear() +
							String(now.getMonth() + 1).padStart(2, '0') +
							String(now.getDate()).padStart(2, '0') +
							String(now.getHours()).padStart(2, '0') +
							String(now.getMinutes()).padStart(2, '0') +
							String(now.getSeconds()).padStart(2, '0');

						// link.download = formattedDate + '.png';
						// link.click();

						// 全ての処理が成功したらPromiseを解決
						console.log('エクスポート完了');
						resolve();

						const epsg = 4326;
						const baseName = formattedDate + '_epsg_' + epsg;

						const zip = new JSZip();
						zip.file(baseName + '.png', finalCanvas.toDataURL('image/png').split(',')[1], {
							base64: true
						});

						const worldFileContent = await generateWorldFile(
							map,
							finalCanvas.width,
							finalCanvas.height,
							epsg
						);

						zip.file(baseName + '.pgw', worldFileContent);

						// ZIPファイルを生成してダウンロード
						const zipBlob = await zip.generateAsync({ type: 'blob' });
						const url = URL.createObjectURL(zipBlob);
						const a = document.createElement('a');
						a.href = url;
						a.download = `${formattedDate}.zip`;
						a.click();
						URL.revokeObjectURL(url);

						await map.setProjection({
							type: 'globe'
						}); // EPSG:3857に設定

						// await downloadAuxXml(finalCanvas, map, 4326, formattedDate + '.png.aux.xml');
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

		map.setProjection({
			type: 'mercator'
		}); // EPSG:3857に設定

		// Maplibre GL JS のレンダリングをトリガー
		map.triggerRepaint();
	});
};
