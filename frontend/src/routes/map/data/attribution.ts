export type AttributionKey =
	| 'カスタムデータ'
	| '森林文化アカデミー'
	| '国土地理院'
	| '岐阜県森林研究所'
	| 'エコリス地図タイル'
	| '産総研地質調査総合センター'
	| '産総研シームレス標高タイル'
	| 'Q地図タイル'
	| 'OSM'
	| '株式会社アドイン研究所'
	| 'Esri'
	| '東京都オープンデータカタログサイト'
	| '環境省生物多様性センター'
	| '林野庁'
	| '森林総合研究所'
	| '愛媛県森林資源データ'
	| '栃木県森林資源データ';

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
		url: 'https://maps.gsi.go.jp/development/ichiran.html'
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
		url: 'https://gbank.gsj.jp/seamless/index.html?lang=ja'
	},
	{
		key: '産総研シームレス標高タイル',
		name: '産総研シームレス標高タイル',
		url: 'https://gbank.gsj.jp/seamless/elev/'
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
	},
	{
		key: '株式会社アドイン研究所',
		name: '株式会社アドイン研究所',
		url: 'https://www.owl-sys.com/'
	},
	{
		key: '林野庁',
		name: '林野庁',
		url: 'https://www.rinya.maff.go.jp/index.html'
	},
	{
		key: '東京都オープンデータカタログサイト',
		name: '東京都オープンデータカタログサイト',
		url: 'https://portal.data.metro.tokyo.lg.jp/'
	},
	{
		key: '環境省生物多様性センター',
		name: '環境省生物多様性センター',
		url: 'https://www.biodic.go.jp'
	},
	{
		key: '森林総合研究所',
		name: '森林総合研究所',
		url: 'https://www.biodic.go.jp'
	},
	{
		key: '愛媛県森林資源データ',
		name: '愛媛県森林資源データ',
		url: 'https://www.geospatial.jp/ckan/organization/ehime-ringyou'
	},
	{
		key: '栃木県森林資源データ',
		name: '栃木県森林資源データ',
		url: 'https://www.geospatial.jp/ckan/organization/tochigipref-shinrin-seibi'
	}
];

// Map を作成
export const attributionMap: Map<string, Attribution> = new Map(
	attributionData.map((entry) => [entry.key, entry])
);
