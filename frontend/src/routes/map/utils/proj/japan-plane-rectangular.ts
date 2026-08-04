import { dmsToDecimal } from './dms';

export type JapanPlaneRectangularZone =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15
	| 16
	| 17
	| 18
	| 19;

export type JapanPlaneRectangularDatum = 'jgd2000' | 'jgd2011';

export interface JapanPlaneRectangularInfo {
	zone: JapanPlaneRectangularZone;
	roman: string;
	name: string;
	originLongitude: number;
	originLatitude: number;
	originLongitudeDms: string;
	originLatitudeDms: string;
	areaOfUse: string;
	epsg: {
		jgd2000: string;
		jgd2011: string;
	};
}

const toDecimalDegrees = (degrees: number, minutes: number = 0): number => {
	return Number(dmsToDecimal(degrees, minutes, 0).toFixed(13));
};

const createProjContext = (
	originLatitude: number,
	originLongitude: number,
	includeTypeCrs: boolean = false
): string => {
	const base = `+proj=tmerc +lat_0=${originLatitude} +lon_0=${originLongitude} +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs`;
	return includeTypeCrs ? `${base} +type=crs` : base;
};

const normalizeEpsgCode = (epsg: string | number): number | null => {
	const match = String(epsg)
		.trim()
		.match(/^(?:EPSG:)?(\d{4,5})$/i);
	return match ? Number(match[1]) : null;
};

export const isJapanPlaneRectangularZone = (
	value: number
): value is JapanPlaneRectangularZone => {
	return Number.isInteger(value) && value >= 1 && value <= 19;
};

export const JAPAN_PLANE_RECTANGULAR_SYSTEMS: Record<
	JapanPlaneRectangularZone,
	JapanPlaneRectangularInfo
