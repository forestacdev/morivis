import { OKAYAMA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ffpri_cs_okayama',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www2.ffpri.go.jp/soilmap/tile/cs_okayama/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '岡山県 CS立体図',
		sourceDataName: '林野庁航空レーザ計測成果・0.5m DEM',
		description:
			'2018年9月～2019年1月に取得された航空レーザ計測データの0.5m DEMから作成した、岡山県のCS立体図。計測範囲内の尾根や谷などの地形判読に利用できる。',
		attribution: '森林総研・森林土壌デジタルマップ',
		location: '岡山県',
		tags: ['地形', '微地形図', '森林'],
		minZoom: 1,
		maxZoom: 17,
		tileSize: 256,
		bounds: [133.16755295392784, 34.40173245021177, 134.05131253502083, 35.23651460032377],
		downloadUrl: 'https://www2.ffpri.go.jp/soilmap/data-src.html',
		xyzImageTile: { x: 891, y: 406, z: 10 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
