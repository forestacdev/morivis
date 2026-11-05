import type { TileSize } from '$routes/map/data/types/raster';
import { MAPTERHORN_DEM_SOURCE } from '$routes/map/utils/contours/config';
import { getPixelColor } from '$routes/map/utils/raster/tile-query';
import chroma from 'chroma-js';

/** 表示ズームに依存せず、Terrariumタイルの標高をメートルで取得する。 */
export const getMapterhornElevation = async (lng: number, lat: number): Promise<number | null> => {
	// 詳細タイルがない地域は、全世界を収録したz12まで親タイルを試す。
	for (const zoom of [16, 15, 14, 13, 12] as const) {
		const color = await getPixelColor(
			MAPTERHORN_DEM_SOURCE.tiles[0],
			{ lng, lat },
			zoom,
			MAPTERHORN_DEM_SOURCE.tileSize as TileSize,
			'image'
		);
		if (color === null) continue;

		const [r, g, b] = chroma(color).rgb();
		return r * 256 + g + b / 256 - 32768;
	}
	return null;
};
