import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// WMTS GetCapabilitiesで配信を確認した年。新しい年は配信開始を確認して追加する。
const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'deafrica_sentinel2_geomad',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://ows.digitalearth.africa/?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=gm_s2_annual&STYLE=simple_rgb&FORMAT=image/png&TILEMATRIXSET=WholeWorld_WebMercator&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&TIME={morivis:dimension}'
	},
	metaData: {
		name: 'アフリカ Sentinel-2衛星画像（DE Africa・年別）',
		sourceDataName: 'Digital Earth Africa / Sentinel-2 Annual GeoMAD',
		description:
			'Sentinel-2の観測を年ごとに合成した、アフリカ各国の解像度10mの衛星画像。ズーム7以上で2017〜2025年を切り替え、土地被覆や市街地の変化を確認できる。',
		attribution:
			'Digital Earth Africa (CC BY 4.0) / Contains modified Copernicus Sentinel data (2017–2025), processed by Digital Earth Africa',
		location: '世界',
		tags: ['写真', '背景地図'],
		// 配信仕様はズーム0からだが、広域タイルの生成が遅いためリクエストを抑える。
		minZoom: 7,
		maxZoom: 14,
		tileSize: 256,
		// WMTS GetCapabilitiesの対象レイヤーが示す範囲。
		bounds: [-27.85888307654, -48.3104217167035, 65.6673672518444, 38.9988828990038],
		downloadUrl: 'https://docs.digitalearthafrica.org/en/latest/data_specs/GeoMAD_specs.html',
		xyzImageTile: { x: 2257, y: 2458, z: 12 }
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
