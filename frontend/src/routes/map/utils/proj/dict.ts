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

export interface EpsgInfo {
	citation: string;
	projContext: string;
	name: string;
	prefecture?: string;
	zone?: string;
	bbox: [number, number, number, number];
}

export interface EpsgInfoWithCode extends EpsgInfo {
	code: EpsgCode;
}

export const epsgDict: Record<EpsgCode, EpsgInfo> = {
	'4326': {
		citation: 'WGS 84',
		projContext: '+proj=longlat +datum=WGS84 +no_defs +type=crs',
		name: '世界測地系',
		bbox: WEB_MERCATOR_WORLD_BBOX
	},
	'3857': {
		citation: 'WGS 84 / Pseudo-Mercator',
		projContext:
			'+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs',
		name: 'Web メルカトル座標系',
		prefecture: '世界',
		bbox: WEB_MERCATOR_WORLD_BBOX
	},
	'6669': {
		citation: 'JGD2011 / Japan Plane Rectangular CS I',
		projContext:
			'+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第1系',
		prefecture: '長崎県',
		zone: '1',
		bbox: [128.10449046736127, 27.01867833263912, 130.39034570708884, 34.72860142321733]
	},
	'6670': {
		citation: 'JGD2011 / Japan Plane Rectangular CS II',
		projContext:
			'+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第2系',
		prefecture: '福岡県、佐賀県、熊本県、大分県、宮崎県、鹿児島県',
		zone: '2',
		bbox: [129.73681138803533, 30.03730594641246, 132.17742586311329, 34.25024026107934]
	},
	'6671': {
		citation: 'JGD2011 / Japan Plane Rectangular CS III',
		projContext:
			'+proj=tmerc +lat_0=36 +lon_0=132.166666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第3系',
		prefecture: '広島県、山口県、島根県',
		zone: '3',
		bbox: [130.7747777815696, 33.71266889195593, 133.47064185523766, 37.24777217094908]
	},
	'6672': {
		citation: 'JGD2011 / Japan Plane Rectangular CS IV',
		projContext:
			'+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第4系',
		prefecture: '徳島県、香川県、愛媛県、高知県',
		zone: '4',
		bbox: [132.0123430608837, 32.70250222459816, 134.82231897484095, 34.564848801930836]
	},
	'6673': {
		citation: 'JGD2011 / Japan Plane Rectangular CS V',
		projContext:
			'+proj=tmerc +lat_0=36 +lon_0=134.333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第5系',
		prefecture: '兵庫県、鳥取県、岡山県',
		zone: '5',
		bbox: [133.13587917008783, 34.1551553332522, 135.4685944492746, 35.674822945822484]
	},
	'6674': {
		citation: 'JGD2011 / Japan Plane Rectangular CS VI',
		projContext:
			'+proj=tmerc +lat_0=36 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第6系',
		prefecture: '京都府、大阪府、福井県、滋賀県、三重県、奈良県、和歌山県',
		zone: '6',
		bbox: [134.85372666685237, 33.432598630822326, 136.99008369620583, 36.29683927910961]
	},
	'6675': {
		citation: 'JGD2011 / Japan Plane Rectangular CS VII',
		projContext:
			'+proj=tmerc +lat_0=36 +lon_0=137.166666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第7系',
		prefecture: '石川県、富山県、岐阜県、愛知県',
		zone: '7',
		bbox: [136.24200486363372, 34.57354027916074, 137.83811566760417, 37.85791469410799]
	},
	'6676': {
		citation: 'JGD2011 / Japan Plane Rectangular CS VIII',
		projContext:
			'+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第8系',
		prefecture: '新潟県、長野県、山梨県、静岡県',
		zone: '8',
		bbox: [137.32455175086284, 34.57213582860578, 139.89990466936513, 38.55358319800635]
	},
	'6677': {
		citation: 'JGD2011 / Japan Plane Rectangular CS IX',
		projContext:
			'+proj=tmerc +lat_0=36 +lon_0=139.833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第9系',
		prefecture: '東京都、福島県、栃木県、茨城県、埼玉県、千葉県、群馬県、神奈川県',
		zone: '9',
		bbox: [136.06952016882087, 20.422746413816125, 153.98667512285886, 37.9766444137089]
	},
	'6678': {
		citation: 'JGD2011 / Japan Plane Rectangular CS X',
		projContext:
			'+proj=tmerc +lat_0=40 +lon_0=140.833333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第10系',
		prefecture: '青森県、秋田県、山形県、岩手県、宮城県',
		zone: '10',
		bbox: [139.49741871560136, 37.73382680206544, 142.07248094713822, 41.55616786515505]
	},
	'6679': {
		citation: 'JGD2011 / Japan Plane Rectangular CS XI',
		projContext:
			'+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第11系',
		prefecture: '北海道（11系地域）',
		zone: '11',
		bbox: [139.3339601690268, 41.35164555899553, 141.29254306091372, 43.37698083839517]
	},
	'6680': {
		citation: 'JGD2011 / Japan Plane Rectangular CS XII',
		projContext:
			'+proj=tmerc +lat_0=44 +lon_0=142.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第12系',
		prefecture: '北海道',
		zone: '12',
		bbox: [140.9082467193108, 41.915264999780106, 143.77645138762156, 45.52647417134611]
	},
	'6681': {
		citation: 'JGD2011 / Japan Plane Rectangular CS XIII',
		projContext:
			'+proj=tmerc +lat_0=44 +lon_0=144.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第13系',
		prefecture: '北海道（13系地域）',
		zone: '13',
		bbox: [142.67177082956027, 42.160040000246, 148.89440319085477, 45.557243413952534]
	},
	'6682': {
		citation: 'JGD2011 / Japan Plane Rectangular CS XIV',
		projContext:
			'+proj=tmerc +lat_0=26 +lon_0=142 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第14系',
		prefecture: '東京都（小笠原）',
		zone: '14',
		bbox: [140.869039299824, 24.22453155868461, 142.25254778205468, 27.74489970315895]
	},
	'6683': {
		citation: 'JGD2011 / Japan Plane Rectangular CS XV',
		projContext:
			'+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第15系',
		prefecture: '沖縄県',
		zone: '15',
		bbox: [126.70773055841866, 26.07447258644089, 128.33572655034018, 27.88596444100629]
	},
	'6684': {
		citation: 'JGD2011 / Japan Plane Rectangular CS XVI',
		projContext:
			'+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第16系',
		prefecture: '沖縄県（16系地域）',
		zone: '16',
		bbox: [122.93260636778984, 24.045615829007446, 125.48441129664423, 25.929158613079746]
	},
	'6685': {
		citation: 'JGD2011 / Japan Plane Rectangular CS XVII',
		projContext:
			'+proj=tmerc +lat_0=26 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第17系',
		prefecture: '沖縄県（17系地域）',
		zone: '17',
		bbox: [131.1806272240673, 24.461167747693587, 131.33212488995187, 25.961008613256993]
	},
	'6686': {
		citation: 'JGD2011 / Japan Plane Rectangular CS XVIII',
		projContext:
			'+proj=tmerc +lat_0=20 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第18系',
		prefecture: '東京都（沖ノ鳥島）',
		zone: '18',
		bbox: [136.06952016882087, 20.422746413816125, 136.08136500639014, 20.42581799970114]
	},
	'6687': {
		citation: 'JGD2011 / Japan Plane Rectangular CS XIX',
		projContext:
			'+proj=tmerc +lat_0=26 +lon_0=154 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs',
		name: '日本測地系2011 / 平面直角座標系第19系',
		prefecture: '東京都（南鳥島）',
		zone: '19',
		bbox: [153.9711056027416, 24.280863604172172, 153.98667512285886, 24.297550441100142]
	}
};

