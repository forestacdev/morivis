import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/meta_data/bounds';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_CATEGORICAL_STYLE
} from '$routes/map/data/entries/raster/style';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ecoris_vege_6',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://map.ecoris.info/tiles/vege67/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '全国植生図',
		sourceDataName: '第6～7回 自然環境保全基礎調査 植生調査結果GISデータ',
		attribution: 'エコリス地図タイル',
		downloadUrl: 'https://map.ecoris.info/#contents',
		location: '全国',
		minZoom: 5,
		maxZoom: 15,
		tileSize: 256,
		tags: ['植生図'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: {
			x: 7211,
			y: 3229,
			z: 13
		}
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: {
			type: 'category',
			name: '植生',
			colors: [
				'#fdf1ce',
				'#997f60',
				'#a58f74',
				'#178017',
				'#5b9700',
				'#003300',
				'#004a00',
				'#ffff00',
				'#697720',
				'#8cd27d',
				'#868585',
				'#99ffff',
				'#cccc20',
				'#69ff00',
				'#999662'
			],
			labels: [
				'高山帯自然植生',
				'コケモモートウヒクラス域自然植生',
				'コケモモートウヒクラス域代償植生',
				'ブナクラス域自然植生',
				'ブナクラス域代償植生',
				'ヤブツバキクラス域自然植生',
				'ヤブツバキクラス域代償植生',
				'河川・湿原・沼沢地・砂丘植生',
				'植林地',
				'耕作地',
				'市街地',
				'開放水域',
				'竹林',
				'牧草地・ゴルフ場・芝地',
				'水田以外の耕作地'
			]
		}
	}
};

export default entry;
