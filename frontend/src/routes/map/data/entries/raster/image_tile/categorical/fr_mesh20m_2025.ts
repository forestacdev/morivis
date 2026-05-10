import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'fr_mesh20m_2025',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/fr_mesh20m_webp_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '森林樹種メッシュ',
		sourceDataName: '全国森林資源メッシュマップ',
		description:
			'森林GISフォーラムが運用する‟森林資源データ解析・管理標準仕様書ver.3.0”に則し作成したデータで、20mメッシュ単位で次に記載する森林資源量を集計しています。',
		attribution: '林野庁',
		location: '全国',
		tags: ['森林', 'メッシュ', '樹種'],
		minZoom: 5,
		maxZoom: 16,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/mesh_tile',
		xyzImageTile: { x: 28850, y: 12916, z: 15 }
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'categorical',
		opacity: 0.7,
		resampling: 'nearest',
		legend: {
			type: 'category',
			name: '樹種',
			colors: [
				'rgb(255, 75, 0)',
				'rgb(77, 196, 255)',
				'rgb(137, 250, 194)',
				'rgb(0, 90, 255)',
				'rgb(255, 153, 51)',
				'rgb(137, 250, 194)',
				'rgb(255, 255, 0)',
				'rgb(0, 0, 0)',
				'rgb(3, 175, 122)',
				'rgb(255, 202, 191)',
				'rgb(191, 191, 191)',
				'rgb(191, 191, 191)',
				'rgb(191, 191, 191)',
				'rgb(191, 191, 191)'
			],
			labels: [
				'スギ',
				'ヒノキ類',
				'マツ類',
				'カラマツ',
				'トドマツ',
				'エゾマツ',
				'ヒバ',
				'その他針葉樹',
				'広葉樹',
				'タケ',
				'針広混交林',
				'新植地',
				'伐採跡地',
				'その他'
			]
		}
	}
};

export default entry;
