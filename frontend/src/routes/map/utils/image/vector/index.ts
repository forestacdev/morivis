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
	bounds?: maplibregl.LngLatBoundsLike;
	xyz?: TileXYZ;
	timeout?: number;
}

export interface MapImageResult {
	blobUrl: string;
	fileName: string;
	revokeBlobUrl: () => void;
}

interface QueueItem {
	style: maplibregl.StyleSpecification | string;
	options: MapImageOptions;
	resolve: (result: MapImageResult) => void;
	reject: (error: Error) => void;
}

/**
 * キューシステム付きMapImageGenerator
 */
class MapImageGenerator {
	private map: maplibregl.Map | null = null;
	private container: HTMLDivElement | null = null;
	private currentStyle: string | maplibregl.StyleSpecification | null = null;
	private isProcessing = false;
	private queue: QueueItem[] = [];

	/**
	 * Mapインスタンスを初期化
	 */
	private initMap(
		style: maplibregl.StyleSpecification | string,
		width: number,
		height: number
	): maplibregl.Map {
		// 既存のコンテナがあれば削除
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}

		// 新しいコンテナを作成
		this.container = document.createElement('div');
		this.container.style.width = `${width}px`;
		this.container.style.height = `${height}px`;
		this.container.style.position = 'absolute';
		this.container.style.top = '-9999px';
		this.container.style.left = '-9999px';
		document.body.appendChild(this.container);

		// Mapインスタンスを作成
		this.map = new maplibregl.Map({
			container: this.container,
			style,
			interactive: false,
			attributionControl: false,
			fadeDuration: 0 // アニメーションを無効化して高速化
		});

