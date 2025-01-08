import { PMTiles } from 'pmtiles';
import type { TileSize, ZoomLevel, CategoryLegend, RasterFormatType } from '$map/data/types/raster';
import * as tilebelt from '@mapbox/tilebelt';
import type { LngLat } from 'maplibre-gl';
import chroma from 'chroma-js';

/**  PMTiles から画像を取得する */
export const getImagePmtiles = async (
	url: string,
	tile: { x: number; y: number; z: number }
): Promise<string> => {
	const pmtiles = new PMTiles(url);

	// タイルデータを取得
	const tileData = await pmtiles.getZxy(tile.z, tile.x, tile.y);
	if (!tileData || !tileData.data) {
		throw new Error('Tile data not found');
	}

	// Blob を生成
	const blob = new Blob([tileData.data], { type: 'image/png' });

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			if (reader.result) {
				// Base64データを返す
				resolve(reader.result.toString());
			} else {
				reject(new Error('Failed to convert blob to Base64'));
			}
		};
		reader.onerror = (err) => reject(err);

		// Blob を読み取る
		reader.readAsDataURL(blob);
	});
};

/** タイル画像のピクセル色を取得 */
export const getPixelColor = async (
	url: string,
	lngLat: LngLat,
	zoom: ZoomLevel,
	tileSize: TileSize,
	type: RasterFormatType
): Promise<string | null> => {
	const { lng, lat } = lngLat;

	try {
		// タイル座標を計算
		const tile = tilebelt.pointToTile(lng, lat, zoom);
		let src: string | null = null;
		if (type === 'pmtiles') {
			src = await getImagePmtiles(url, {
				x: tile[0],
				y: tile[1],
				z: tile[2]
			});
		} else if (type === 'image') {
			src = await url
				.replace('{z}', tile[2].toString())
				.replace('{x}', tile[0].toString())
				.replace('{y}', tile[1].toString());
		}

		if (!src) {
			return null;
		}

		const bbox = tilebelt.tileToBBOX(tile);

		// クリックした座標からタイル画像のピクセル座標を計算
		const [lngMin, latMin, lngMax, latMax] = bbox;
		const x = Math.floor(((lng - lngMin) / (lngMax - lngMin)) * tileSize);
		const y = Math.floor(((latMax - lat) / (latMax - latMin)) * tileSize);

		// タイル画像を読み込み
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = src;

		return await new Promise((resolve, reject) => {
			img.onload = () => {
				try {
					// Canvas を使用してピクセルデータを取得
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');
					canvas.width = img.width;
					canvas.height = img.height;
					ctx?.drawImage(img, 0, 0);

					// ピクセルの色を取得
					const pixel = ctx?.getImageData(x, y, 1, 1).data;
					if (!pixel) {
						reject(new Error('ピクセルデータの取得に失敗しました'));
						return;
					}

					const [r, g, b, a] = [...pixel];

					// 透明色の場合は処理を終了
					if (a === 0) {
						resolve(null);
						return;
					}
					const hexColor = chroma([r, g, b, a / 255]).hex(); // α値は 0〜1 の範囲
					resolve(hexColor);
				} catch (error) {
					reject(error);
				}
			};

			img.onerror = (error: string | Event) => {
				console.error('画像の読み込みに失敗しました:', error);
				reject(new Error(`画像の読み込みに失敗しました: ${error}`));
			};
		});
	} catch (error) {
		console.error('getPixelColor でエラーが発生しました:', error);
		return null; // エラー時は null を返す
	}
};

/**  凡例から最も近いラベルを取得 */
export const getGuide = (
	targetColor: string,
	legend: CategoryLegend
): {
	color: string;
	label: string;
} => {
	if (legend.colors.length !== legend.labels.length) {
		throw new Error('Legendの colors と labels の長さが一致していません');
	}

	// 各色とのユークリッド距離を計算し、最も近い色を見つける
	const closest = legend.colors
		.map((color, index) => {
			const distance = chroma.distance(targetColor, color); // 色の距離を計算
			return { distance, color, label: legend.labels[index] }; // 距離とラベルを紐付け
		})
		.sort((a, b) => a.distance - b.distance)[0]; // 距離が最も小さいものを選択

	return { color: closest.color, label: closest.label };
};

/* タイルURLを取得 */
export const getTileUrl = (lng: number, lat: number, zoom: number, tileUrl: string): string => {
	const tile = tilebelt.pointToTile(lng, lat, zoom);

	return tileUrl
		.replace('{z}', tile[2].toString())
		.replace('{x}', tile[0].toString())
		.replace('{y}', tile[1].toString());
};
