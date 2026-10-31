import { KUMAMOTO_BBOX, OITA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ffpri_cs_kumamoto_oita',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www2.ffpri.go.jp/soilmap/tile/cs_kumamoto_oita/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '熊本県・大分県 CS立体図（森林総研）',
		sourceDataName: '林野庁航空レーザ計測成果・0.5m DEM',
		description:
			'2016年6月～9月に取得された航空レーザ計測データの0.5m DEMから作成した、熊本県・大分県のCS立体図。計測範囲内の尾根や谷などの地形判読に利用できる。',
		attribution: '森林総研・森林土壌デジタルマップ',
		location: 'その他',
		tags: ['地形', '微地形図', '森林'],
		minZoom: 1,
		maxZoom: 17,
		tileSize: 256,
		bounds: [
			Math.min(KUMAMOTO_BBOX[0], OITA_BBOX[0]),
			Math.min(KUMAMOTO_BBOX[1], OITA_BBOX[1]),
			Math.max(KUMAMOTO_BBOX[2], OITA_BBOX[2]),
			Math.max(KUMAMOTO_BBOX[3], OITA_BBOX[3])
		],
		downloadUrl: 'https://www2.ffpri.go.jp/soilmap/data-src.html',
		xyzImageTile: { x: 886, y: 411, z: 10 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