> = {
	1: {
		zone: 1,
		roman: 'I',
		name: '平面直角座標系第1系',
		originLongitude: toDecimalDegrees(129, 30),
		originLatitude: toDecimalDegrees(33),
		originLongitudeDms: '129度30分0秒0000',
		originLatitudeDms: '33度0分0秒0000',
		areaOfUse:
			'長崎県 鹿児島県のうち北方北緯32度南方北緯27度西方東経128度18分東方東経130度を境界線とする区域内（奄美群島は東経130度13分までを含む。）にあるすべての島、小島、環礁及び岩礁',
		epsg: {
			jgd2000: 'EPSG:2443',
			jgd2011: 'EPSG:6669'
		}
	},
	2: {
		zone: 2,
		roman: 'II',
		name: '平面直角座標系第2系',
		originLongitude: toDecimalDegrees(131),
		originLatitude: toDecimalDegrees(33),
		originLongitudeDms: '131度0分0秒0000',
		originLatitudeDms: '33度0分0秒0000',
		areaOfUse: '福岡県 佐賀県 熊本県 大分県 宮崎県 鹿児島県（第1系に規定する区域を除く。）',
		epsg: {
			jgd2000: 'EPSG:2444',
			jgd2011: 'EPSG:6670'
		}
	},
	3: {
		zone: 3,
		roman: 'III',
		name: '平面直角座標系第3系',
		originLongitude: toDecimalDegrees(132, 10),
		originLatitude: toDecimalDegrees(36),
		originLongitudeDms: '132度10分0秒0000',
		originLatitudeDms: '36度0分0秒0000',
		areaOfUse: '山口県 島根県 広島県',
		epsg: {
			jgd2000: 'EPSG:2445',
			jgd2011: 'EPSG:6671'
		}
	},
	4: {
		zone: 4,
		roman: 'IV',
		name: '平面直角座標系第4系',
		originLongitude: toDecimalDegrees(133, 30),
		originLatitude: toDecimalDegrees(33),
		originLongitudeDms: '133度30分0秒0000',
		originLatitudeDms: '33度0分0秒0000',
		areaOfUse: '香川県 愛媛県 徳島県 高知県',
		epsg: {
			jgd2000: 'EPSG:2446',
			jgd2011: 'EPSG:6672'
		}
	},
	5: {
		zone: 5,
		roman: 'V',
		name: '平面直角座標系第5系',
		originLongitude: toDecimalDegrees(134, 20),
		originLatitude: toDecimalDegrees(36),
		originLongitudeDms: '134度20分0秒0000',
		originLatitudeDms: '36度0分0秒0000',
		areaOfUse: '兵庫県 鳥取県 岡山県',
		epsg: {
			jgd2000: 'EPSG:2447',
			jgd2011: 'EPSG:6673'
		}
	},
	6: {
		zone: 6,
		roman: 'VI',
		name: '平面直角座標系第6系',
		originLongitude: toDecimalDegrees(136),
		originLatitude: toDecimalDegrees(36),
		originLongitudeDms: '136度0分0秒0000',
		originLatitudeDms: '36度0分0秒0000',
		areaOfUse: '京都府 大阪府 福井県 滋賀県 三重県 奈良県 和歌山県',
		epsg: {
			jgd2000: 'EPSG:2448',
			jgd2011: 'EPSG:6674'
		}
	},
	7: {
		zone: 7,
		roman: 'VII',
		name: '平面直角座標系第7系',
		originLongitude: toDecimalDegrees(137, 10),
		originLatitude: toDecimalDegrees(36),
		originLongitudeDms: '137度10分0秒0000',
		originLatitudeDms: '36度0分0秒0000',
		areaOfUse: '石川県 富山県 岐阜県 愛知県',
		epsg: {
			jgd2000: 'EPSG:2449',
			jgd2011: 'EPSG:6675'
		}
	},
	8: {
		zone: 8,
		roman: 'VIII',
		name: '平面直角座標系第8系',
		originLongitude: toDecimalDegrees(138, 30),
		originLatitude: toDecimalDegrees(36),
		originLongitudeDms: '138度30分0秒0000',
		originLatitudeDms: '36度0分0秒0000',
		areaOfUse: '新潟県 長野県 山梨県 静岡県',
		epsg: {
			jgd2000: 'EPSG:2450',
			jgd2011: 'EPSG:6676'
		}
	},
	9: {
		zone: 9,
		roman: 'IX',
		name: '平面直角座標系第9系',
		originLongitude: toDecimalDegrees(139, 50),
		originLatitude: toDecimalDegrees(36),
		originLongitudeDms: '139度50分0秒0000',
		originLatitudeDms: '36度0分0秒0000',
		areaOfUse:
			'東京都（第14系、第18系及び第19系に規定する区域を除く。） 福島県 栃木県 茨城県 埼玉県 千葉県 群馬県 神奈川県',
		epsg: {
			jgd2000: 'EPSG:2451',
			jgd2011: 'EPSG:6677'
		}
	},
	10: {
		zone: 10,
		roman: 'X',
		name: '平面直角座標系第10系',
		originLongitude: toDecimalDegrees(140, 50),
		originLatitude: toDecimalDegrees(40),
		originLongitudeDms: '140度50分0秒0000',
		originLatitudeDms: '40度0分0秒0000',
		areaOfUse: '青森県 秋田県 山形県 岩手県 宮城県',
		epsg: {
			jgd2000: 'EPSG:2452',
			jgd2011: 'EPSG:6678'
		}
	},
	11: {
		zone: 11,
		roman: 'XI',
		name: '平面直角座標系第11系',
		originLongitude: toDecimalDegrees(140, 15),
		originLatitude: toDecimalDegrees(44),
		originLongitudeDms: '140度15分0秒0000',
		originLatitudeDms: '44度0分0秒0000',
		areaOfUse:
			'小樽市 函館市 伊達市 北斗市 北海道後志総合振興局の所管区域 北海道胆振総合振興局の所管区域のうち豊浦町、壮瞥町及び洞爺湖町 北海道渡島総合振興局の所管区域 北海道檜山振興局の所管区域',
		epsg: {
			jgd2000: 'EPSG:2453',
			jgd2011: 'EPSG:6679'
		}
	},
	12: {
		zone: 12,
		roman: 'XII',
		name: '平面直角座標系第12系',
		originLongitude: toDecimalDegrees(142, 15),
		originLatitude: toDecimalDegrees(44),
		originLongitudeDms: '142度15分0秒0000',
		originLatitudeDms: '44度0分0秒0000',
		areaOfUse: '北海道（第11系及び第13系に規定する区域を除く。）',
		epsg: {
			jgd2000: 'EPSG:2454',
			jgd2011: 'EPSG:6680'
		}
	},
	13: {
		zone: 13,
		roman: 'XIII',
		name: '平面直角座標系第13系',
		originLongitude: toDecimalDegrees(144, 15),
		originLatitude: toDecimalDegrees(44),
		originLongitudeDms: '144度15分0秒0000',
		originLatitudeDms: '44度0分0秒0000',
		areaOfUse:
			'北見市 帯広市 釧路市 網走市 根室市 北海道オホーツク総合振興局の所管区域のうち美幌町、津別町、斜里町、清里町、小清水町、訓子府町、置戸町、佐呂間町及び大空町 北海道十勝総合振興局の所管区域 北海道釧路総合振興局の所管区域 北海道根室振興局の所管区域',
		epsg: {
			jgd2000: 'EPSG:2455',
			jgd2011: 'EPSG:6681'
		}
	},
	14: {
		zone: 14,
		roman: 'XIV',
		name: '平面直角座標系第14系',
		originLongitude: toDecimalDegrees(142),
		originLatitude: toDecimalDegrees(26),
		originLongitudeDms: '142度0分0秒0000',
		originLatitudeDms: '26度0分0秒0000',
		areaOfUse: '東京都のうち北緯28度から南であり、かつ東経140度30分から東であり東経143度から西である区域',
		epsg: {
			jgd2000: 'EPSG:2456',
			jgd2011: 'EPSG:6682'
		}
	},
	15: {
		zone: 15,
		roman: 'XV',
		name: '平面直角座標系第15系',
		originLongitude: toDecimalDegrees(127, 30),
		originLatitude: toDecimalDegrees(26),
		originLongitudeDms: '127度30分0秒0000',
		originLatitudeDms: '26度0分0秒0000',
		areaOfUse: '沖縄県のうち東経126度から東であり、かつ東経130度から西である区域',
		epsg: {
			jgd2000: 'EPSG:2457',
			jgd2011: 'EPSG:6683'
		}
	},
	16: {
		zone: 16,
		roman: 'XVI',
		name: '平面直角座標系第16系',
		originLongitude: toDecimalDegrees(124),
		originLatitude: toDecimalDegrees(26),
		originLongitudeDms: '124度0分0秒0000',
		originLatitudeDms: '26度0分0秒0000',
		areaOfUse: '沖縄県のうち東経126度から西である区域',
		epsg: {
			jgd2000: 'EPSG:2458',
			jgd2011: 'EPSG:6684'
		}
	},
	17: {
		zone: 17,
		roman: 'XVII',
		name: '平面直角座標系第17系',
		originLongitude: toDecimalDegrees(131),
		originLatitude: toDecimalDegrees(26),
		originLongitudeDms: '131度0分0秒0000',
		originLatitudeDms: '26度0分0秒0000',
		areaOfUse: '沖縄県のうち東経130度から東である区域',
		epsg: {
			jgd2000: 'EPSG:2459',
			jgd2011: 'EPSG:6685'
		}
	},
	18: {
		zone: 18,
		roman: 'XVIII',
		name: '平面直角座標系第18系',
		originLongitude: toDecimalDegrees(136),
		originLatitude: toDecimalDegrees(20),
		originLongitudeDms: '136度0分0秒0000',
		originLatitudeDms: '20度0分0秒0000',
		areaOfUse: '東京都のうち北緯28度から南であり、かつ東経140度30分から西である区域',
		epsg: {
			jgd2000: 'EPSG:2460',
			jgd2011: 'EPSG:6686'
		}
	},
	19: {
		zone: 19,
		roman: 'XIX',
		name: '平面直角座標系第19系',
		originLongitude: toDecimalDegrees(154),
		originLatitude: toDecimalDegrees(26),
		originLongitudeDms: '154度0分0秒0000',
		originLatitudeDms: '26度0分0秒0000',
		areaOfUse: '東京都のうち北緯28度から南であり、かつ東経143度から東である区域',
		epsg: {
			jgd2000: 'EPSG:2461',
			jgd2011: 'EPSG:6687'
		}
	}
};

