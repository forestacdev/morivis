import type { DemEntry } from '$lib/data/types';

const rasterPaint = {
	'raster-saturation': 0,
	'raster-hue-rotate': 0,
	'raster-brightness-min': 0,
	'raster-brightness-max': 1,
	'raster-contrast': 0
};

const demEntries: DemEntry[] = [
	{
		id: 'custom-gsi-dem',
		name: '地理院標高タイル',
		dataType: 'raster',
		geometryType: 'dem',
		protocolKey: 'customgsidem',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png',
		sourceMaxZoom: 14,
		sourceMinZoom: 1,
		opacity: 1,
		attribution: '国土地理院',
		location: ['全国'],
		visible: true,
		clickable: false,
		styleKey: 'デフォルト',
		style: {
			raster: [
				{
					name: 'デフォルト',
					paint: rasterPaint
				}
			]
		}
	},
	{
		id: 'custom-rgb-dem',
		name: '標高タイル',
		dataType: 'raster',
		geometryType: 'dem',
		protocolKey: 'customrgbdem',
		url: 'https://raw.githubusercontent.com/forestacdev/mino-terrain-rgb-poc/main/tiles/{z}/{x}/{y}.png',
		sourceMaxZoom: 14,
		sourceMinZoom: 8,
		opacity: 1,
		attribution: '国土数値情報の加工',
		location: ['美濃市'],
		visible: true,
		clickable: false,
		styleKey: 'デフォルト',
		style: {
			raster: [
				{
					name: 'デフォルト',
					paint: rasterPaint
				}
			]
		}
	}
];

demEntries.forEach((entry) => {
	entry.url = `${entry.protocolKey}://${entry.url}`;
});

export { demEntries };
