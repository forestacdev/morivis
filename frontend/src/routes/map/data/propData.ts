const BASE_IMAGE_PATH = './images/';

export interface PropData {
	[id: string]: {
		image: string | null;
		description: string | null;
		url: string | null;
	};
}

export const propData: PropData = {
	aozyutaki: {
		image: `${BASE_IMAGE_PATH}aozyutaki.webp`,
		description: '',
		url: null
	},
	azumaya_1: {
		image: `${BASE_IMAGE_PATH}azumaya_1.webp`,
		description: '',
		url: null
	},
	azumaya_kezikabora: {
		image: `${BASE_IMAGE_PATH}azumaya_kezikabora.webp`,
		description: '',
		url: null
	},
	ensyurin: {
		image: `${BASE_IMAGE_PATH}ensyurin.webp`,
		description: '',
		url: null
	},
	sinrinken: {
		image: `${BASE_IMAGE_PATH}sinrinken.webp`,
		description: '森林・林業に関する公設研究機関です。',
		url: 'https://www.forest.rd.pref.gifu.lg.jp/'
	},
	fac_center: {
		image: `${BASE_IMAGE_PATH}fac_center.webp`,
		description:
			'アカデミーの玄関であるエントランスホールからテクニカルゾーン、宿泊ゾーン、森の体験ゾーンへと繋がっていきます。ここには講義室や事務室、ゆったりとした学生ホールなどを備えています。',
		url: null
	},
	fac_cottage: {
		image: `${BASE_IMAGE_PATH}fac_cottage.webp`,
		description:
			'ゲストや研修・講座受講者のための宿泊施設六角形ユニットで構成され、大小様々な部屋が15部屋あり、最大30人が利用できます。厨房、食堂、洗面所、共同浴室、談話室も備えています。',
		url: null
	},
	fac_forest_labo: {
		image: `${BASE_IMAGE_PATH}fac_forest_labo.webp`,
		description:
			'情報システムを支える情報処理室や数多くの関連図書を保有する図書室を備えます。このほか、森の分野と環境の分野に関連する研究施設を備えています。',
		url: null
	},
	fac_kakoutou: {
		image: `${BASE_IMAGE_PATH}fac_kakoutou.webp`,
		description: '',
		url: null
	},
	fac_kensyutou: {
		image: `${BASE_IMAGE_PATH}fac_kensyutou.webp`,
		description: '',
		url: null
	},
	fac_koubou: {
		image: `${BASE_IMAGE_PATH}fac_koubou.webp`,
		description:
			'一般県民向けの木工講座などをサポートする施設工作に関するさまざまな木工機械などを備えています',
		url: null
	},
	fac_morinos: {
		image: `${BASE_IMAGE_PATH}fac_morinos.webp`,
		description:
			'すべての人と森をつなぎ、森と暮らす楽しさと森林文化の豊かさを次世代に伝えていく「森の入り口」森林総合教育センターです。',
		url: 'https://morinos.net/'
	},
	fac_open_labo: {
		image: `${BASE_IMAGE_PATH}fac_open_labo.webp`,
		description: '',
		url: null
	},
	fac_ringyoukikaitou: {
		image: `${BASE_IMAGE_PATH}fac_ringyoukikaitou.webp`,
		description: '高性能林業機械を格納し、その技術を学ぶための学習施設',
		url: null
	},
	fac_seizaitou: {
		image: `${BASE_IMAGE_PATH}fac_seizaitou.webp`,
		description: '',
		url: null
	},
	fac_syako: {
		image: `${BASE_IMAGE_PATH}fac_syako.webp`,
		description: '',
		url: null
	},
	fac_wood_labo: {
		image: `${BASE_IMAGE_PATH}fac_wood_labo.webp`,
		description:
			'木造建築スタジオや作業室、塗装・乾燥室など木の分野に関連する施設を備えています。２棟を繋ぐように大きな作業デッキが前面に広がります。',
		url: null
	},
	fac_tech_a: {
		image: `${BASE_IMAGE_PATH}fac_tech_a.webp`,
		description:
			'研修施設と高性能林業機械の保管庫を備える施設前面の広大な実習用グラウンドと合わせて森林技術者のための短期技術研修部門のエリア、テクニカルゾーンを構成します。',
		url: null
	},
	fac_tech_b: {
		image: `${BASE_IMAGE_PATH}fac_tech_b.webp`,
		description:
			'研修施設と高性能林業機械の保管庫を備える施設前面の広大な実習用グラウンドと合わせて森林技術者のための短期技術研修部門のエリア、テクニカルゾーンを構成します。',
		url: null
	},
	fac_information: {
		image: `${BASE_IMAGE_PATH}fac_information.webp`,
		description:
			'一般県民向け生涯学習講座のための施設。広いスペースを設け各種講座をサポートします。',
		url: null
	},
	gate_ensyurin: {
		image: `${BASE_IMAGE_PATH}gate_ensyurin.webp`,
		description: '',
		url: null
	},
	gate_kokuyurin: {
		image: `${BASE_IMAGE_PATH}gate_kokuyurin.webp`,
		description: '',
		url: null
	},
	hebiotaki: {
		image: `${BASE_IMAGE_PATH}hebiotaki.webp`,
		description: '',
		url: null
	},
	heihuuiwa: {
		image: `${BASE_IMAGE_PATH}heihuuiwa.webp`,
		description: '',
		url: null
	},
	hirumesiiwa: {
		image: `${BASE_IMAGE_PATH}hirumesiiwa.webp`,
		description: '',
		url: null
	},
	kezikaboraike: {
		image: `${BASE_IMAGE_PATH}kezikaboraike.webp`,
		description: '',
		url: null
	},
	miharasiiwa: {
		image: `${BASE_IMAGE_PATH}miharasiiwa.webp`,
		description: '',
		url: null
	},
	mokudou: {
		image: `${BASE_IMAGE_PATH}mokudou.webp`,
		description: '',
		url: null
	},
	morinoiriguti: {
		image: `${BASE_IMAGE_PATH}morinoiriguti.webp`,
		description: '',
		url: null
	},
	nagamenoiwa: {
		image: `${BASE_IMAGE_PATH}nagamenoiwa.webp`,
		description: '',
		url: null
	},
	no_image: {
		image: `${BASE_IMAGE_PATH}no_image.webp`,
		description: '',
		url: null
	},
	oosugi: {
		image: `${BASE_IMAGE_PATH}oosugi.webp`,
		description: '',
		url: null
	},
	pole_1: {
		image: `${BASE_IMAGE_PATH}pole_1.webp`,
		description: '',
		url: null
	},
	pole_2: {
		image: `${BASE_IMAGE_PATH}pole_2.webp`,
		description: '',
		url: null
	},
	pole_3: {
		image: `${BASE_IMAGE_PATH}pole_3.webp`,
		description: '',
		url: null
	},
	pole_4: {
		image: `${BASE_IMAGE_PATH}pole_4.webp`,
		description: '',
		url: null
	},
	pole_5: {
		image: `${BASE_IMAGE_PATH}pole_5.webp`,
		description: '',
		url: null
	},
	pole_6: {
		image: `${BASE_IMAGE_PATH}pole_6.webp`,
		description: '',
		url: null
	},
	pole_a: {
		image: `${BASE_IMAGE_PATH}pole_a.webp`,
		description: '',
		url: null
	},
	steel_tower_b: {
		image: `${BASE_IMAGE_PATH}steel_tower_b.webp`,
		description: '',
		url: null
	},
	steel_tower_c: {
		image: `${BASE_IMAGE_PATH}steel_tower_c.webp`,
		description: '',
		url: null
	},
	sumiyakigoya: {
		image: `${BASE_IMAGE_PATH}sumiyakigoya.webp`,
		description: '',
		url: null
	},

	toilet: {
		image: `${BASE_IMAGE_PATH}toilet.webp`,
		description: '',
		url: null
	},
	umanoseiwa: {
		image: `${BASE_IMAGE_PATH}umanoseiwa.webp`,
		description: '',
		url: null
	},
	yamanokami: {
		image: `${BASE_IMAGE_PATH}yamanokami.webp`,
		description: '',
		url: null
	},
	ziriki_01: {
		image: `${BASE_IMAGE_PATH}ziriki_01.webp`,
		description: '',
		url: null
	},
	ziriki_02: {
		image: `${BASE_IMAGE_PATH}ziriki_02.webp`,
		description: '',
		url: null
	},
	ziriki_03: {
		image: `${BASE_IMAGE_PATH}ziriki_03.webp`,
		description: '',
		url: null
	},
	ziriki_04: {
		image: `${BASE_IMAGE_PATH}ziriki_04.webp`,
		description: '',
		url: null
	},
	ziriki_05: {
		image: `${BASE_IMAGE_PATH}ziriki_05.webp`,
		description: '',
		url: null
	},
	ziriki_06: {
		image: `${BASE_IMAGE_PATH}ziriki_06.webp`,
		description: '',
		url: null
	},
	ziriki_07: {
		image: `${BASE_IMAGE_PATH}ziriki_07.webp`,
		description: '',
		url: null
	},
	ziriki_08: {
		image: `${BASE_IMAGE_PATH}ziriki_08.webp`,
		description: '',
		url: null
	},
	ziriki_09: {
		image: `${BASE_IMAGE_PATH}ziriki_09.webp`,
		description: '',
		url: null
	},
	ziriki_10: {
		image: `${BASE_IMAGE_PATH}ziriki_10.webp`,
		description: '',
		url: null
	},
	ziriki_11: {
		image: `${BASE_IMAGE_PATH}ziriki_11.webp`,
		description: '',
		url: null
	},
	ziriki_12: {
		image: `${BASE_IMAGE_PATH}ziriki_12.webp`,
		description: '',
		url: null
	},
	ziriki_13: {
		image: `${BASE_IMAGE_PATH}ziriki_13.webp`,
		description: '',
		url: null
	},
	ziriki_14: {
		image: `${BASE_IMAGE_PATH}ziriki_14.webp`,
		description: '',
		url: null
	},
	ziriki_15: {
		image: `${BASE_IMAGE_PATH}ziriki_15.webp`,
		description: '',
		url: null
	},
	ziriki_16: {
		image: `${BASE_IMAGE_PATH}ziriki_16.webp`,
		description: '',
		url: null
	},
	ziriki_17: {
		image: `${BASE_IMAGE_PATH}ziriki_17.webp`,
		description: '',
		url: null
	},
	ziriki_18: {
		image: `${BASE_IMAGE_PATH}ziriki_18.webp`,
		description: '',
		url: null
	},
	ziriki_19: {
		image: `${BASE_IMAGE_PATH}ziriki_19.webp`,
		description: '',
		url: null
	},
	ziriki_20: {
		image: `${BASE_IMAGE_PATH}ziriki_20.webp`,
		description: '',
		url: null
	},
	ziriki_21: {
		image: `${BASE_IMAGE_PATH}ziriki_21.webp`,
		description: '',
		url: null
	}
};
