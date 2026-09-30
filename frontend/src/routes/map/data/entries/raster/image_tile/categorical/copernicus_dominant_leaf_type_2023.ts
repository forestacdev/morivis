import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'copernicus_dominant_leaf_type_2023',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://land.copernicus.eu/cdse/dlt_europe_10m_yearly?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=Dominant%20Leaf%20Type&STYLE=default&FORMAT=image/png&TILEMATRIXSET=PopularWebMercator256&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}&TIME=2023-01-01/2023-12-31'
	},
	metaData: {
		name: '欧州 広葉樹・針葉樹分類図（Copernicus 2023）',
		sourceDataName: 'Copernicus Land Monitoring Service / Dominant Leaf Type 2023 10m',
		description:
			'2023年の欧州の樹木被覆域を、広葉樹・針葉樹の優占区分で表した10m格子のデータ。広葉樹と針葉樹の分布を確認でき、非樹木被覆域と欠測域は透明で表示される。',
		attribution:
			'© European Union, Copernicus Land Monitoring Service 2023 / European Environment Agency',
		location: '世界',
		tags: ['森林', '植生図', '10m解像度'],
		// 配信元は1600m/pixelを超えるリクエストを拒否する。z7なら赤道付近でも制限内。
		minZoom: 7,
		// 元データの10m解像度に合わせ、これ以上の拡大ではタイルを拡大表示する。
		maxZoom: 14,
		tileSize: 256,
		// WMTSのWGS84BoundingBox。フランス海外領土を含む。
		bounds: [-61.814994, -21.394906, 55.841605, 72.215738],
		downloadUrl:
			'https://land.copernicus.eu/en/products/high-resolution-layer-forests-and-tree-cover/dominant-leaf-type-2018-present-raster-10-m-europe-yearly',
		xyzImageTile: { x: 534, y: 359, z: 10 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend: {
			type: 'category',
			name: '優占する葉の種類（非樹木被覆域・欠測域は透明）',
			// 公式描画定義の値1（広葉樹）・値2（針葉樹）の色。
			// https://github.com/eu-cdse/sentinel-hub-custom-scripts/blob/main/clms/land-cover-and-land-use-mapping/tree-cover-and-forests/dominant-leaf-type/dominant-leaf-type/clms_vlcc_dominant-leaf-type_europe_10m_yearly_v1/scripts/dominant_leaf_type.js
			colors: ['#469e4a', '#1c5c24'],
			labels: ['広葉樹', '針葉樹']
		}
	}
};

export default entry;