		this.currentStyle = style;
		return this.map;
	}

	/**
	 * Mapのサイズを更新
	 */
	private updateMapSize(width: number, height: number): void {
		if (!this.map || !this.container) return;

		this.container.style.width = `${width}px`;
		this.container.style.height = `${height}px`;
		this.map.getCanvas().style.width = `${width}px`;
		this.map.getCanvas().style.height = `${height}px`;
		this.map.resize();
	}

	/**
	 * スタイルが変更されたかチェック
	 */
	private isStyleChanged(style: maplibregl.StyleSpecification | string): boolean {
		if (typeof style === 'string' && typeof this.currentStyle === 'string') {
			return style !== this.currentStyle;
		}
		if (typeof style === 'object' && typeof this.currentStyle === 'object') {
			return JSON.stringify(style) !== JSON.stringify(this.currentStyle);
		}
		return true;
	}

	/**
	 * キューに追加して処理を開始
	 */
	async generateImage(
		style: maplibregl.StyleSpecification | string,
		options: MapImageOptions
	): Promise<MapImageResult> {
		return new Promise((resolve, reject) => {
			// キューに追加
			this.queue.push({ style, options, resolve, reject });

			// 処理中でなければ開始
			if (!this.isProcessing) {
				this.processQueue();
			}
		});
	}

	/**
	 * キューを順次処理
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;

		while (this.queue.length > 0) {
			const item = this.queue.shift();
			if (!item) break;

			try {
				const result = await this.processSingleImage(item.style, item.options);
				item.resolve(result);
			} catch (error) {
				item.reject(error as Error);
			}
		}

		this.isProcessing = false;
	}

	/**
	 * 単一の画像を処理
	 */
	private async processSingleImage(
		style: maplibregl.StyleSpecification | string,
		options: MapImageOptions
	): Promise<MapImageResult> {
		const {
			name,
			width = 256,
			height = 256,
			bearing = 0,
			pitch = 0,
			bounds,
			xyz,
			timeout = 10000
		} = options;

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error('Map image generation timed out'));
			}, timeout);

			try {
				// Mapインスタンスがないか、スタイルが変更された場合は初期化
				if (!this.map || this.isStyleChanged(style)) {
					if (this.map) {
						this.map.remove();
					}
					this.map = this.initMap(style, width, height);
				} else {
					// サイズが変更された場合は更新
					this.updateMapSize(width, height);
				}

				const mapBounds = xyz
					? tilebelt.tileToBBOX(Object.values(xyz) as [number, number, number])
					: bounds;

				// Mapの設定を更新
				const updateMapView = () => {
					if (!this.map) return;

					this.map.setBearing(bearing);
					this.map.setPitch(pitch);

					if (mapBounds) {
						this.map.fitBounds(mapBounds as maplibregl.LngLatBoundsLike, {
							padding: 0,
							duration: 0
						});
					}
				};

				// 画像生成処理
				const generateImageFromCanvas = () => {
					try {
						if (!this.map) {
							throw new Error('Map instance not found');
						}

						const canvas = this.map.getCanvas();
						if (!canvas) {
							throw new Error('Canvas not found');
						}

						// キャンバスをクローン
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
								clearTimeout(timeoutId);

								if (!blob) {
									reject(new Error('Failed to generate blob'));
									return;
								}

								const fileName = `${name}.jpg`;
								const blobUrl = URL.createObjectURL(blob);
								const revokeBlobUrl = () => URL.revokeObjectURL(blobUrl);

								resolve({
									blobUrl,
									fileName,
									revokeBlobUrl
								});
							},
							'image/jpeg',
							1.0
						);
					} catch (error) {
						clearTimeout(timeoutId);
						reject(error);
					}
				};

				// エラーハンドリング
				const onError = (error: any) => {
					clearTimeout(timeoutId);
					reject(new Error(`Map error: ${error.error?.message || 'Unknown error'}`));
				};

				// レンダリング完了を待つ
				const waitForRender = () => {
					if (!this.map) return;

					// idle状態になるまで待つ
					if (this.map && this.map.areTilesLoaded()) {
						// さらに少し待ってレンダリング完了を確実にする
						setTimeout(generateImageFromCanvas, 200);
					} else {
						this.map.once('idle', () => {
							setTimeout(generateImageFromCanvas, 200);
						});
					}
				};

				// イベントリスナーの設定
				if (this.map.isStyleLoaded()) {
					updateMapView();
					waitForRender();
				} else {
					this.map.once('style.load', () => {
						updateMapView();
						waitForRender();
					});
				}

				this.map.once('error', onError);
			} catch (error) {
				clearTimeout(timeoutId);
				reject(error);
			}
		});
	}

	/**
	 * キューをクリア
	 */
	clearQueue(): void {
		this.queue.forEach((item) => {
			item.reject(new Error('Queue cleared'));
		});
		this.queue = [];
	}

	/**
	 * リソースをクリーンアップ
	 */
	dispose(): void {
		this.clearQueue();

		if (this.map) {
			this.map.remove();
		}
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}

		this.map = null;
		this.container = null;
		this.currentStyle = null;
		this.isProcessing = false;
	}
}

// シングルトンインスタンス
let mapImageGenerator: MapImageGenerator | null = null;

/**
 * キューシステム付きの画像生成関数
 */
export async function generateMapImageOptimized(
	style: maplibregl.StyleSpecification | string,
	options: MapImageOptions
): Promise<MapImageResult> {
	if (!mapImageGenerator) {
		mapImageGenerator = new MapImageGenerator();
	}

	return mapImageGenerator.generateImage(style, options);
}

/**
 * 元の関数（後方互換性のため）
 */
export async function generateMapImageDOM(
	style: maplibregl.StyleSpecification | string,
	options: MapImageOptions
): Promise<MapImageResult> {
	return generateMapImageOptimized(style, options);
}

/**
 * キューをクリア
 */
export function clearImageQueue(): void {
	if (mapImageGenerator) {
		mapImageGenerator.clearQueue();
	}
}

/**
 * リソースをクリーンアップ
 */
export function cleanupMapImageGenerator(): void {
	if (mapImageGenerator) {
		mapImageGenerator.dispose();
		mapImageGenerator = null;
	}
}

/*
// キューをクリアしたい場合
clearImageQueue();

// アプリケーション終了時
cleanupMapImageGenerator();
*/
