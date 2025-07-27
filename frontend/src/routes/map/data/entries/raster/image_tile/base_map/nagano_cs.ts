import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { NAGANO_BBOX } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'nagano_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tile.geospatial.jp/CS/VER2/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '長野県 CS立体図',
		description: `「CS立体図」は、長野県林業総合センターが考案した微地形表現図です。長野県林務部が平成25年～26年に実施した航空レーザ測量データによる0.5mメッシュDEMを使用して作成しました。（引用：G空間情報センター）`,
		attribution: '長野県林業総合センター',
		location: '長野県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['微地形図', '地形'],
		bounds: NAGANO_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/nagano-csmap',
		xyzImageTile: { x: 28950, y: 12852, z: 15 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
