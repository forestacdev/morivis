import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import legend from './_legends/bgr_germany_geology_250';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'bgr_germany_geology_250',
	type: 'raster',
	format: {
		type: 'image',
		// キャッシュタイルのない配信。地質年代の基本層・被覆層と地質構造だけを指定する。
		url: 'https://services.bgr.de/arcgis/rest/services/geologie/guek250/MapServer/export?f=image&bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&layers=show:0,1,2,4,5'
	},
	metaData: {
		name: 'ドイツ 全国地質図（BGR・25万分の1）',
		sourceDataName:
			'BGR / Geologische Übersichtskarte der Bundesrepublik Deutschland 1:250.000 (GÜK250)',
		description:
			'ドイツ全国の地表付近の地質を、地質年代ごとに色分けした25万分の1地質図。地層の分布、被覆層、断層・石英脈・氷床の縁の位置を確認するために利用できる。',
		attribution: 'Datenquelle: GÜK250, © BGR, Hannover (2026)',
		location: '世界',
		tags: ['地質図'],
		// 配信レイヤーの縮尺制限に対応。z9以下は透明画像になる。
		minZoom: 10,
		maxZoom: 14,
		tileSize: 256,
		// 配信元のfullExtent（EPSG:25832）をWGS84へ変換した外接範囲。
		bounds: [5.562777, 47.141228, 15.575523, 55.085091],
		downloadUrl: 'https://services.bgr.de/arcgis/rest/services/geologie/guek250/MapServer',
		xyzImageTile: { x: 2167, y: 1357, z: 12 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend
	}
};

export default entry;