type Options = {
	exclude4326?: boolean;
	exclude3857?: boolean;
};

export const getEpsgInfoArray = (options?: Options): EpsgInfoWithCode[] => {
	return Object.entries(epsgDict)
		.filter(([code]) => {
			// デフォルトでは全て含める
			if (!options) return true;

			// trueが指定された場合に除外
			if (options.exclude4326 && code === '4326') {
				return false;
			}
			if (options.exclude3857 && code === '3857') {
				return false;
			}
			return true;
		})
		.map(([code, info]) => ({
			code: code as EpsgCode,
			...info
		}));
};

export const getEpsgInfo = (epsgCode: EpsgCode): EpsgInfo => {
	return epsgDict[epsgCode];
};

export const getCitation = (epsgCode: EpsgCode): string => {
	return epsgDict[epsgCode].citation;
};

export const getProjContext = (epsgCode: EpsgCode): string => {
	return epsgDict[epsgCode].projContext;
};

export const getName = (epsgCode: EpsgCode): string => {
	return epsgDict[epsgCode].name;
};

export const getPrefecture = (epsgCode: EpsgCode): string | undefined => {
	return epsgDict[epsgCode].prefecture;
};

export const getZone = (epsgCode: EpsgCode): string | undefined => {
	return epsgDict[epsgCode].zone;
};

export const getBbox = (epsgCode: EpsgCode): [number, number, number, number] => {
	return epsgDict[epsgCode].bbox;
};
