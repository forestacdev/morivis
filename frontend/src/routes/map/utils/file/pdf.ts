import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportPDF = async (map: MapLibreMap): Promise<void> => {
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