export const getJapanPlaneRectangularSystems = (): JapanPlaneRectangularInfo[] => {
	return Object.values(JAPAN_PLANE_RECTANGULAR_SYSTEMS);
};

export const getJapanPlaneRectangularInfo = (
	zone: number
): JapanPlaneRectangularInfo | null => {
	if (!isJapanPlaneRectangularZone(zone)) return null;
	return JAPAN_PLANE_RECTANGULAR_SYSTEMS[zone];
};

export const getJapanPlaneRectangularZoneFromEpsg = (
	epsg: string | number
): JapanPlaneRectangularZone | null => {
	const normalized = normalizeEpsgCode(epsg);
	if (normalized == null) return null;

	if (normalized >= 2443 && normalized <= 2461) {
		const zone = normalized - 2442;
		return isJapanPlaneRectangularZone(zone) ? zone : null;
	}

	if (normalized >= 6669 && normalized <= 6687) {
		const zone = normalized - 6668;
		return isJapanPlaneRectangularZone(zone) ? zone : null;
	}

	return null;
};

export const getJapanPlaneRectangularInfoByEpsg = (
	epsg: string | number
): JapanPlaneRectangularInfo | null => {
	const zone = getJapanPlaneRectangularZoneFromEpsg(epsg);
	return zone == null ? null : JAPAN_PLANE_RECTANGULAR_SYSTEMS[zone];
};

export const getJapanPlaneRectangularEpsg = (
	zone: number,
	datum: JapanPlaneRectangularDatum = 'jgd2011'
): string | null => {
	const info = getJapanPlaneRectangularInfo(zone);
	return info ? info.epsg[datum] : null;
};

export const getJapanPlaneRectangularProj4 = (
	zone: number,
	datum: JapanPlaneRectangularDatum = 'jgd2000'
): string | null => {
	const info = getJapanPlaneRectangularInfo(zone);
	if (!info) return null;

	return createProjContext(
		info.originLatitude,
		info.originLongitude,
		datum === 'jgd2011'
	);
};

export const getJapanPlaneRectangularProj4ByEpsg = (
	epsg: string | number,
	datum: JapanPlaneRectangularDatum = 'jgd2000'
): string | null => {
	const zone = getJapanPlaneRectangularZoneFromEpsg(epsg);
	return zone == null ? null : getJapanPlaneRectangularProj4(zone, datum);
};
