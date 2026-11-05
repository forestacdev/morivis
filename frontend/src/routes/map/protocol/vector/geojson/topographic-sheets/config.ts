// 地理院地図 GSI.TGrid の図郭切替に合わせる。maxzoom は排他的。
export const TOPOGRAPHIC_SHEET_SCALES = [
	{ scale: 200000, minzoom: 5, maxzoom: 9, nativeZoom: 8, tileMaxZoom: 8, color: '#e14900' },
	{ scale: 50000, minzoom: 9, maxzoom: 11, nativeZoom: 10, tileMaxZoom: 10, color: '#3388ff' },
	{ scale: 25000, minzoom: 11, maxzoom: 24, nativeZoom: 8, tileMaxZoom: 18, color: '#ff0000' }
] as const;

export type SheetScale = typeof TOPOGRAPHIC_SHEET_SCALES[number]['scale'];
