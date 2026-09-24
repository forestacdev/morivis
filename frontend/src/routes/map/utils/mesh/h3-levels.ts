// maxzoom は上限を含まない。解像度15でH3の最小区画に到達する。
export const H3_LEVELS = [0, 3, 4, 6, 7, 9, 10, 11, 13, 14, 16, 17, 18, 20, 21, 22].map(
	(minzoom, resolution, zooms) => ({ resolution, minzoom, maxzoom: zooms[resolution + 1] ?? 24 })
);
