import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// WMTS GetCapabilitiesで配信を確認した年。新しい年は配信開始を確認して追加する。
const years = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'dea_australia_landsat_geomad',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://ows.dea.ga.gov.au/?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ga_ls8cls9c_gm_cyear_3&STYLE=simple_rgb&FORMAT=image/png&TILEMATRIXSET=WholeWorld_WebMercator&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&TIME={morivis:dimension}'
	},
	metaData: {
		name: 'オーストラリア Landsat衛星画像（DEA・年別）',
		sourceDataName: 'Digital Earth Australia / Landsat 8・9 GeoMAD',
		description:
			'Landsat 8・9の観測を年ごとに合成した、オーストラリアの解像度30mの衛星画像。2013〜2025年を切り替え、土地被覆や市街地の変化を確認できる。',
		attribution:
			'© Commonwealth of Australia (Geoscience Australia), CC BY 4.0 / Landsat: USGS',
		location: '世界',
		tags: ['写真', '背景地図'],
		minZoom: 0,
		maxZoom: 14,
		tileSize: 256,
		// WMTS GetCapabilitiesの対象レイヤーが示す範囲。
		bounds: [111.533088723661, -44.3403132062909, 155.073704691127, -8.51120628432547],
		downloadUrl:
			'https://knowledge.dea.ga.gov.au/data/product/dea-geometric-median-and-median-absolute-deviation-landsat/',
		xyzImageTile: { x: 1884, y: 1228, z: 11 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	state: {
		dimension: { currentIndex: years.length - 1 }
	},
	properties: {
		temporal: {
			dimension: {
				type: 'time',
				values: years.map((year) => `${year}-01-01`),
				labels: years.map((year) => `${year}年`)
			},
			behaviors: [{ type: 'source' }]
		}
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
