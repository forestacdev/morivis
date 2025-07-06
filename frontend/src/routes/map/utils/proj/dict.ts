import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/location_bbox';

export type EpsgCode =
	| '4326'
	| '3857'
	| '6669'
	| '6670'
	| '6671'
	| '6672'
	| '6673'
	| '6674'
	| '6675'
	| '6676'
	| '6677'
	| '6678'
	| '6679'
	| '6680'
	| '6681'
	| '6682'
	| '6683'
	| '6684'
	| '6685'
	| '6686'
	| '6687';

type Citation =
	| 'WGS 84'
	| 'WGS 84 / Pseudo-Mercator'
	| 'JGD2011 / Japan Plane Rectangular CS I'
	| 'JGD2011 / Japan Plane Rectangular CS II'
	| 'JGD2011 / Japan Plane Rectangular CS III'
	| 'JGD2011 / Japan Plane Rectangular CS IV'
	| 'JGD2011 / Japan Plane Rectangular CS V'
	| 'JGD2011 / Japan Plane Rectangular CS VI'
	| 'JGD2011 / Japan Plane Rectangular CS VII'
	| 'JGD2011 / Japan Plane Rectangular CS VIII'
	| 'JGD2011 / Japan Plane Rectangular CS IX'
	| 'JGD2011 / Japan Plane Rectangular CS X'
	| 'JGD2011 / Japan Plane Rectangular CS XI'
	| 'JGD2011 / Japan Plane Rectangular CS XII'
	| 'JGD2011 / Japan Plane Rectangular CS XIII'
	| 'JGD2011 / Japan Plane Rectangular CS XIV'
	| 'JGD2011 / Japan Plane Rectangular CS XV'
	| 'JGD2011 / Japan Plane Rectangular CS XVI'
	| 'JGD2011 / Japan Plane Rectangular CS XVII'
	| 'JGD2011 / Japan Plane Rectangular CS XVIII'
	| 'JGD2011 / Japan Plane Rectangular CS XIX';

type CitationDict = Record<Citation, EpsgCode>;

export const citationDict: CitationDict = {
	'WGS 84': '4326',
	'WGS 84 / Pseudo-Mercator': '3857',
	'JGD2011 / Japan Plane Rectangular CS I': '6669',
	'JGD2011 / Japan Plane Rectangular CS II': '6670',
	'JGD2011 / Japan Plane Rectangular CS III': '6671',
	'JGD2011 / Japan Plane Rectangular CS IV': '6672',
	'JGD2011 / Japan Plane Rectangular CS V': '6673',
	'JGD2011 / Japan Plane Rectangular CS VI': '6674',
	'JGD2011 / Japan Plane Rectangular CS VII': '6675',
	'JGD2011 / Japan Plane Rectangular CS VIII': '6676',
	'JGD2011 / Japan Plane Rectangular CS IX': '6677',
	'JGD2011 / Japan Plane Rectangular CS X': '6678',
	'JGD2011 / Japan Plane Rectangular CS XI': '6679',
	'JGD2011 / Japan Plane Rectangular CS XII': '6680',
	'JGD2011 / Japan Plane Rectangular CS XIII': '6681',
	'JGD2011 / Japan Plane Rectangular CS XIV': '6682',
	'JGD2011 / Japan Plane Rectangular CS XV': '6683',
	'JGD2011 / Japan Plane Rectangular CS XVI': '6684',
	'JGD2011 / Japan Plane Rectangular CS XVII': '6685',
	'JGD2011 / Japan Plane Rectangular CS XVIII': '6686',
	'JGD2011 / Japan Plane Rectangular CS XIX': '6687'
};

export const proj4Dict: Record<EpsgCode, string> = {
	'4326': '+proj=longlat +datum=WGS84 +no_defs +type=crs',
	'3857':
		'+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs',
	'6669':
		'+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6670':
		'+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6671':
		'+proj=tmerc +lat_0=36 +lon_0=132.166666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6672':
		'+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6673':
		'+proj=tmerc +lat_0=36 +lon_0=134.333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6674':
		'+proj=tmerc +lat_0=36 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6675':
		'+proj=tmerc +lat_0=36 +lon_0=137.166666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6676':
		'+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6677':
		'+proj=tmerc +lat_0=36 +lon_0=139.833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6678':
		'+proj=tmerc +lat_0=40 +lon_0=140.833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6679':
		'+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6680':
		'+proj=tmerc +lat_0=44 +lon_0=142.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6681':
		'+proj=tmerc +lat_0=44 +lon_0=144.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6682':
		'+proj=tmerc +lat_0=26 +lon_0=142 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6683':
		'+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6684':
		'+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6685':
		'+proj=tmerc +lat_0=26 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6686':
		'+proj=tmerc +lat_0=20 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
	'6687':
		'+proj=tmerc +lat_0=26 +lon_0=154 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs'
};

type EpsgNameDict = Record<EpsgCode, string>;

