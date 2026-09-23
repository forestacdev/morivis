export const PLANE_GRID_LEVELS = [
	{ spacing: 100000, minzoom: 0, maxzoom: 8 },
	{ spacing: 10000, minzoom: 8, maxzoom: 11 },
	{ spacing: 1000, minzoom: 11, maxzoom: 14 },
	{ spacing: 500, minzoom: 14, maxzoom: 16 },
	{ spacing: 100, minzoom: 16, maxzoom: 18 },
	{ spacing: 50, minzoom: 18, maxzoom: 20 },
	{ spacing: 10, minzoom: 20, maxzoom: 24 }
] as const;

// 日本周辺の描画範囲。各系の行政上の適用区域を表す境界ではない。
export const PLANE_GRID_BOUNDS: [number, number, number, number] = [122, 18, 156, 46];
