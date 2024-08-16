import type { SourceSpecification } from 'maplibre-gl';

const backgroundSources: { [_: string]: SourceSpecification } = {
	'国土地理院 全国最新写真': {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: '地理院タイル'
	},
	'国土地理院 標準地図': {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: '地理院タイル'
	},
	'国土地理院 淡色地図': {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: '地理院タイル'
	},
	'国土地理院 白地図': {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: '地理院タイル'
	}
};

type LayerEntry = {
	id: string;
	name: string;
	type: 'xyz' | 'json';
	path: string;
	attribution: string;
	minzoom?: number;
	maxzoom?: number;
	opacity: number;

	visible: boolean;
	legendId?: string; // legends.ts のキーに対応
	remarks?: string; // 備考
};

type CategoryEntry = {
	categoryId: string;
	categoryName: string;
	layers: LayerEntry[];
};

const categoryEntries: CategoryEntry[] = [
	{
		categoryId: 'over-raster',
		categoryName: 'ラスター',
		layers: [
			{
				id: 'gazo4',
				name: '1987年-1990年',
				type: 'xyz',
				opacity: 0.7,
				path: 'https://cyberjapandata.gsi.go.jp/xyz/gazo4/{z}/{x}/{y}.jpg',
				attribution: '地理院タイル',
				visible: false
			},
			{
				id: 'gazo3',
				name: '1984年-1986年',
				type: 'xyz',
				opacity: 0.7,
				path: 'https://cyberjapandata.gsi.go.jp/xyz/gazo3/{z}/{x}/{y}.jpg',
				attribution: '地理院タイル',
				visible: false
			},
			{
				id: 'gazo2',
				name: '1979年-1983年',
				type: 'xyz',
				opacity: 0.7,
				path: 'https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg',
				attribution: '地理院タイル',
				visible: false
			},
			{
				id: 'gazo1',
				name: '1974年-1978年',
				type: 'xyz',
				opacity: 0.7,
				path: 'https://cyberjapandata.gsi.go.jp/xyz/gazo1/{z}/{x}/{y}.jpg',
				attribution: '地理院タイル',
				visible: false
			},
			{
				id: 'ort_old10',
				name: '1961年-1969年',
				type: 'xyz',
				opacity: 0.7,
				path: 'https://cyberjapandata.gsi.go.jp/xyz/ort_old10/{z}/{x}/{y}.png',
				attribution: '地理院タイル',
				visible: false
			},
			{
				id: 'ort_USA10',
				name: '1945年-1950年',
				type: 'xyz',
				opacity: 0.7,
				path: 'https://cyberjapandata.gsi.go.jp/xyz/ort_USA10/{z}/{x}/{y}.png',
				attribution: '地理院タイル',
				visible: false
			},
			{
				id: 'ort_riku10',
				name: '1936年-1942年',
				type: 'xyz',
				opacity: 0.7,
				path: 'https://cyberjapandata.gsi.go.jp/xyz/ort_riku10/{z}/{x}/{y}.png',
				attribution: '地理院タイル',
				visible: false
			},
			{
				id: 'ort_1928',
				name: '1928年頃',
				type: 'xyz',
				opacity: 0.7,
				path: 'https://cyberjapandata.gsi.go.jp/xyz/ort_1928/{z}/{x}/{y}.png',
				attribution: '地理院タイル',
				visible: false
			}
		]
	}
];

export { backgroundSources, categoryEntries };
export type { CategoryEntry, LayerEntry };
