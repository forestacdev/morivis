import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import legend from './_legends/bgr_germany_geology_1000';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'bgr_germany_geology_1000',
	type: 'raster',
	format: {
		type: 'image',
		// キャッシュタイルのない公式配信から地質図を取得する。
		url: 'https://services.bgr.de/arcgis/rest/services/geologie/gk1000/MapServer/export?f=image&bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&layers=show:0,1,2,3'
	},
	metaData: {
		name: 'ドイツ 全国地質図（BGR・100万分の1）',
		sourceDataName:
			'BGR / Geological Map of the Federal Republic of Germany 1:1,000,000 (GK1000)',
		description:
			'ドイツと周辺地域の地質を100万分の1で表した地質図。地層・岩石の分布、地質境界や構造線を確認するために利用できる。',
		attribution: 'Datenquelle: GK1000, © BGR, Hannover (2026)',
		location: '世界',
		tags: ['地質図'],
		// 配信の縮尺制限によりz8以下・z11以上は透明。z10を超える拡大はoverzoomする。
		minZoom: 9,
		maxZoom: 10,
		tileSize: 256,
		// fullExtent（EPSG:25832）の辺を分割してWGS84へ変換した外接範囲。
		bounds: [5.384608, 47.065593, 15.776312, 55.171847],
		downloadUrl: 'https://services.bgr.de/arcgis/rest/services/geologie/gk1000/MapServer',
		xyzImageTile: { x: 270, y: 170, z: 9 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'linear',
		legend
	}
};

export default entry;
