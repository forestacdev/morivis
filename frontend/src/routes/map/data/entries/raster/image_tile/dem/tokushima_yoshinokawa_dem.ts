import { TOKUSHIMA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterDemStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'tokushima_yoshinokawa_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/dem_116_2025/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '吉野川森林計画区 数値標高データ',
		sourceDataName: 'DEMラスタタイル-PNG標高タイルXYZ',
		description:
			'吉野川森林計画区の標高値をPNG標高タイルで配信したデータ。標高値の参照や地形表現の基盤として利用できる。',
		attribution: '徳島県_林野庁加工',
		location: '徳島県',
		tags: ['DEM', '地形'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: TOKUSHIMA_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/yoshinokawa_116',
		xyzImageTile: { x: 57219, y: 26188, z: 16 }
	},
	interaction: { clickable: true },
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'gsi',
			uniformsData: {
				...DEFAULT_RASTER_DEM_STYLE.visualization.uniformsData,
				relief: { type: 'linear', max: 1500, min: 0, colorMap: 'jet' }
			}
		}
	}
};

export default entry;
