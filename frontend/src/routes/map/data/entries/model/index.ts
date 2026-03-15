import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import type { ModelTiles3DEntry, PointCloudStyle } from '$routes/map/data/types/model';

export const createTiles3DEntry = (
	name: string,
	url: string,
	bounds?: [number, number, number, number]
): ModelTiles3DEntry<PointCloudStyle> => ({
	id: '3dtiles_' + crypto.randomUUID(),
	type: 'model',
	format: {
		type: '3d-tiles',
		url
	},
	metaData: {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		bounds: bounds ?? WEB_MERCATOR_WORLD_BBOX
	},
	interaction: { clickable: false },
	style: {
		visible: true,
		type: 'point-cloud',
		opacity: 0.7,
		pointSize: 1
	}
});
