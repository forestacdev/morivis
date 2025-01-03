import type { RasterEntry } from '$map/data/types/raster';

export const imageTileEntry: RasterEntry[] = [
	{
		id: 'gsi_std',
		type: 'raster',
		format: {
			type: 'image',
			url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
		},
		metaData: {
			name: '地理院標準地図', // 名前
			description: '地理院標準地図', // 説明
			attribution: '国土地理院', // データの出典
			location: '全国',
			minZoom: 1, // 表示するズームレベルの最小値
			maxZoom: 18, // 表示するズームレベルの最大値
			xyzImageTile: null,
			bounds: null // データの範囲
		},
		interaction: {
			// インタラクションの設定
			clickable: true,
			overlay: false,
			legend: null
		},
		style: {
			opacity: 1.0,
			hueRotate: 0,
			brightnessMin: 0,
			brightnessMax: 1,
			saturation: 0,
			contrast: 0,
			raster: {
				paint: {},
				layout: {}
			}
		},
		debug: false,
		extension: {}
	}
];
