import * as tilebelt from '@mapbox/tilebelt';

import type { TileXYZ } from '$routes/map/data/types/raster';
import type { BBox } from '$routes/map/utils/map/bbox';

/**
 * bboxの中心に最も近い、bboxより小さいタイル座標を求める。
 * ズームレベルを上げていき、タイルがbboxより小さくなった最初のタイルを返す。
 * @param bbox - データのbbox [west, south, east, north]
 * @param maxZoom - 探索する最大ズームレベル（デフォルト: 18）
 */
export const findCenterTile = (bbox: BBox, maxZoom: number = 18): TileXYZ => {
	const centerLon = (bbox[0] + bbox[2]) / 2;
	const centerLat = (bbox[1] + bbox[3]) / 2;
	const bboxW = bbox[2] - bbox[0];
	const bboxH = bbox[3] - bbox[1];

	for (let z = 0; z <= maxZoom; z++) {
		const tile = tilebelt.pointToTile(centerLon, centerLat, z) as [number, number, number];
		const tileBbox = tilebelt.tileToBBOX(tile) as unknown as BBox;
		const tileW = tileBbox[2] - tileBbox[0];
		const tileH = tileBbox[3] - tileBbox[1];

		if (tileW < bboxW && tileH < bboxH) {
			return { x: tile[0], y: tile[1], z: tile[2] as TileXYZ['z'] };
		}
	}

	// maxZoomでも小さくならない場合はmaxZoomの中心タイルを返す
	const tile = tilebelt.pointToTile(centerLon, centerLat, maxZoom) as [number, number, number];
	return { x: tile[0], y: tile[1], z: tile[2] as TileXYZ['z'] };
};
