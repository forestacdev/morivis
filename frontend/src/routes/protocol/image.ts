type TileImageData = { [position: string]: { tileId: string; image: ImageBitmap } };
import colormap from 'colormap';

// タイル画像の処理
export class TileImageManager {
	private static instance: TileImageManager;
	private cache: Map<string, ImageBitmap>;
	private cacheSizeLimit: number;
	private cacheOrder: string[];

	private constructor(cacheSizeLimit = 500) {
		this.cache = new Map();
		this.cacheSizeLimit = cacheSizeLimit;
		this.cacheOrder = [];
	}

	// TileImageManager のインスタンスを取得する静的メソッド
	public static getInstance(cacheSizeLimit = 500): TileImageManager {
		if (!TileImageManager.instance) {
			TileImageManager.instance = new TileImageManager(cacheSizeLimit);
		}
		return TileImageManager.instance;
	}

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

	public async getAdjacentTilesWithImages(
		x: number,
		y: number,
		z: number,
		baseurl: string,
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
				const imageUrl = baseurl
					.replace('{x}', tileX.toString())
					.replace('{y}', tileY.toString())
					.replace('{z}', z.toString());

				// キャッシュにタイル画像があればそれを使う。なければ新たにリクエストを送る
				const imageBitmap = this.cache.has(imageUrl)
					? this.cache.get(imageUrl)
					: await this.loadImage(imageUrl, controller.signal);
				if (!imageBitmap) return;
				this.add(imageUrl, imageBitmap);

				result[position] = { tileId: imageUrl, image: imageBitmap };
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
}

// カラーマップデータを作成するクラス
export class ColorMapManager {
	private cache: Map<string, Uint8Array>;
	public constructor() {
		this.cache = new Map();
	}
	public createColorArray(colorMapName: string): Uint8Array {
		const cacheKey = `${colorMapName}`;

		if (this.has(cacheKey)) {
			return this.get(cacheKey) as Uint8Array;
		}

		const width = 256;
		const pixels = new Uint8Array(width * 3); // RGBのみの3チャンネルデータ

		// オプションオブジェクトを作成
		const options = {
			colormap: colorMapName,
			nshades: width,
			format: 'rgb', // RGBAからRGBに変更
			alpha: 1
		};

		let colors = colormap(options as any);

		// RGBデータの格納
		let ptr = 0;
		for (let i = 0; i < width; i++) {
			const color = colors[i] as number[];
			pixels[ptr++] = color[0];
			pixels[ptr++] = color[1];
			pixels[ptr++] = color[2];
		}

		// キャッシュに格納して再利用可能にする
		this.cache.set(cacheKey, pixels);

		return pixels;
	}

	add(cacheKey: string, pixels: Uint8Array): void {
		this.cache.set(cacheKey, pixels);
	}

	get(cacheKey: string): Uint8Array | undefined {
		return this.cache.get(cacheKey);
	}

	has(cacheKey: string): boolean {
		return this.cache.has(cacheKey);
	}
}
