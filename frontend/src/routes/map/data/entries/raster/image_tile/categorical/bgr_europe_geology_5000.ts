import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import legend from './_legends/bgr_europe_geology_5000';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'bgr_europe_geology_5000',
	type: 'raster',
	format: {
		type: 'image',
		// 地質年代と断層を表示。岩相の別配色レイヤーは重ねない。
		url: 'https://services.bgr.de/arcgis/rest/services/inspire_ge/igme5000eu/MapServer/export?f=image&bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&layers=show:1,3'
	},
	metaData: {
		name: 'ヨーロッパ 国際地質図（BGR・500万分の1）',
		sourceDataName:
			'BGR / International Geological Map of Europe and Adjacent Areas 1:5,000,000 (IGME5000-EU, INSPIRE)',
		description:
			'ヨーロッパと周辺の陸域・海域の第四紀以前の基盤地質を500万分の1で表した地質図。地質年代や断層の分布を大陸規模で確認するために利用できる。',
		attribution: 'Datenquelle: IGME5000-EU (INSPIRE), © BGR, Hannover (2026)',
		location: '世界',
		tags: ['地質図'],
		// 配信側の縮尺制限はない。maxZoomを超える拡大はoverzoomする。
		minZoom: 0,
		maxZoom: 12,
		tileSize: 256,
		// 公式WMSメタデータの地理的範囲（IGME5000-EU）。
		bounds: [-11, 34, 63, 80],
		downloadUrl: 'https://services.bgr.de/arcgis/rest/services/inspire_ge/igme5000eu/MapServer',
		xyzImageTile: { x: 8, y: 5, z: 4 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend
	}
};

export default entry;
