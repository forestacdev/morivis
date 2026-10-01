import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'usgs_shaded_relief',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: '米国・世界 地形陰影図（USGS・広域）',
		sourceDataName: 'USGS The National Map / GMTED2010',
		description:
			'GMTED2010を基に作成された、米国を含む世界の広域地形陰影図。山地や平野の分布を確認する際の背景として利用できる。',
		attribution: 'USGS The National Map / USGS EROS: GMTED2010',
		location: '世界',
		tags: ['地形', '背景地図'],
		minZoom: 1,
		// 2026-09-30確認: z9以降は複数地域でタイル欠損。連続して取得できる広域キャッシュまで使用。
		maxZoom: 8,
		tileSize: 256,
		bounds: [-180, -85.051128, 180, 83.999861],
		downloadUrl:
			'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer',
		xyzImageTile: { x: 26, y: 48, z: 7 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
