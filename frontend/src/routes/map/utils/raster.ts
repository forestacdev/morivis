import { PMTiles } from 'pmtiles';
import type {
	TileSize,
	ZoomLevel,
	CategoryLegend,
	RasterFormatType,
	RasterBaseMapStyle
} from '$routes/map/data/types/raster';
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
				// TODO blobobject URL を使用しても良いかもしれない
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

/**
 * MapLibreのラスタープロパティをCSSスタイルに変換する関数
 * @param rasterStyle - MapLibreのラスタースタイル設定
 * @returns CSSスタイルオブジェクト
 */
export function rasterToCSSStyle(rasterStyle: RasterStylePresetParameters): {
	filter: string;
} {
	const { hueRotate, brightnessMin, brightnessMax, saturation, contrast } = rasterStyle;

	// ネガポジの特別処理
	if (brightnessMin === 1 && brightnessMax === 0) {
		return {
			filter: 'invert(1)'
		};
	}

	// 通常の処理
	const brightness = brightnessMax;
	const cssSaturation = saturation + 1;
	const cssContrast = contrast + 1;

	const filters: string[] = [];

	if (hueRotate !== 0) {
		filters.push(`hue-rotate(${hueRotate}deg)`);
	}

	if (brightness !== 1) {
		filters.push(`brightness(${brightness})`);
	}

	if (cssSaturation !== 1) {
		filters.push(`saturate(${cssSaturation})`);
	}

	if (cssContrast !== 1) {
		filters.push(`contrast(${cssContrast})`);
	}

	return {
		filter: filters.length > 0 ? filters.join(' ') : 'none'
	};
}

/**
 * CSSクラス文字列を生成する関数
 * @param rasterStyle - MapLibreのラスタースタイル設定
 * @returns CSS文字列
 */
export function rasterToCSSString(rasterStyle: RasterBaseMapStyle): string {
	const cssStyle = rasterToCSSStyle(rasterStyle);

	let cssString = '';

	if (cssStyle.filter && cssStyle.filter !== 'none') {
		cssString += `filter: ${cssStyle.filter};`;
	}

	return cssString;
}

/**
 * 事前定義されたスタイルプリセット
 */
export type RasterStylePreset =
	| 'default'
	| 'sepia'
	| 'grayscale'
	| 'vintage'
	| 'cool'
	| 'warm'
	| 'vivid'
	| 'soft'
	| 'dramatic'
	| 'night'
	| 'sunset'
	| 'blueprint'
	| 'negative';

export interface RasterStylePresetParameters {
	hueRotate: number;
	brightnessMin: number;
	brightnessMax: number;
	saturation: number;
	contrast: number;
}

/**
 * プリセットスタイル定義
 */
export const RASTER_STYLE_PRESETS: Record<RasterStylePreset, RasterStylePresetParameters> = {
	// デフォルト（変更なし）
	default: {
		hueRotate: 0,
		brightnessMin: 0,
		brightnessMax: 1,
		saturation: 0,
		contrast: 0
	},

	// セピア調（古い写真風）
	sepia: {
		hueRotate: 35,
		brightnessMin: 0.1,
		brightnessMax: 0.9,
		saturation: -0.3,
		contrast: 0.2
	},

	// グレースケール（白黒）
	grayscale: {
		hueRotate: 0,
		brightnessMin: 0,
		brightnessMax: 1,
		saturation: -1,
		contrast: 0.1
	},

	// ビンテージ（レトロ風）
	vintage: {
		hueRotate: 20,
		brightnessMin: 0.2,
		brightnessMax: 0.8,
		saturation: -0.2,
		contrast: 0.3
	},

	// クール（青みがかった）
	cool: {
		hueRotate: 180,
		brightnessMin: 0.1,
		brightnessMax: 1,
		saturation: 0.2,
		contrast: 0.1
	},

	// ウォーム（暖色系）
	warm: {
		hueRotate: 30,
		brightnessMin: 0.1,
		brightnessMax: 1,
		saturation: 0.3,
		contrast: 0.2
	},

	// ビビッド（鮮やか）
	vivid: {
		hueRotate: 0,
		brightnessMin: 0.1,
		brightnessMax: 1,
		saturation: 0.5,
		contrast: 0.4
	},

	// ソフト（柔らかい）
	soft: {
		hueRotate: 0,
		brightnessMin: 0.2,
		brightnessMax: 0.9,
		saturation: -0.1,
		contrast: -0.2
	},

	// ドラマチック（高コントラスト）
	dramatic: {
		hueRotate: 0,
		brightnessMin: 0,
		brightnessMax: 1,
		saturation: 0.2,
		contrast: 0.6
	},

	// ナイト（夜のような暗い雰囲気）
	night: {
		hueRotate: 240,
		brightnessMin: 0,
		brightnessMax: 0.6,
		saturation: -0.3,
		contrast: 0.3
	},

	// サンセット（夕日のような）
	sunset: {
		hueRotate: 15,
		brightnessMin: 0.3,
		brightnessMax: 0.9,
		saturation: 0.4,
		contrast: 0.2
	},

	// ブループリント（青写真風）
	blueprint: {
		hueRotate: 200,
		brightnessMin: 0.2,
		brightnessMax: 0.8,
		saturation: 0.3,
		contrast: 0.5
	},

	// ネガポジ
	negative: {
		hueRotate: 0,
		brightnessMin: 1,
		brightnessMax: 0,
		saturation: 0,
		contrast: 0
	}
};

/**
 * プリセット名からラスタースタイルを取得する関数
 * @param preset - プリセット名
 * @returns ラスタースタイル
 */
export function getRasterStylePreset(preset: RasterStylePreset): RasterStylePresetParameters {
	return RASTER_STYLE_PRESETS[preset];
}

/**
 * プリセット名からCSSスタイルを直接取得する関数
 * @param preset - プリセット名
 * @returns CSSスタイルオブジェクト
 */
export function getPresetCSSStyle(preset: RasterStylePreset): {
	filter: string;
} {
	return rasterToCSSStyle(getRasterStylePreset(preset));
}
