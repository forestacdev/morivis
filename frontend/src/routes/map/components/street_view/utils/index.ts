import * as THREE from 'three';
import proj4 from 'proj4';
import { PANORAMA_IMAGE_URL, SCENE_CENTER_COORDS } from '../constants';
import type {
	NextPointData,
	CurrentPointData,
	PhotoAngleDict
} from '$routes/map/types/street-view';
import photoAngleDataDictRaw from './photo_angles.json';

const photoAngleDataDict = photoAngleDataDictRaw as PhotoAngleDict;

// 次のポイントを読み込む
export const placePointData = (nextPointData: NextPointData[]): CurrentPointData[] => {
	// 次のポイントデータが存在しない場合は何もしない
	if (!nextPointData || nextPointData.length === 0) {
		console.warn('次のポイントデータが存在しません。');
		return [];
	}

	// テクスチャ読み込みのPromiseを格納する配列
	const texturePromises = nextPointData.map((pointData) => {
		const photo_id = pointData.featureData.properties.photo_id;
		const angleData = photoAngleDataDict[photo_id];
		const webp = PANORAMA_IMAGE_URL + pointData.featureData.properties.photo_id + '.webp';

		return {
			node_id: pointData.featureData.properties.node_id,
			photo_id: photo_id,
			angle: angleData as { angle_x: number; angle_y: number; angle_z: number },
			featureData: pointData.featureData,
			texture: webp
		};
	});

	return texturePromises;
};

/**
 * カメラの 軸回転角度を取得し、0〜360度の範囲に正規化する
 * @param camera THREE.PerspectiveCamera | THREE.OrthographicCamera
 * @returns 0〜360度の X Y Z 軸回転角度
 */
export const getCameraXYRotation = (camera: THREE.Camera): { x: number; y: number } => {
	const xDegrees = -THREE.MathUtils.radToDeg(camera.rotation.x); // ラジアン→度に変換
	const yDegrees = -THREE.MathUtils.radToDeg(camera.rotation.y); // ラジアン→度に変換
	return {
		x: (xDegrees + 360) % 360, // 0〜360度の範囲に調整
		y: (yDegrees + 360) % 360 // 0〜360度の範囲に調整
	};
};

/**
 * カメラをX Y Z軸の回転角度(0〜360度)に設定する
 * @param camera THREE.PerspectiveCamera | THREE.OrthographicCamera
 * @param rotation 0〜360度の X Y 軸回転角度
 */
export const setCameraXYRotation = (
	camera: THREE.Camera,
	rotation: { x: number; y: number }
): void => {
	// 0〜360度の値を -180〜180度に正規化してからラジアンに変換
	const xRadians = -THREE.MathUtils.degToRad(rotation.x);
	const yRadians = -THREE.MathUtils.degToRad(rotation.y);

	camera.rotation.set(xRadians, yRadians, 0);
	camera.updateMatrixWorld();
};

/**
 * カメラの Y 軸回転角度を取得し、0〜360度の範囲に正規化する
 * @param camera THREE.PerspectiveCamera | THREE.OrthographicCamera
 * @returns 0〜360度の Y 軸回転角度
 */
export const getCameraYRotation = (camera: THREE.Camera): number => {
	const degrees = -THREE.MathUtils.radToDeg(camera.rotation.y); // ラジアン→度に変換
	return (degrees + 360) % 360; // 0〜360度の範囲に調整
};

/** 度（°）をラジアン（rad）に変換する関数 */
export const degreesToRadians = (degrees: number) => {
	return degrees * (Math.PI / 180);
};

// テクスチャキャッシュクラス（軽量版）
export class TextureCache {
	private cache = new Map<string, THREE.Texture>();
	private loadingPromises = new Map<string, Promise<THREE.Texture>>();
	private textureLoader: THREE.TextureLoader;
	private maxCacheSize = 15; // 周辺ポイント数 + バッファ

	constructor(textureLoader: THREE.TextureLoader) {
		this.textureLoader = textureLoader;
	}

	async loadTexture(url: string): Promise<THREE.Texture> {
		// 既にキャッシュにある場合
		if (this.cache.has(url)) {
			return this.cache.get(url)!;
		}

		// 既に読み込み中の場合
		if (this.loadingPromises.has(url)) {
			return this.loadingPromises.get(url)!;
		}

		// 新しく読み込み開始
		const loadPromise = this.createLoadPromise(url);
		this.loadingPromises.set(url, loadPromise);

		try {
			const texture = await loadPromise;
			this.addToCache(url, texture);
			return texture;
		} finally {
			this.loadingPromises.delete(url);
		}
	}

	private createLoadPromise(url: string): Promise<THREE.Texture> {
		return new Promise((resolve, reject) => {
			this.textureLoader.load(
				url,
				(texture) => {
					texture.colorSpace = THREE.SRGBColorSpace;
					texture.minFilter = THREE.LinearFilter;
					texture.magFilter = THREE.LinearFilter;
					texture.generateMipmaps = false;
					texture.needsUpdate = true;
					texture.premultiplyAlpha = false;
					resolve(texture);
				},
				undefined,
				reject
			);
		});
	}

	private addToCache(url: string, texture: THREE.Texture) {
		// キャッシュサイズ制限（LRU）
		if (this.cache.size >= this.maxCacheSize) {
			const firstKey = this.cache.keys().next().value;
			if (!firstKey) return;
			const oldTexture = this.cache.get(firstKey);
			if (oldTexture) {
				oldTexture.dispose();
			}
			this.cache.delete(firstKey);
		}

		this.cache.set(url, texture);
	}

	// バックグラウンドプリロード
	async preloadTexture(url: string): Promise<void> {
		try {
			await this.loadTexture(url);
		} catch (error) {
			console.warn(`プリロード失敗: ${url}`, error);
		}
	}

	// 複数テクスチャの並列プリロード
	async preloadTextures(urls: string[]): Promise<void> {
		const promises = urls.map((url) => this.preloadTexture(url));
		await Promise.allSettled(promises);
	}

	getCacheStatus() {
		return {
			cached: this.cache.size,
			loading: this.loadingPromises.size,
			cachedUrls: Array.from(this.cache.keys()).map((url) => url.split('/').pop())
		};
	}

	clearCache() {
		this.cache.forEach((texture) => texture.dispose());
		this.cache.clear();
		this.loadingPromises.clear();
	}
}
