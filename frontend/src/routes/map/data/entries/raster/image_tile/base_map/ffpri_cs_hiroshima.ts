import { HIROSHIMA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ffpri_cs_hiroshima',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www2.ffpri.go.jp/soilmap/tile/cs_hiroshima/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '広島県 CS立体図（森林総研）',
		sourceDataName: '林野庁航空レーザ計測成果・0.5m DEM',
		description:
			'2018年9月～2019年1月に取得された航空レーザ計測データの0.5m DEMから作成した、広島県のCS立体図。計測範囲内の尾根や谷などの地形判読に利用できる。',
		attribution: '森林総研・森林土壌デジタルマップ',
		location: '広島県',
		tags: ['地形', '微地形図', '森林'],
		minZoom: 1,
		maxZoom: 17,
		tileSize: 256,
		bounds: HIROSHIMA_BBOX,
		downloadUrl: 'https://www2.ffpri.go.jp/soilmap/data-src.html',
		xyzImageTile: { x: 888, y: 408, z: 10 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