export const epsgNameDict: EpsgNameDict = {
	'4326': '世界測地系',
	'3857': 'メルカトル図法',
	'6669': '日本測地系2011 / 平面直角座標系第1系',
	'6670': '日本測地系2011 / 平面直角座標系第2系',
	'6671': '日本測地系2011 / 平面直角座標系第3系',
	'6672': '日本測地系2011 / 平面直角座標系第4系',
	'6673': '日本測地系2011 / 平面直角座標系第5系',
	'6674': '日本測地系2011 / 平面直角座標系第6系',
	'6675': '日本測地系2011 / 平面直角座標系第7系',
	'6676': '日本測地系2011 / 平面直角座標系第8系',
	'6677': '日本測地系2011 / 平面直角座標系第9系',
	'6678': '日本測地系2011 / 平面直角座標系第10系',
	'6679': '日本測地系2011 / 平面直角座標系第11系',
	'6680': '日本測地系2011 / 平面直角座標系第12系',
	'6681': '日本測地系2011 / 平面直角座標系第13系',
	'6682': '日本測地系2011 / 平面直角座標系第14系',
	'6683': '日本測地系2011 / 平面直角座標系第15系',
	'6684': '日本測地系2011 / 平面直角座標系第16系',
	'6685': '日本測地系2011 / 平面直角座標系第17系',
	'6686': '日本測地系2011 / 平面直角座標系第18系',
	'6687': '日本測地系2011 / 平面直角座標系第19系'
};

export const epsgPrefDict: Record<EpsgCode, string> = {
	'4326': '世界',
	'3857': '世界',
	'6669': '長崎県', // 1系
	'6670': '福岡県、佐賀県、熊本県、大分県、宮崎県、鹿児島県', // 2系
	'6671': '広島県、山口県、島根県', // 3系
	'6672': '徳島県、香川県、愛媛県、高知県', // 4系
	'6673': '兵庫県、鳥取県、岡山県', // 5系
	'6674': '京都府、大阪府、福井県、滋賀県、三重県、奈良県、和歌山県', // 6系
	'6675': '石川県、富山県、岐阜県、愛知県', // 7系
	'6676': '新潟県、長野県、山梨県、静岡県', // 8系
	'6677': '東京都、福島県、栃木県、茨城県、埼玉県、千葉県、群馬県、神奈川県', // 9系
	'6678': '青森県、秋田県、山形県、岩手県、宮城県', // 10系
	'6679': '北海道（11系地域）', // 11系
	'6680': '北海道', // 12系（代表系）
	'6681': '北海道（13系地域）', // 13系
	'6682': '東京都（小笠原）', // 14系
	'6683': '沖縄県', // 15系（代表系）
	'6684': '沖縄県（16系地域）', // 16系
	'6685': '沖縄県（17系地域）', // 17系
	'6686': '東京都（沖ノ鳥島）', // 18系
	'6687': '東京都（南鳥島）' // 19系
};

export const epsgBboxDict: Record<
	EpsgCode,
	{ zone: string; bbox: [number, number, number, number] }
> = {
	'4326': {
		zone: '0',
		bbox: WEB_MERCATOR_WORLD_BBOX
	},
	'3857': {
		zone: '0',
		bbox: WEB_MERCATOR_WORLD_BBOX
	},
	'6669': {
		zone: '1',
		bbox: [128.10449046736127, 27.01867833263912, 130.39034570708884, 34.72860142321733]
	},
	'6670': {
		zone: '2',
		bbox: [129.73681138803533, 30.03730594641246, 132.17742586311329, 34.25024026107934]
	},
	'6671': {
		zone: '3',
		bbox: [130.7747777815696, 33.71266889195593, 133.47064185523766, 37.24777217094908]
	},
	'6672': {
		zone: '4',
		bbox: [132.0123430608837, 32.70250222459816, 134.82231897484095, 34.564848801930836]
	},
	'6673': {
		zone: '5',
		bbox: [133.13587917008783, 34.1551553332522, 135.4685944492746, 35.674822945822484]
	},
	'6674': {
		zone: '6',
		bbox: [134.85372666685237, 33.432598630822326, 136.99008369620583, 36.29683927910961]
	},
	'6675': {
		zone: '7',
		bbox: [136.24200486363372, 34.57354027916074, 137.83811566760417, 37.85791469410799]
	},
	'6676': {
		zone: '8',
		bbox: [137.32455175086284, 34.57213582860578, 139.89990466936513, 38.55358319800635]
	},
	'6677': {
		zone: '9',
		bbox: [136.06952016882087, 20.422746413816125, 153.98667512285886, 37.9766444137089]
	},
	'6678': {
		zone: '10',
		bbox: [139.49741871560136, 37.73382680206544, 142.07248094713822, 41.55616786515505]
	},
	'6679': {
		zone: '11',
		bbox: [139.3339601690268, 41.35164555899553, 141.29254306091372, 43.37698083839517]
	},
	'6680': {
		zone: '12',
		bbox: [140.9082467193108, 41.915264999780106, 143.77645138762156, 45.52647417134611]
	},
	'6681': {
		zone: '13',
		bbox: [142.67177082956027, 42.160040000246, 148.89440319085477, 45.557243413952534]
	},
	'6682': {
		zone: '14',
		bbox: [140.869039299824, 24.22453155868461, 142.25254778205468, 27.74489970315895]
	},
	'6683': {
		zone: '15',
		bbox: [126.70773055841866, 26.07447258644089, 128.33572655034018, 27.88596444100629]
	},
	'6684': {
		zone: '16',
		bbox: [122.93260636778984, 24.045615829007446, 125.48441129664423, 25.929158613079746]
	},
	'6685': {
		zone: '17',
		bbox: [131.1806272240673, 24.461167747693587, 131.33212488995187, 25.961008613256993]
	},
	'6686': {
		zone: '18',
		bbox: [136.06952016882087, 20.422746413816125, 136.08136500639014, 20.42581799970114]
	},
	'6687': {
		zone: '19',
		bbox: [153.9711056027416, 24.280863604172172, 153.98667512285886, 24.297550441100142]
	}
};
