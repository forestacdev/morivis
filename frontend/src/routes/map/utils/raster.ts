import { PMTiles } from 'pmtiles';
import type { TileSize, ZoomLevel } from '$map/data/types/raster';
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

	// Blob を Base64 エンコードして返す
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

import * as tilebelt from '@mapbox/tilebelt';
import type {
	Map,
	StyleSpecification,
	SourceSpecification,
	LayerSpecification,
	TerrainSpecification,
	Marker,
	CircleLayerSpecification,
	LngLat
} from 'maplibre-gl';

type BBOX = [number, number, number, number];
type RGBA = [number, number, number, number];

/**  タイル画像のピクセル色を取得 */
export const getPixelColor = (
	url: string,
	lngLat: LngLat,
	zoom: ZoomLevel,
	tileSize: TileSize
): Promise<string> => {
	const { lng, lat } = lngLat;

	const tile = tilebelt.pointToTile(lng, lat, zoom);
	const tileUrl = url
		.replace('{z}', tile[2].toString())
		.replace('{x}', tile[0].toString())
		.replace('{y}', tile[1].toString());
	const bbox = tilebelt.tileToBBOX(tile);
	// クリックした座標がらタイル画像のピクセル座標を計算
	const [lngMin, latMin, lngMax, latMax] = bbox;
	const x = ((lng - lngMin) / (lngMax - lngMin)) * tileSize;
	const y = ((latMax - lat) / (latMax - latMin)) * tileSize;

	// タイル画像を読み込み、ピクセル座標の色を返す
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = tileUrl;
		img.onload = () => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			canvas.width = img.width;
			canvas.height = img.height;
			ctx?.drawImage(img, 0, 0);
			const pixel = ctx?.getImageData(x, y, 1, 1).data;
			if (!pixel) return;
			const [r, g, b, a] = [...pixel];
			const hexColor = chroma([r, g, b, a / 255]).hex(); // α値は 0〜1 の範囲
			resolve(hexColor);
		};
	});
};

/* タイルURLを取得 */
export const getTileUrl = (lng: number, lat: number, zoom: number, tileUrl: string): string => {
	const tile = tilebelt.pointToTile(lng, lat, zoom);

	return tileUrl
		.replace('{z}', tile[2].toString())
		.replace('{x}', tile[0].toString())
		.replace('{y}', tile[1].toString());
};

/* 経緯度からピクセル座標を取得 */
export const getTilePixelColor = async (
	lng: number,
	lat: number,
	zoom: number,
	tileUrl: string
) => {
	// asyncを追加
	// ズームレベルを取得
	const bbox = tilebelt.tileToBBOX(tilebelt.pointToTile(lng, lat, zoom));

	const url = getTileUrl(lng, lat, zoom, tileUrl);

	// クリックしたタイルの色を取得
	const [r, g, b, a] = await getPixelColor(lng, lat, bbox, url);

	// 透明色の場合は処理を終了
	if (a === 0) return;

	return [r, g, b, a];
	// 省略
};
