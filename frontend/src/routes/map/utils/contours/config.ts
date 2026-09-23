import type { RasterDEMSourceSpecification } from '$routes/map/utils/maplibre';

export const MAPTERHORN_DEM_SOURCE = {
	type: 'raster-dem',
	tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
	maxzoom: 16,
	tileSize: 512,
	encoding: 'terrarium',
	attribution: '<a href="https://mapterhorn.com/attribution">© Mapterhorn</a>'
} satisfies RasterDEMSourceSpecification;

export const CONTOUR_MIN_ZOOM = 5;
export const CONTOUR_MAX_ZOOM = 16;
export const CONTOUR_OPTIONS = {
	thresholds: {
		5: [1000, 1000],
		7: [500, 500],
		9: [100, 100],
		11: [50, 50],
		14: [10, 50]
	},
	// 512px DEMの各象限を利用し、隣接タイルの取得と計算量を抑える。
	overzoom: 1,
	contourLayer: 'contours',
	elevationKey: 'ele',
	levelKey: 'level',
	multiplier: 1
};
