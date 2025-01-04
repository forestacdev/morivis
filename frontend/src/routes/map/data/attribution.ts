export type AttributionKey =
	| '森林文化アカデミー'
	| '国土地理院'
	| '岐阜県森林研究所'
	| 'エコリス地図タイル'
	| '産総研地質調査総合センター'
	| 'Q地図タイル'
	| 'OSM'
	| 'Esri';

export type Attribution = {
	key: AttributionKey;
	name: string;
	url: string;
};

const attributionData: Attribution[] = [
	{
		key: '森林文化アカデミー',
		name: '森林文化アカデミー',
		url: 'https://www.forest.ac.jp/'
	},
	{
		key: '国土地理院',
		name: '国土地理院',
		url: 'http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html'
	},
	{
		key: '岐阜県森林研究所',
		name: '岐阜県森林研究所',
		url: 'https://www.forest.rd.pref.gifu.lg.jp/index.html'
	},
	{
		key: 'エコリス地図タイル',
		name: 'エコリス地図タイル',
		url: 'https://map.ecoris.info/#contents'
	},
	{
		key: '産総研地質調査総合センター',
		name: '産総研地質調査総合センター',
		url: 'https://gbank.gsj.jp/seamless/index.html?lang=ja&'
	},
	{
		key: 'Q地図タイル',
		name: 'Q地図タイル',
		url: 'https://info.qchizu.xyz/qchizu/reprint/'
	},
	{
		key: 'OSM',
		name: '&copy; OpenStreetMap contributors',
		url: 'http://osm.org/copyright'
	},
	{
		key: 'Esri',
		name: 'Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, © OpenStreetMap contributors, and the GIS User Community',
		url: ''
	}
];

// Map を作成
export const attributionMap: Map<string, Attribution> = new Map(
	attributionData.map((entry) => [entry.key, entry])
);
