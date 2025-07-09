import type { TileXYZ } from '$routes/map/data/types/raster';
import * as tilebelt from '@mapbox/tilebelt';
import maplibregl from 'maplibre-gl';

export interface MapImageOptions {
	name: string;
	width?: number;
	height?: number;
	center?: [number, number];
	zoom?: number;
	bearing?: number;
	pitch?: number;
	bounds?: maplibregl.LngLatBoundsLike; // nullを許容
	xyz?: TileXYZ;
	timeout?: number;
}

export interface MapImageResult {
	blobUrl: string;
	fileName: string;
	revokeBlobUrl: () => void;
}

// TODO : OffscreenCanvasを使用したMapLibre画像生成関数の実装
/**
 * DOM使用のMapLibre画像生成関数
 */
export async function generateMapImageDOM(
	style: maplibregl.StyleSpecification | string,
	options = {} as MapImageOptions
): Promise<MapImageResult> {
	const {
		name,
		width = 256,
		height = 256,
		center,
		bearing = 0,
		pitch = 0,
		bounds,
		xyz,
		timeout = 10000
	} = options;

	return new Promise((resolve, reject) => {
		const container = document.createElement('div');
		container.style.width = `${width}px`;
		container.style.height = `${height}px`;
		container.style.position = 'absolute';
		container.style.top = '-9999px';
		container.style.left = '-9999px';
		document.body.appendChild(container);

		// タイムアウト設定
		const timeoutId = setTimeout(() => {
			cleanup();
			reject(new Error('Map image generation timed out'));
		}, timeout);

		const mapBounds = xyz
			? tilebelt.tileToBBOX(Object.values(xyz) as [number, number, number])
			: bounds;

		// Mapインスタンスを作成
		const map = new maplibregl.Map({
			container,
			style,
			bearing,
			pitch,
			bounds: mapBounds,
			interactive: false,
			attributionControl: false
		});

		// クリーンアップ関数
		const cleanup = () => {
			clearTimeout(timeoutId);
			if (map && !map._removed) {
				map.remove();
			}
			if (container && container.parentNode) {
				container.parentNode.removeChild(container);
			}
		};

		// エラーハンドリング
		map.on('error', (error) => {
			cleanup();
			reject(new Error(`Map error: ${error.error?.message || 'Unknown error'}`));
		});

		// マップが完全に読み込まれたら画像を生成
		map.on('load', () => {
			try {
				setTimeout(() => {
					try {
						const canvas = map.getCanvas();
						if (!canvas) {
							throw new Error('Canvas not found');
						}

						// キャンバスをクローンして返す
						const clonedCanvas = document.createElement('canvas');
						const ctx = clonedCanvas.getContext('2d');
						if (!ctx) {
							throw new Error('Could not get 2D context');
						}

						clonedCanvas.width = canvas.width;
						clonedCanvas.height = canvas.height;
						ctx.drawImage(canvas, 0, 0);

						// Blobを生成
						clonedCanvas.toBlob(
							(blob) => {
								if (!blob) {
									cleanup();
									reject(new Error('Failed to generate blob'));
									return;
								}

								// ファイル名を生成（.jpg拡張子付き）
								const fileName = `${name}.jpg`;

								// Blob URLを作成（img srcに使用するため）
								const blobUrl = URL.createObjectURL(blob);

								// Blob URLをクリーンアップする関数
								const revokeBlobUrl = () => {
									URL.revokeObjectURL(blobUrl);
								};

								const result: MapImageResult = {
									blobUrl,
									fileName,

									revokeBlobUrl
								};

								cleanup();
								resolve(result);
							},
							'image/jpeg',
							1.0 // JPEGの品質を最大に設定
						);
					} catch (error) {
						cleanup();
						reject(error);
					}
				}, 1000);
			} catch (error) {
				cleanup();
				reject(error);
			}
		});
	});
}
