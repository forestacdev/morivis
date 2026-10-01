import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import legend from './_legends/geosphere_austria_geology_500';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'geosphere_austria_geology_500',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://gis.geosphere.at/maps/rest/services/geologie/karte_500/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: 'オーストリア 全国地質図（50万分の1）',
		sourceDataName: 'GeoSphere Austria / Geologische Basiskarte Österreich 1:500.000 (1997)',
		description:
			'1997年の地質情報を基に作成された、オーストリアの50万分の1地質図。岩石・地層の分布や地質構造を全国範囲で確認するために利用できる。',
		attribution: '© GeoSphere Austria',
		location: '世界',
		tags: ['地質図'],
		minZoom: 4,
		maxZoom: 12,
		tileSize: 256,
		bounds: [8.929691, 45.415079, 17.741731, 49.602938],
		downloadUrl: 'https://gis.geosphere.at/maps/rest/services/geologie/karte_500/MapServer',
		xyzImageTile: { x: 137, y: 89, z: 8 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend
	}
};

export default entry;
