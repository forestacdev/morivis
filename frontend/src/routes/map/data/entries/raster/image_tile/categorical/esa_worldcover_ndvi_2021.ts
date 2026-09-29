import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'esa_worldcover_ndvi_2021',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://wmts.terrascope.be/?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=esa-worldcover-ndvi-10m-2021-v2_ndvi&STYLE=default&FORMAT=image/png&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&TIME=2021-01-01'
	},
	metaData: {
		name: '世界 NDVI年間合成（WorldCover 2021）',
		sourceDataName: 'ESA WorldCover 2021 / Sentinel-2 NDVI Annual Composite / Terrascope',
		description:
			'2021年のNDVIの年間90・50・10パーセンタイル値を、それぞれ赤・緑・青に割り当てた10m格子の合成画像。年間を通した植生の状態や季節変動の違いを確認するために利用できる。',
		attribution:
			'© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium / CC BY 4.0',
		location: '世界',
		tags: ['植生図', '10m解像度'],
		minZoom: 8,
		maxZoom: 14,
		tileSize: 256,
		bounds: [-180, -60, 180, 83],
		downloadUrl: 'https://esa-worldcover.org/en/data-access',
		xyzImageTile: { x: 898, y: 405, z: 10 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		// 配信画像は3バンドのRGB合成。単一のNDVI値に対応する色尺度ではない。
		legend: {
			type: 'category',
			name: 'RGB各成分に割り当てたNDVI',
			colors: ['#ff0000', '#00ff00', '#0000ff'],
			labels: [
				'赤成分：年間90パーセンタイル',
				'緑成分：年間中央値（50パーセンタイル）',
				'青成分：年間10パーセンタイル'
			]
		}
	}
};

export default entry;
