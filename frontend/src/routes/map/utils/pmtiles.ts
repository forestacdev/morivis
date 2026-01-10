import { PMTiles } from 'pmtiles';
import Pbf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import type { FeatureProp } from '$routes/map/types/properties';

interface Tile {
	z: number;
	x: number;
	y: number;
}

export const getPropertiesFromPMTiles = async (
	url: string,
	{ z, x, y }: Tile,
	layerName: string,
	featureId: number
): Promise<FeatureProp | null> => {
	const pmtiles = new PMTiles(url);
	const tileData = await pmtiles.getZxy(z, x, y);

	if (!tileData || !tileData.data) throw new Error('タイル取得失敗');

	const vt = new VectorTile(new Pbf(tileData.data));
	const layer = vt.layers[layerName];

	if (!layer) throw new Error('指定レイヤが存在しません');

	for (let i = 0; i < layer.length; i++) {
		const feature = layer.feature(i);

		if (feature.id === featureId) {
			const props = feature.properties;

			return props;
		}
	}

	console.warn('⚠️ 該当 feature_id が見つかりません');
	return null;
};
