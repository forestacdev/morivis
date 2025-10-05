export type Attribution = {
	name: string;
	url: string;
};

//TODO: キー名が日本語のものは、英語に変換する必要があるかも
const attributionData = {
	森林文化アカデミー: {
		name: '森林文化アカデミー',
		url: 'https://www.forest.ac.jp/'
	},
	MIERUNE: {
		name: 'MIERUNE Inc.',
		url: 'https://mierune.co.jp/'
	},
	国土地理院: {
		name: '国土地理院',
		url: 'https://maps.gsi.go.jp/development/ichiran.html'
	},
	国土地理院最適化ベクトルタイル: {
		name: '国土地理院最適化ベクトルタイル',
		url: 'https://github.com/gsi-cyberjapan/optimal_bvmap'
	},
	NASA: {
		name: 'NASA/Goddard Space Flight Center/Reto Stöckli',
		url: 'https://earthdata.nasa.gov/'
	},
	岐阜県森林研究所: {
		name: '岐阜県森林研究所',
		url: 'https://www.forest.rd.pref.gifu.lg.jp/index.html'
	},
	エコリス地図タイル: {
		name: 'エコリス地図タイル',
		url: 'https://map.ecoris.info/#contents'
	},
	産総研地質調査総合センター: {
		name: '産総研地質調査総合センター',
		url: 'https://gbank.gsj.jp/seamless/index.html?lang=ja'
	},
	国土数値情報: {
		name: '国土数値情報',
		url: 'https://nlftp.mlit.go.jp/'
	},
	産総研シームレス標高タイル: {
		name: '産総研シームレス標高タイル',
		url: 'https://gbank.gsj.jp/seamless/elev/'
	},
	Q地図タイル: {
		name: 'Q地図タイル',
		url: 'https://info.qchizu.xyz/qchizu/reprint/'
	},
	OSM: {
		name: '© OpenStreetMap contributors',
		url: 'https://www.openstreetmap.org/copyright'
	},
	OpenMapTiles: {
		name: '© OpenMapTiles',
		url: 'https://openmaptiles.org/'
	},
	USGS: {
		name: '© U.S. Geological Survey',
		url: 'https://www.usgs.gov/'
	},
	Esri: {
		name: '© Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, © OpenStreetMap contributors, and the GIS User Community',
		url: ''
	},
	株式会社アドイン研究所: {
		name: '株式会社アドイン研究所',
		url: 'https://www.owl-sys.com/'
	},
	林野庁: {
		name: '林野庁',
		url: 'https://www.rinya.maff.go.jp/index.html'
	},
	東京都オープンデータカタログサイト: {
		name: '東京都オープンデータカタログサイト',
		url: 'https://portal.data.metro.tokyo.lg.jp/'
	},
	環境省生物多様性センター: {
		name: '環境省生物多様性センター',
		url: 'https://www.biodic.go.jp'
	},
	愛媛県森林資源データ: {
		name: '愛媛県森林資源データ',
		url: 'https://www.geospatial.jp/ckan/organization/ehime-ringyou'
	},
	栃木県森林資源データ: {
		name: '栃木県森林資源データ',
		url: 'https://www.geospatial.jp/ckan/organization/tochigipref-shinrin-seibi'
	},
	高知県森林資源データ: {
		name: '高知県森林資源データ',
		url: 'https://www.geospatial.jp/ckan/organization/kochipref-mori'
	},
	兵庫県森林資源データ: {
		name: '兵庫県森林資源データ',
		url: 'https://www.geospatial.jp/ckan/organization/hyogopref'
	},
	'大阪府（林野庁加工）': {
		name: '大阪府（林野庁加工）',
		url: 'https://www.geospatial.jp/ckan/organization/rinya'
	},
	森林総合研究所: {
		name: '森林総合研究所',
		url: 'https://www.ffpri.go.jp/ffpri.html'
	},
	防災科学技術研究所: {
		name: '防災科学技術研究所',
		url: 'https://www.bosai.go.jp/'
	},
	長野県林業総合センター: {
		name: '長野県林業総合センター',
		url: 'https://www.pref.nagano.lg.jp/ringyosogo/'
	},
	['広島県林業課（林野庁加工）']: {
		name: '広島県林業課（林野庁加工）',
		url: 'https://www.rinya.maff.go.jp/index.html'
	},
	['神奈川県森林再生課（林野庁加工）']: {
		name: '神奈川県森林再生課（林野庁加工）',
		url: 'https://www.geospatial.jp/ckan/organization/rinya'
	}
} as const;

export type AttributionData = typeof attributionData;

export type AttributionKey = keyof typeof attributionData | 'カスタムデータ';

// Map を作成
export const attributionMap: Map<string, Attribution> = new Map(
	Object.entries(attributionData).map(([key, value]) => [key, value])
);

export const getAttribution = (key: AttributionKey): Attribution | undefined => {
	if (key === 'カスタムデータ') {
		return { name: 'カスタムデータ', url: '' };
	}
	return attributionMap.get(key);
};

export const getAttributionName = (key: AttributionKey): string | undefined => {
	if (key === 'カスタムデータ') {
		return 'カスタムデータ';
	}
	return attributionMap.get(key)?.name;
};

export const getAttributionUrl = (key: AttributionKey): string | undefined => {
	if (key === 'カスタムデータ') {
		return '';
	}
	return attributionMap.get(key)?.url;
};
