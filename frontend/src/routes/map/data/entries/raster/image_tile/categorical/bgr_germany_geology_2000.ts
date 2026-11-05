import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import legend from './_legends/bgr_germany_geology_2000';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'bgr_germany_geology_2000',
	type: 'raster',
	format: {
		type: 'image',
		// キャッシュタイルのない公式配信から地質図を取得する。
		url: 'https://services.bgr.de/arcgis/rest/services/geologie/gk2000/MapServer/export?f=image&bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&layers=show:0,1,2,3,4'
	},
	metaData: {
		name: 'ドイツ 全国地質図（BGR・200万分の1）',
		sourceDataName:
			'BGR / Geoscientific Map of the Federal Republic of Germany 1:2,000,000 - Geology (GK2000 Geologie)',
		description:
			'ドイツと周辺地域の地表付近の地質を200万分の1で表した地質図。地質年代ごとの分布、地質構造や氷床の縁を広域で確認するために利用できる。',
		attribution: 'Datenquelle: GK2000 Geologie, © BGR, Hannover (2026)',
		location: '世界',
		tags: ['地質図'],
		// 配信側の縮尺制限はない。maxZoomを超える拡大はoverzoomする。
		minZoom: 0,
		maxZoom: 14,
		tileSize: 256,
		// fullExtent（EPSG:25832）の辺を分割してWGS84へ変換した外接範囲。
		bounds: [4.954325, 46.970448, 16.308413, 55.190016],
		downloadUrl: 'https://services.bgr.de/arcgis/rest/services/geologie/gk2000/MapServer',
		xyzImageTile: { x: 33, y: 21, z: 6 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'linear',
		legend
	}
};

export default entry;
