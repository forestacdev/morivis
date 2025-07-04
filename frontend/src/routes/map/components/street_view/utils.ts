import * as THREE from 'three';
import proj4 from 'proj4';
import { SCENE_CENTER_COORDS } from './constants';
import type { NextPointData } from '$routes/map/types/street-view';

/**
 * カメラの Y 軸回転角度を取得し、0〜360度の範囲に正規化する
 * @param camera THREE.PerspectiveCamera | THREE.OrthographicCamera
 * @returns 0〜360度の Y 軸回転角度
 */
export const getCameraYRotation = (camera: THREE.Camera): number => {
	let degrees = -THREE.MathUtils.radToDeg(camera.rotation.y); // ラジアン→度に変換
	return (degrees + 360) % 360; // 0〜360度の範囲に調整
};

/**
 * パノラマ写真の回転角度を設定する
 * @param camera THREE.PerspectiveCamera | THREE.OrthographicCamera
 * @param degrees 0〜360度の Y 軸回転角度
 */
export const updateAngle = async (
	id: string,
	{
		x,
		y,
		z
	}: {
		x: number;
		y: number;
		z: number;
	}
) => {
	const response = await fetch('http://127.0.0.1:8000/update_angle', {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id,
			angleX: x,
			angleY: y,
			angleZ: z
		})
	});

	if (!response.ok) {
		console.error('Failed to update angles:', response.status);
		return;
	}

	const data = await response.json();
	console.log('Updated data:', data);
};

/** 度（°）をラジアン（rad）に変換する関数 */
export const degreesToRadians = (degrees: number) => {
	return degrees * (Math.PI / 180);
};

proj4.defs(
	'EPSG:6677',
	'+proj=tmerc +lat_0=36 +lon_0=139.833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs'
);

/* ワールド座標を経緯度に変える **/
export const worldPotisonToMapPotison = (x: number, z: number): [number, number] => {
	const lon = SCENE_CENTER_COORDS[0] + x;
	const lat = SCENE_CENTER_COORDS[1] + z * -1;
	const lnglat = proj4('EPSG:6677', 'WGS84', [lon, lat]) as [number, number];
	return lnglat;
};

/* 経緯度をワールド座標に変える **/
export const mapPotisonToWorldPotison = (
	lng: number,
	lat: number
): {
	x: number;
	z: number;
} => {
	const vec2 = proj4('WGS84', 'EPSG:6677', [lng, lat]) as [number, number];
	const x = vec2[0] - SCENE_CENTER_COORDS[0];
	const z = (vec2[1] - SCENE_CENTER_COORDS[1]) * -1;
	return { x, z };
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

export interface CurrentPointData {
	id: string;
	angle: {
		angleX: number;
		angleY: number;
		angleZ: number;
	};
	featureData: NextPointData['featureData'];
	texture: string;
}
