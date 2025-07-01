import { PMTiles } from 'pmtiles';
type TileImageData = { [position: string]: { tileId: string; image: ImageBitmap } };

// タイル画像の処理
export class TileImageManager {
	private static instance: TileImageManager;
	private static pmCache = new Map<string, PMTiles>(); // TODO リミットサイズ, 共有キャッシュ
	private imageBaseUrlCache = new Map<string, string>(); // TODO リミットサイズ, 共有キャッシュ
	private cache: Map<string, ImageBitmap>;
	private cacheSizeLimit: number;
	private cacheOrder: string[];

	private constructor(cacheSizeLimit = 500) {
		this.cache = new Map();
		this.cacheSizeLimit = cacheSizeLimit;
		this.cacheOrder = [];
		this.imageBaseUrlCache = new Map();
	}

	// TileImageManager のインスタンスを取得する静的メソッド
	public static getInstance(cacheSizeLimit = 500): TileImageManager {
		if (!TileImageManager.instance) {
			TileImageManager.instance = new TileImageManager(cacheSizeLimit);
		}
		return TileImageManager.instance;
	}

	public async loadImagePmtiles(
		src: string,
		tile: { x: number; y: number; z: number },
		signal: AbortSignal
	): Promise<ImageBitmap> {
		try {
			let pmtiles = TileImageManager.pmCache.get(src);
			if (!pmtiles) {
				pmtiles = new PMTiles(src);
				TileImageManager.pmCache.set(src, pmtiles);
			}

			// タイルデータを取得
			const tileData = await pmtiles.getZxy(tile.z, tile.x, tile.y, signal);
			if (!tileData || !tileData.data) {
				throw new Error('Tile data not found');
			}

			// Blob を生成
			const blob = new Blob([tileData.data], { type: 'image/png' });

			// ImageBitmap に変換して返す
			return await createImageBitmap(blob);
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				// リクエストがキャンセルされた場合はエラーをスロー
				throw error;
			} else {
				// 他のエラー時には空の画像を返す
				return await createImageBitmap(new ImageData(1, 1));
			}
		}
	}

	// TODO
	public async loadImage(src: string, signal: AbortSignal): Promise<ImageBitmap> {
		try {
			const response = await fetch(src, { signal });
			if (!response.ok) {
				throw new Error('Failed to fetch image');
			}
			return await createImageBitmap(await response.blob());
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				// リクエストがキャンセルされた場合はエラーをスロー
				throw error;
			} else {
				// 他のエラー時には空の画像を返す
				return await createImageBitmap(new ImageData(1, 1));
			}
		}
	}
	public async getSingleTileImage(
		tileId: string,
		x: number,
		y: number,
		z: number,
		baseurl: string,
		formatType: 'image' | 'pmtiles',
		controller: AbortController
	): Promise<ImageBitmap> {
		const imageUrl = baseurl
			.replace('{x}', x.toString())
			.replace('{y}', y.toString())
			.replace('{z}', z.toString());

		if (this.cache.has(tileId)) {
			const cachedImage = this.cache.get(tileId)!;
			this.add(tileId, cachedImage); // `add`メソッドが順序更新とサイズ制限を処理
			return cachedImage;
		}

		try {
			let imageBitmap: ImageBitmap | undefined = undefined;
			if (formatType === 'image') {
				imageBitmap = await this.loadImage(imageUrl, controller.signal);
			} else if (formatType === 'pmtiles') {
				const tile = { x, y, z };
				imageBitmap = await this.loadImagePmtiles(imageUrl, tile, controller.signal);
			}

			if (!imageBitmap) {
				throw new Error(`Failed to load image for ${tileId}`);
			}

			this.add(tileId, imageBitmap);
			return imageBitmap;
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw error;
			}

			console.error(`Error in getSingleTileImage for ${tileId}:`, error);
			return await createImageBitmap(new ImageData(1, 1)); // エラー時にも1x1画像を返す
		}
	}

	public async getAdjacentTilesWithImages(
		entryId: string,
		x: number,
		y: number,
		z: number,
		centerurl: string,
		formatType: 'image' | 'pmtiles',
		controller: AbortController
	): Promise<TileImageData> {
		const positions = [
			{ position: 'center', dx: 0, dy: 0 },
			{ position: 'left', dx: -1, dy: 0 },
			{ position: 'right', dx: 1, dy: 0 },
			{ position: 'top', dx: 0, dy: -1 },
			{ position: 'bottom', dx: 0, dy: 1 }
		];

		const result: TileImageData = {};

		await Promise.all(
			positions.map(async ({ position, dx, dy }) => {
				const tileX = x + dx;
				const tileY = y + dy;
				const id = `${entryId}_${tileX}_${tileY}_${z}`;

				const baseurl2 = this.imageBaseUrlCache.get(entryId) || centerurl;

				const imageUrl = baseurl2
					.replace('{x}', tileX.toString())
					.replace('{y}', tileY.toString())
					.replace('{z}', z.toString());

				let imageBitmap = this.cache.get(id);

				if (!imageBitmap) {
					if (formatType === 'image') {
						imageBitmap = await this.loadImage(imageUrl, controller.signal);
					} else if (formatType === 'pmtiles') {
						const tile = { x: tileX, y: tileY, z };
						imageBitmap = await this.loadImagePmtiles(imageUrl, tile, controller.signal);
					}
				}
				if (!imageBitmap) return;
				this.add(id, imageBitmap);

				result[position] = { tileId: id, image: imageBitmap };
			})
		);

		return result;
	}

	add(tileId: string, image: ImageBitmap): void {
		if (this.cacheOrder.length >= this.cacheSizeLimit) {
			const oldestTileId = this.cacheOrder.shift();
			if (oldestTileId) {
				this.cache.delete(oldestTileId);
			}
		}

		this.cache.set(tileId, image);

		const index = this.cacheOrder.indexOf(tileId);
		if (index > -1) {
			this.cacheOrder.splice(index, 1);
		}
		this.cacheOrder.push(tileId);
	}

	get(tileId: string): ImageBitmap | undefined {
		return this.cache.get(tileId);
	}

	has(tileId: string): boolean {
		return this.cache.has(tileId);
	}

	clear(): void {
		this.cache.clear();
		this.cacheOrder = [];
	}

	getUrlcache(id: string): string | undefined {
		return this.imageBaseUrlCache.get(id);
	}

	addUrlcache(id: string, url: string): void {
		this.imageBaseUrlCache.set(id, url);
	}

	deleteUrlcache(id: string): void {
		this.imageBaseUrlCache.delete(id);
	}
}
