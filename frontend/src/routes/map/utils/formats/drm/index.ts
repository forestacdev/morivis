import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { LineStringGeometry, PointGeometry } from '$routes/map/types/geometry';

import { readInt, readText } from './ebcdic';

type PathLikeFile = File & { morivisRelativePath?: string; };

export const MT_SUFFIX = '.mt';
export const RECORD_LENGTH = 256;
export const RECORD_ID_BASIC_NODE = '21';
export const RECORD_ID_BASIC_LINK = '22';
export const RECORD_ID_BASIC_LINK_ATTRIBUTE = '23';
export const RECORD_ID_LINK_CORRESPONDENCE = '24';
export const RECORD_ID_ALL_NODE = '31';
export const RECORD_ID_ALL_LINK = '32';
export const RECORD_ID_ALL_LINK_ATTRIBUTE = '93';
export const CRS_TOKYO = 'EPSG:4301';
export const CRS_JGD2000 = 'EPSG:4612';

const NORMALIZED_MAX = 10000;
const POINT_STRIDE = 10;
const LINK_ATTRIBUTE_BLOCK_SIZE = 70;
const LINK_ATTRIBUTE_PER_RECORD = 3;
const LINK_CORRESPONDENCE_PER_RECORD = 24;
const NATIONAL_ROAD_TYPES = ['一般国道'];
const ROAD_MANAGER_NATIONAL = '国';
const LINK_RECORD_IDS = [RECORD_ID_BASIC_LINK, RECORD_ID_ALL_LINK] as const;
const NODE_RECORD_IDS = [RECORD_ID_BASIC_NODE, RECORD_ID_ALL_NODE] as const;

interface Field {
	start: number;
	length: number;
}

interface SharedRouteField {
	roadType: Field;
	routeNo: Field;
	mainSubRoad: Field;
}

interface Layout {
	itemRecordNo: Field;
	manager: Field;
	roadType: Field;
	routeNo?: Field;
	mainSubRoad?: Field;
	sharedRouteCount?: Field;
	sharedRoutes?: SharedRouteField[];
	adminCode: Field;
	linkLength: Field;
	linkType?: Field;
	beaconPresence?: Field;
	automobileOnly?: Field;
	tollRoad?: Field;
	linkPassability?: Field;
	weatherRestriction?: Field;
	vehicleWeightLimit?: Field;
	vehicleHeightLimit?: Field;
	vehicleWidthLimit?: Field;
	roadWidthClass?: Field;
	laneCount?: Field;
	carriagewayWidth?: Field;
	minCarriagewayWidth?: Field;
	medianWidth?: Field;
	medianLength?: Field;
	trafficVolume12h?: Field;
	travelSpeedPeak?: Field;
	trafficRegulationType?: Field;
	trafficRegulationCondition?: Field;
	winterClosure?: Field;
	speedLimit?: Field;
	specialVehicleRoute?: Field;
	linkAttributePresence?: Field;
	pointCount: Field;
	weatherThreshold?: Field;
	shapeSource?: Field;
	designatedSection?: Field;
	continuation: Field;
	node1: Field;
	node2: Field;
	basicLinkNode1?: Field;
	basicLinkNode2?: Field;
	pointStart: number;
	pointsPerRecord: number;
}

interface NodeLayout {
	nodeNo: Field;
	x: Field;
	y: Field;
	itemRecordNo?: Field;
	elevation?: Field;
	nodeType: Field;
	adjacentMeshCode: Field;
	adjacentNodeNo: Field;
	connectionCount: Field;
}

const BASIC_NODE_LAYOUT: NodeLayout = {
	nodeNo: { start: 3, length: 4 },
	itemRecordNo: { start: 7, length: 2 },
	x: { start: 9, length: 5 },
	y: { start: 14, length: 5 },
	elevation: { start: 19, length: 3 },
	nodeType: { start: 22, length: 1 },
	adjacentMeshCode: { start: 23, length: 6 },
	adjacentNodeNo: { start: 29, length: 4 },
	connectionCount: { start: 33, length: 1 }
};

const ALL_ROAD_NODE_LAYOUT: NodeLayout = {
	nodeNo: { start: 3, length: 5 },
	x: { start: 8, length: 5 },
	y: { start: 13, length: 5 },
	nodeType: { start: 18, length: 1 },
	adjacentMeshCode: { start: 19, length: 6 },
	adjacentNodeNo: { start: 25, length: 5 },
	connectionCount: { start: 30, length: 1 }
};

const BASIC_LAYOUT: Layout = {
	node1: { start: 3, length: 4 },
	node2: { start: 7, length: 4 },
	itemRecordNo: { start: 11, length: 2 },
	manager: { start: 13, length: 1 },
	roadType: { start: 14, length: 1 },
	routeNo: { start: 15, length: 4 },
	mainSubRoad: { start: 19, length: 1 },
	sharedRouteCount: { start: 20, length: 2 },
	sharedRoutes: [
		{
			roadType: { start: 22, length: 1 },
			routeNo: { start: 23, length: 4 },
			mainSubRoad: { start: 27, length: 1 }
		},
		{
			roadType: { start: 28, length: 1 },
			routeNo: { start: 29, length: 4 },
			mainSubRoad: { start: 33, length: 1 }
		},
		{
			roadType: { start: 34, length: 1 },
			routeNo: { start: 35, length: 4 },
			mainSubRoad: { start: 39, length: 1 }
		}
	],
	adminCode: { start: 40, length: 5 },
	linkLength: { start: 45, length: 5 },
	linkType: { start: 50, length: 1 },
	beaconPresence: { start: 51, length: 1 },
	automobileOnly: { start: 52, length: 1 },
	tollRoad: { start: 53, length: 1 },
	linkPassability: { start: 54, length: 1 },
	weatherRestriction: { start: 55, length: 1 },
	vehicleWeightLimit: { start: 56, length: 1 },
	vehicleHeightLimit: { start: 57, length: 1 },
	vehicleWidthLimit: { start: 58, length: 1 },
	roadWidthClass: { start: 59, length: 1 },
	laneCount: { start: 60, length: 1 },
	carriagewayWidth: { start: 61, length: 3 },
	minCarriagewayWidth: { start: 64, length: 3 },
	medianWidth: { start: 67, length: 3 },
	medianLength: { start: 70, length: 5 },
	trafficVolume12h: { start: 75, length: 4 },
	travelSpeedPeak: { start: 79, length: 4 },
	trafficRegulationType: { start: 83, length: 1 },
	trafficRegulationCondition: { start: 84, length: 1 },
	winterClosure: { start: 85, length: 1 },
	speedLimit: { start: 86, length: 1 },
	specialVehicleRoute: { start: 87, length: 1 },
	linkAttributePresence: { start: 88, length: 1 },
	pointCount: { start: 89, length: 3 },
	weatherThreshold: { start: 252, length: 2 },
	shapeSource: { start: 254, length: 1 },
	designatedSection: { start: 255, length: 1 },
	continuation: { start: 256, length: 1 },
	pointStart: 92,
	pointsPerRecord: 16
};

const ALL_ROAD_LAYOUT: Layout = {
	node1: { start: 3, length: 5 },
	node2: { start: 8, length: 5 },
	itemRecordNo: { start: 13, length: 2 },
	manager: { start: 15, length: 1 },
	roadType: { start: 16, length: 1 },
	adminCode: { start: 17, length: 5 },
	linkLength: { start: 22, length: 5 },
	roadWidthClass: { start: 27, length: 1 },
	laneCount: { start: 28, length: 1 },
	trafficRegulationType: { start: 29, length: 1 },
	trafficRegulationCondition: { start: 30, length: 1 },
	basicLinkNode1: { start: 31, length: 4 },
	basicLinkNode2: { start: 35, length: 4 },
	pointCount: { start: 39, length: 3 },
	linkAttributePresence: { start: 252, length: 1 },
	linkPassability: { start: 253, length: 1 },
	shapeSource: { start: 254, length: 1 },
	continuation: { start: 256, length: 1 },
	pointStart: 42,
	pointsPerRecord: 21
};

const LAYOUTS: ReadonlyMap<string, Layout> = new Map([
	[RECORD_ID_BASIC_LINK, BASIC_LAYOUT],
	[RECORD_ID_ALL_LINK, ALL_ROAD_LAYOUT]
]);

const NODE_LAYOUTS: ReadonlyMap<string, NodeLayout> = new Map([
	[RECORD_ID_BASIC_NODE, BASIC_NODE_LAYOUT],
	[RECORD_ID_ALL_NODE, ALL_ROAD_NODE_LAYOUT]
]);

export const ROAD_MANAGER_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '東日本高速道路株式会社・中日本高速道路株式会社・西日本高速道路株式会社',
	2: '首都高速道路株式会社・阪神高速道路株式会社・本州四国連絡高速道路株式会社',
	3: '道路公社',
	4: '国',
	5: '都道府県',
	6: '指定市',
	7: '他の市町村等（含東京２３区）',
	8: 'その他の管理者'
};

export const ROAD_TYPE_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '高速自動車国道',
	2: '都市高速道路（含指定都市高速道路）',
	3: '一般国道',
	4: '主要地方道（都道府県道）',
	5: '主要地方道（指定市道）',
	6: '一般都道府県道',
	7: '指定市の一般市道',
	9: 'その他の道路'
};

export const MAIN_SUB_ROAD_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '主道路',
	2: '従道路'
};

export const LINK_TYPE_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '本線（上下線非分離）リンク',
	2: '本線（上下線分離）リンク',
	3: '連結路（本線間の渡り線）リンク',
	4: '交差点内リンク',
	5: '連結路（ランプ）リンク',
	6: '本線と同一路線の側道リンク',
	7: 'SA等側線リンク',
	8: '自転車道等リンク',
	9: '本線側道接続リンク'
};

export const LINK_PASSABILITY_LABELS: Readonly<Record<number, string>> = {
	0: '供用中（通行可否未調査）',
	1: '自動車通行可',
	2: '自動車通行不可',
	3: '未供用（含工事中）',
	4: '計画決定'
};

export const WEATHER_RESTRICTION_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '規制無',
	2: '雨量規制有',
	3: '雪規制有',
	4: 'その他規制有'
};

export const WIDTH_CLASS_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '幅員13.0m以上',
	2: '幅員5.5m以上13.0m未満',
	3: '幅員3.0m以上5.5m未満',
	4: '幅員3.0m未満'
};

export const LANE_COUNT_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '1車線',
	2: '2車線',
	3: '3車線',
	4: '4車線',
	5: '5車線',
	6: '6車線以上'
};

export const TRAFFIC_REGULATION_TYPE_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '規制無し',
	2: '通行禁止（条件無）',
	3: '通行禁止（条件付）',
	4: '一方通行（正方向、条件無）',
	5: '一方通行（逆方向、条件無）',
	6: '一方通行（正方向、条件付）',
	7: '一方通行（逆方向、条件付）',
	8: '一方通行（正逆切替えあり）'
};

export const TRAFFIC_REGULATION_CONDITION_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '車種のみ',
	2: '時刻のみ',
	3: '曜日のみ',
	4: '車種及び時刻',
	5: '車種及び曜日',
	6: '曜日及び時刻',
	7: '車種、時刻及び曜日',
	8: 'その他の条件'
};

export const SPEED_LIMIT_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '30km/h以下',
	2: '40km/h',
	3: '50km/h',
	4: '60km/h',
	5: '70km/h',
	6: '80km/h',
	7: '100km/h',
	8: '110km/h',
	9: '120km/h'
};

export const NODE_TYPE_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '交差点ノード',
	2: '行き止まり点ノード',
	3: 'ダミー点ノード',
	4: '区画辺交点ノード',
	5: '属性変化点ノード',
	6: '交通管制上必要なノード'
};

export const ATTRIBUTE_TYPE_LABELS: Readonly<Record<number, string>> = {
	1: '橋・高架',
	2: 'トンネル',
	3: '洞門等',
	4: '踏切',
	5: '他の施設をアンダーパス',
	6: '歩道橋',
	7: '料金所（ETC無し）',
	8: '道路通称名',
	9: '料金所（ETCあり）',
	10: '料金所（ETC専用）',
	11: 'バイパス道路名',
	12: '道路冠水想定箇所',
	13: '日本風景街道'
};

export const VEHICLE_TRAFFIC_RESTRICTION_LABELS: Readonly<Record<number, string>> = {
	0: '未調査',
	1: '大型車通行不可',
	2: '該当無し（車両通行可）',
	3: '二輪車、耕運機等小型特殊自動車及び軽自動車以外通行不可',
	4: '車両通行不可',
	5: 'その他規制あり'
};

export const DESIGNATED_YES = 1;
export const DESIGNATED_NO = 2;

export class DrmError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DrmError';
	}
}

export interface DrmSharedRoute {
	道路種別コード: number | null;
	路線番号: number | null;
	主従道路区分コード: number | null;
	道路種別: string | null;
	主従道路区分: string | null;
}

export interface DrmLinkInnerAttribute {
	属性種別コード: number | null;
	属性種別: string | null;
	表示レベル参考コード: number | null;
	始点補間点番号: number | null;
	始点側接続有無コード: number | null;
	終点補間点番号: number | null;
	終点側接続有無コード: number | null;
	属性延長: number | null;
	属性名称表示参考位置X座標: number | null;
	属性名称表示参考位置Y座標: number | null;
	漢字文字数: number | null;
	カナ文字数: number | null;
	車両通行規制コード: number | null;
	車両通行規制: string | null;
	施設管理コード: number | null;
}

export interface DrmLinkProperties {
	メッシュコード: string;
	リンク番号: string;
	ノード1: string;
	ノード2: string;
	管理者コード: number | null;
	道路種別コード: number | null;
	路線番号?: number | null;
	主従道路区分コード?: number | null;
	行政区域コード: number | null;
	リンク長: number | null;
	重用路線総数?: number | null;
	重用路線?: DrmSharedRoute[];
	リンク種別コード?: number | null;
	ビーコン有無コード?: number | null;
	自動車専用道路コード?: number | null;
	有料道路コード?: number | null;
	リンク通行可不可コード?: number | null;
	異常気象時通行規制区間種別コード?: number | null;
	車両重量制限有無コード?: number | null;
	車両高さ制限有無コード?: number | null;
	車両幅制限有無コード?: number | null;
	道路幅員区分コード?: number | null;
	車線数コード?: number | null;
	車道幅員?: number | null;
	最小車道部幅員?: number | null;
	中央帯幅員?: number | null;
	中央帯設置延長?: number | null;
	'12時間交通量'?: number | null;
	旅行速度ピーク時?: number | null;
	交通規制種別コード?: number | null;
	交通規制条件種別コード?: number | null;
	冬期通行不可コード?: number | null;
	規制速度コード?: number | null;
	特車通行システム対象コード?: number | null;
	リンク内属性有無コード?: number | null;
	リンク内属性総数?: number | null;
	リンク内属性?: DrmLinkInnerAttribute[];
	異常気象時通行規制区間気象等基準値?: number | null;
	形状データ取得資料コード?: number | null;
	指定区間該当?: number | null;
	対応全道路リンク総数?: number | null;
	対応全道路リンク番号一覧?: string[];
	対応基本道路ノード1?: string | null;
	対応基本道路ノード2?: string | null;
	対応基本道路リンク番号?: string | null;
	道路網: string;
	道路管理者: string | null;
	道路種別: string | null;
	主従道路区分?: string | null;
	リンク種別?: string | null;
	リンク通行状態?: string | null;
	異常気象時通行規制区間種別?: string | null;
	道路幅員区分?: string | null;
	車線数?: string | null;
	交通規制種別?: string | null;
	交通規制条件種別?: string | null;
	規制速度?: string | null;
	国道分類: string | null;
}

export interface DrmNodeProperties {
	メッシュコード: string;
	ノード番号: string;
	標高?: number | null;
	ノード種別コード: number | null;
	隣接メッシュコード: string | null;
	隣接メッシュノード番号: string | null;
	接続リンク本数: number | null;
	道路網: string;
	ノード種別: string | null;
}

export type Position = [number, number];

export interface DrmLink {
	properties: DrmLinkProperties;
	coordinates: Position[];
}

export interface DrmNode {
	properties: DrmNodeProperties;
	coordinate: Position;
}

export interface MeshOrigin {
	lon: number;
	lat: number;
	width: number;
	height: number;
}

export interface ParseOptions {
	recordId?: string;
	includeAllRoads?: boolean;
}

export interface ToGeoJsonOptions extends ParseOptions {
	nationalRoadsOnly?: boolean;
	crs?: string;
}

export interface DrmInput {
	name: string;
	data: ArrayBuffer | Uint8Array;
}

export type DrmGeometry = PointGeometry | LineStringGeometry;
export type DrmProperties = DrmLinkProperties | DrmNodeProperties;
export type DrmFeature = Feature<DrmGeometry, DrmProperties>;

export interface DrmFeatureCollection extends FeatureCollection<DrmGeometry, DrmProperties> {
	crs?: string;
}

const detectCrsInHint = (hint: string): string | null => {
	const match = /(^|[^\d])(\d{4})(A?)(?!\d)/.exec(hint);
	if (!match) return null;
	return match[3] === 'A' ? CRS_TOKYO : CRS_JGD2000;
};

export const getDrmInputName = (file: File | DrmInput): string =>
	((file as PathLikeFile).morivisRelativePath ?? file.name).replace(/^\/+/, '');

export const getDrmRootName = (pathLikeName: string): string => {
	const normalized = pathLikeName.replace(/\\/g, '/');
	const segments = normalized.split('/').filter(Boolean);
	const root = segments[0];
	if (segments.length > 1 && root) return root;
	const base = segments[segments.length - 1] ?? pathLikeName;
	return base.replace(/\.[^.]+$/, '');
};

export const detectCrsCandidates = (...hints: string[]): string[] =>
	Array.from(
		new Set(hints.map((hint) => detectCrsInHint(hint)).filter((value) => value !== null))
	);

export const detectCrs = (...hints: string[]): string => {
	for (const hint of hints) {
		const crs = detectCrsInHint(hint);
		if (crs) return crs;
	}

	return CRS_TOKYO;
};

const getCodeLabel = (
	labels: Readonly<Record<number, string>>,
	code: number | null
): string | null => (code === null ? null : (labels[code] ?? null));

const getLinkNumber = (node1: string, node2: string): string => `${node1}${node2}`;

const getOptionalLinkNumber = (node1: string, node2: string): string | null =>
	node1 && node2 ? getLinkNumber(node1, node2) : null;

const isLinkRecordId = (recordId: string): boolean =>
	LINK_RECORD_IDS.some((candidate) => candidate === recordId);

const isNodeRecordId = (recordId: string): boolean =>
	NODE_RECORD_IDS.some((candidate) => candidate === recordId);

const getLinkRecordIds = (options: ParseOptions): string[] => {
	if (!options.recordId) {
		return options.includeAllRoads ? [...LINK_RECORD_IDS] : [RECORD_ID_BASIC_LINK];
	}

	return [options.recordId];
};

const getNodeRecordIds = (options: ParseOptions): string[] => {
	if (!options.recordId) {
		return options.includeAllRoads ? [...NODE_RECORD_IDS] : [RECORD_ID_BASIC_NODE];
	}

	return [options.recordId];
};

interface LinkAttributeRecordLayout {
	recordId: string;
	node1: Field;
	node2: Field;
}

const BASIC_LINK_ATTRIBUTE_LAYOUT: LinkAttributeRecordLayout = {
	recordId: RECORD_ID_BASIC_LINK_ATTRIBUTE,
	node1: { start: 3, length: 4 },
	node2: { start: 7, length: 4 }
};

const ALL_LINK_ATTRIBUTE_LAYOUT: LinkAttributeRecordLayout = {
	recordId: RECORD_ID_ALL_LINK_ATTRIBUTE,
	node1: { start: 3, length: 5 },
	node2: { start: 8, length: 5 }
};

interface LinkAttributeCollection {
	total: number;
	attributes: DrmLinkInnerAttribute[];
}

interface LinkCorrespondenceCollection {
	total: number;
	linkNumbers: string[];
}

const readLinkInnerAttribute = (
	record: Uint8Array,
	slotIndex: number
): DrmLinkInnerAttribute | null => {
	const base = 17 + slotIndex * LINK_ATTRIBUTE_BLOCK_SIZE;
	const typeCode = readInt(record, base, 2);
	const displayLevel = readInt(record, base + 2, 1);
	const startPoint = readInt(record, base + 3, 3);
	const startConnected = readInt(record, base + 6, 1);
	const endPoint = readInt(record, base + 7, 3);
	const endConnected = readInt(record, base + 10, 1);
	const length = readInt(record, base + 11, 5);
	const labelX = readInt(record, base + 16, 5);
	const labelY = readInt(record, base + 21, 5);
	const kanjiCount = readInt(record, base + 26, 2);
	const kanaCount = readInt(record, base + 48, 2);
	const vehicleRestriction = readInt(record, 227 + slotIndex * 6, 1);
	const facilityCode = readInt(record, 228 + slotIndex * 6, 5);

	if (
		typeCode === null
		&& displayLevel === null
		&& startPoint === null
		&& startConnected === null
		&& endPoint === null
		&& endConnected === null
		&& length === null
		&& labelX === null
		&& labelY === null
		&& kanjiCount === null
		&& kanaCount === null
		&& vehicleRestriction === null
		&& facilityCode === null
	) {
		return null;
	}

	return {
		属性種別コード: typeCode,
		属性種別: getCodeLabel(ATTRIBUTE_TYPE_LABELS, typeCode),
		表示レベル参考コード: displayLevel,
		始点補間点番号: startPoint,
		始点側接続有無コード: startConnected,
		終点補間点番号: endPoint,
		終点側接続有無コード: endConnected,
		属性延長: length,
		属性名称表示参考位置X座標: labelX,
		属性名称表示参考位置Y座標: labelY,
		漢字文字数: kanjiCount,
		カナ文字数: kanaCount,
		車両通行規制コード: vehicleRestriction,
		車両通行規制: getCodeLabel(
			VEHICLE_TRAFFIC_RESTRICTION_LABELS,
			vehicleRestriction
		),
		施設管理コード: facilityCode
	};
};

const collectLinkAttributes = (
	bytes: Uint8Array,
	layout: LinkAttributeRecordLayout
): ReadonlyMap<string, LinkAttributeCollection> => {
	const collections = new Map<string, LinkAttributeCollection>();
	let pending:
		| { linkNumber: string; total: number; attributes: DrmLinkInnerAttribute[]; }
		| null = null;

	for (let offset = 0; offset < bytes.length; offset += RECORD_LENGTH) {
		const record = bytes.subarray(offset, offset + RECORD_LENGTH);
		if (readText(record, 1, 2) !== layout.recordId) continue;

		if (pending === null) {
			const node1 = readText(record, layout.node1.start, layout.node1.length);
			const node2 = readText(record, layout.node2.start, layout.node2.length);

			pending = {
				linkNumber: getLinkNumber(node1, node2),
				total: readInt(record, 15, 2) ?? 0,
				attributes: []
			};
		}

		for (let index = 0; index < LINK_ATTRIBUTE_PER_RECORD; index += 1) {
			const attribute = readLinkInnerAttribute(record, index);
			if (attribute !== null) {
				pending.attributes.push(attribute);
			}
		}

		const continued = readInt(record, 256, 1);
		if (continued) continue;

		collections.set(pending.linkNumber, {
			total: pending.total,
			attributes: pending.attributes.slice(0, pending.total)
		});
		pending = null;
	}

	if (pending !== null) {
		collections.set(pending.linkNumber, {
			total: pending.total,
			attributes: pending.attributes.slice(0, pending.total)
		});
	}

	return collections;
};

const collectLinkCorrespondences = (
	bytes: Uint8Array
): ReadonlyMap<string, LinkCorrespondenceCollection> => {
	const collections = new Map<string, LinkCorrespondenceCollection>();
	let pending: { linkNumber: string; total: number; linkNumbers: string[]; } | null = null;

	for (let offset = 0; offset < bytes.length; offset += RECORD_LENGTH) {
		const record = bytes.subarray(offset, offset + RECORD_LENGTH);
		if (readText(record, 1, 2) !== RECORD_ID_LINK_CORRESPONDENCE) continue;

		if (pending === null) {
			const node1 = readText(record, 3, 4);
			const node2 = readText(record, 7, 4);

			pending = {
				linkNumber: getLinkNumber(node1, node2),
				total: readInt(record, 13, 3) ?? 0,
				linkNumbers: []
			};
		}

		for (let index = 0; index < LINK_CORRESPONDENCE_PER_RECORD; index += 1) {
			const base = 16 + index * 10;
			const node1 = readText(record, base, 5);
			const node2 = readText(record, base + 5, 5);

			if (!node1 || !node2) continue;
			pending.linkNumbers.push(getLinkNumber(node1, node2));
		}

		const continued = readInt(record, 256, 1);
		if (continued) continue;

		collections.set(pending.linkNumber, {
			total: pending.total,
			linkNumbers: pending.linkNumbers.slice(0, pending.total)
		});
		pending = null;
	}

	if (pending !== null) {
		collections.set(pending.linkNumber, {
			total: pending.total,
			linkNumbers: pending.linkNumbers.slice(0, pending.total)
		});
	}

	return collections;
};

const mergeSupplementaryRecords = (
	links: DrmLink[],
	basicLinkAttributes: ReadonlyMap<string, LinkAttributeCollection>,
	allLinkAttributes: ReadonlyMap<string, LinkAttributeCollection>,
	linkCorrespondences: ReadonlyMap<string, LinkCorrespondenceCollection>
) => {
	for (const link of links) {
		if (link.properties.道路網 === '基本道路網') {
			const attributes = basicLinkAttributes.get(link.properties.リンク番号);
			if (attributes) {
				link.properties.リンク内属性総数 = attributes.total;
				link.properties.リンク内属性 = attributes.attributes;
			}

			const correspondences = linkCorrespondences.get(link.properties.リンク番号);
			if (correspondences) {
				link.properties.対応全道路リンク総数 = correspondences.total;
				link.properties.対応全道路リンク番号一覧 = correspondences.linkNumbers;
			}

			continue;
		}

		const attributes = allLinkAttributes.get(link.properties.リンク番号);
		if (attributes) {
			link.properties.リンク内属性総数 = attributes.total;
			link.properties.リンク内属性 = attributes.attributes;
		}
	}
};

const readSharedRoute = (record: Uint8Array, field: SharedRouteField): DrmSharedRoute | null => {
	const roadType = readInt(record, field.roadType.start, field.roadType.length);
	const routeNo = readInt(record, field.routeNo.start, field.routeNo.length);
	const mainSubRoad = readInt(record, field.mainSubRoad.start, field.mainSubRoad.length);

	if (roadType === null && routeNo === null && mainSubRoad === null) return null;

	return {
		道路種別コード: roadType,
		路線番号: routeNo,
		主従道路区分コード: mainSubRoad,
		道路種別: getCodeLabel(ROAD_TYPE_LABELS, roadType),
		主従道路区分: getCodeLabel(MAIN_SUB_ROAD_LABELS, mainSubRoad)
	};
};

export const classifyNationalRoad = (
	roadType: string | null,
	manager: string | null
): string | null => {
	if (!roadType) return null;
	if (!NATIONAL_ROAD_TYPES.some((target) => roadType.includes(target))) return null;
	return manager === ROAD_MANAGER_NATIONAL ? '直轄国道' : '補助国道';
};

export const meshCodeFromFileName = (fileName: string): string => {
	const baseName = fileName.split(/[/\\]/).pop() ?? fileName;
	return baseName.replace(/\.[^.]*$/, '');
};

export const meshOrigin = (meshCode: string): MeshOrigin => {
	if (meshCode.length < 6 || !/^\d{6}/.test(meshCode)) {
		throw new DrmError(`2次メッシュコードとして解釈できません: ${meshCode || '(空)'}`);
	}

	const lat1st = Number(meshCode.slice(0, 2));
	const lon1st = Number(meshCode.slice(2, 4));
	const lat2nd = Number(meshCode[4]);
	const lon2nd = Number(meshCode[5]);
	if (lat2nd > 7 || lon2nd > 7) {
		throw new DrmError(`2次メッシュの区画番号が範囲外です: ${meshCode}`);
	}

	const height = 2 / 3 / 8;
	const width = 1 / 8;

	return {
		lon: lon1st + 100 + lon2nd * width,
		lat: lat1st * (2 / 3) + lat2nd * height,
		width,
		height
	};
};

const toCoordinate = (origin: MeshOrigin, x: number, y: number): Position => [
	origin.lon + (x / NORMALIZED_MAX) * origin.width,
	origin.lat + (y / NORMALIZED_MAX) * origin.height
];

const toDrmBytes = (buffer: ArrayBuffer | Uint8Array): Uint8Array => {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	if (bytes.length === 0) return bytes;

	if (bytes.length % RECORD_LENGTH !== 0) {
		throw new DrmError(
			`ファイルサイズ ${bytes.length} バイトがレコード長 ${RECORD_LENGTH} の倍数ではありません。DRMのEBCDIC形式（.mt）ではない可能性があります。`
		);
	}

	return bytes;
};

const finalize = (
	pending: {
		properties: DrmLinkProperties;
		raw: Position[];
		total: number;
		sharedRoutes: DrmSharedRoute[];
		sharedRouteTotal: number;
	},
	origin: MeshOrigin
): DrmLink => {
	const used = pending.raw.slice(0, pending.total);
	const sharedRoutes = pending.sharedRoutes.slice(0, pending.sharedRouteTotal);
	if (pending.properties.重用路線 !== undefined) {
		pending.properties.重用路線 = sharedRoutes;
	}

	return {
		properties: pending.properties,
		coordinates: used.map(([x, y]) => toCoordinate(origin, x, y))
	};
};

const collectLinks = (
	bytes: Uint8Array,
	meshCode: string,
	recordId: string,
	layout: Layout,
	origin: MeshOrigin,
	output: DrmLink[]
) => {
	const network = recordId === RECORD_ID_BASIC_LINK ? '基本道路網' : '全道路網';
	let pending:
		| {
			properties: DrmLinkProperties;
			raw: Position[];
			total: number;
			sharedRoutes: DrmSharedRoute[];
			sharedRouteTotal: number;
		}
		| null = null;

	for (let offset = 0; offset < bytes.length; offset += RECORD_LENGTH) {
		const record = bytes.subarray(offset, offset + RECORD_LENGTH);
		if (readText(record, 1, 2) !== recordId) continue;

		if (pending === null) {
			const node1 = readText(record, layout.node1.start, layout.node1.length);
			const node2 = readText(record, layout.node2.start, layout.node2.length);
			const manager = readInt(record, layout.manager.start, layout.manager.length);
			const roadType = readInt(record, layout.roadType.start, layout.roadType.length);
			const mainSubRoad = layout.mainSubRoad
				? readInt(record, layout.mainSubRoad.start, layout.mainSubRoad.length)
				: null;
			const managerLabel = manager === null ? null : (ROAD_MANAGER_LABELS[manager] ?? null);
			const roadTypeLabel = roadType === null ? null : (ROAD_TYPE_LABELS[roadType] ?? null);
			const properties: DrmLinkProperties = {
				メッシュコード: meshCode,
				リンク番号: getLinkNumber(node1, node2),
				ノード1: node1,
				ノード2: node2,
				管理者コード: manager,
				道路種別コード: roadType,
				行政区域コード: readInt(record, layout.adminCode.start, layout.adminCode.length),
				リンク長: readInt(record, layout.linkLength.start, layout.linkLength.length),
				道路網: network,
				道路管理者: managerLabel,
				道路種別: roadTypeLabel,
				主従道路区分コード: mainSubRoad,
				主従道路区分: getCodeLabel(MAIN_SUB_ROAD_LABELS, mainSubRoad),
				リンク種別コード: layout.linkType
					? readInt(record, layout.linkType.start, layout.linkType.length)
					: undefined,
				ビーコン有無コード: layout.beaconPresence
					? readInt(record, layout.beaconPresence.start, layout.beaconPresence.length)
					: undefined,
				自動車専用道路コード: layout.automobileOnly
					? readInt(record, layout.automobileOnly.start, layout.automobileOnly.length)
					: undefined,
				有料道路コード: layout.tollRoad
					? readInt(record, layout.tollRoad.start, layout.tollRoad.length)
					: undefined,
				リンク通行可不可コード: layout.linkPassability
					? readInt(record, layout.linkPassability.start, layout.linkPassability.length)
					: undefined,
				異常気象時通行規制区間種別コード: layout.weatherRestriction
					? readInt(
						record,
						layout.weatherRestriction.start,
						layout.weatherRestriction.length
					)
					: undefined,
				車両重量制限有無コード: layout.vehicleWeightLimit
					? readInt(
						record,
						layout.vehicleWeightLimit.start,
						layout.vehicleWeightLimit.length
					)
					: undefined,
				車両高さ制限有無コード: layout.vehicleHeightLimit
					? readInt(
						record,
						layout.vehicleHeightLimit.start,
						layout.vehicleHeightLimit.length
					)
					: undefined,
				車両幅制限有無コード: layout.vehicleWidthLimit
					? readInt(
						record,
						layout.vehicleWidthLimit.start,
						layout.vehicleWidthLimit.length
					)
					: undefined,
				道路幅員区分コード: layout.roadWidthClass
					? readInt(record, layout.roadWidthClass.start, layout.roadWidthClass.length)
					: undefined,
				車線数コード: layout.laneCount
					? readInt(record, layout.laneCount.start, layout.laneCount.length)
					: undefined,
				車道幅員: layout.carriagewayWidth
					? readInt(record, layout.carriagewayWidth.start, layout.carriagewayWidth.length)
					: undefined,
				最小車道部幅員: layout.minCarriagewayWidth
					? readInt(
						record,
						layout.minCarriagewayWidth.start,
						layout.minCarriagewayWidth.length
					)
					: undefined,
				中央帯幅員: layout.medianWidth
					? readInt(record, layout.medianWidth.start, layout.medianWidth.length)
					: undefined,
				中央帯設置延長: layout.medianLength
					? readInt(record, layout.medianLength.start, layout.medianLength.length)
					: undefined,
				'12時間交通量': layout.trafficVolume12h
					? readInt(record, layout.trafficVolume12h.start, layout.trafficVolume12h.length)
					: undefined,
				旅行速度ピーク時: layout.travelSpeedPeak
					? readInt(record, layout.travelSpeedPeak.start, layout.travelSpeedPeak.length)
					: undefined,
				交通規制種別コード: layout.trafficRegulationType
					? readInt(
						record,
						layout.trafficRegulationType.start,
						layout.trafficRegulationType.length
					)
					: undefined,
				交通規制条件種別コード: layout.trafficRegulationCondition
					? readInt(
						record,
						layout.trafficRegulationCondition.start,
						layout.trafficRegulationCondition.length
					)
					: undefined,
				冬期通行不可コード: layout.winterClosure
					? readInt(record, layout.winterClosure.start, layout.winterClosure.length)
					: undefined,
				規制速度コード: layout.speedLimit
					? readInt(record, layout.speedLimit.start, layout.speedLimit.length)
					: undefined,
				特車通行システム対象コード: layout.specialVehicleRoute
					? readInt(
						record,
						layout.specialVehicleRoute.start,
						layout.specialVehicleRoute.length
					)
					: undefined,
				リンク内属性有無コード: layout.linkAttributePresence
					? readInt(
						record,
						layout.linkAttributePresence.start,
						layout.linkAttributePresence.length
					)
					: undefined,
				異常気象時通行規制区間気象等基準値: layout.weatherThreshold
					? readInt(record, layout.weatherThreshold.start, layout.weatherThreshold.length)
					: undefined,
				形状データ取得資料コード: layout.shapeSource
					? readInt(record, layout.shapeSource.start, layout.shapeSource.length)
					: undefined,
				対応基本道路ノード1: layout.basicLinkNode1
					? readText(record, layout.basicLinkNode1.start, layout.basicLinkNode1.length)
					: undefined,
				対応基本道路ノード2: layout.basicLinkNode2
					? readText(record, layout.basicLinkNode2.start, layout.basicLinkNode2.length)
					: undefined,
				国道分類: classifyNationalRoad(roadTypeLabel, managerLabel)
			};

			if (layout.routeNo) {
				properties.路線番号 = readInt(record, layout.routeNo.start, layout.routeNo.length);
			}

			if (layout.sharedRouteCount) {
				properties.重用路線総数 = readInt(
					record,
					layout.sharedRouteCount.start,
					layout.sharedRouteCount.length
				);
				properties.重用路線 = [];
			}

			if (layout.designatedSection) {
				properties.指定区間該当 = readInt(
					record,
					layout.designatedSection.start,
					layout.designatedSection.length
				);
			}

			if (
				properties.対応基本道路ノード1 !== undefined
				&& properties.対応基本道路ノード2 !== undefined
			) {
				properties.対応基本道路リンク番号 = getOptionalLinkNumber(
					properties.対応基本道路ノード1 ?? '',
					properties.対応基本道路ノード2 ?? ''
				);
			}

			properties.リンク種別 = getCodeLabel(
				LINK_TYPE_LABELS,
				properties.リンク種別コード ?? null
			);
			properties.リンク通行状態 = getCodeLabel(
				LINK_PASSABILITY_LABELS,
				properties.リンク通行可不可コード ?? null
			);
			properties.異常気象時通行規制区間種別 = getCodeLabel(
				WEATHER_RESTRICTION_LABELS,
				properties.異常気象時通行規制区間種別コード ?? null
			);
			properties.道路幅員区分 = getCodeLabel(
				WIDTH_CLASS_LABELS,
				properties.道路幅員区分コード ?? null
			);
			properties.車線数 = getCodeLabel(LANE_COUNT_LABELS, properties.車線数コード ?? null);
			properties.交通規制種別 = getCodeLabel(
				TRAFFIC_REGULATION_TYPE_LABELS,
				properties.交通規制種別コード ?? null
			);
			properties.交通規制条件種別 = getCodeLabel(
				TRAFFIC_REGULATION_CONDITION_LABELS,
				properties.交通規制条件種別コード ?? null
			);
			properties.規制速度 = getCodeLabel(
				SPEED_LIMIT_LABELS,
				properties.規制速度コード ?? null
			);

			pending = {
				properties,
				raw: [],
				total: readInt(record, layout.pointCount.start, layout.pointCount.length) ?? 0,
				sharedRoutes: [],
				sharedRouteTotal: properties.重用路線総数 ?? 0
			};
		}

		if (layout.sharedRoutes) {
			for (const field of layout.sharedRoutes) {
				const sharedRoute = readSharedRoute(record, field);
				if (sharedRoute !== null) {
					pending.sharedRoutes.push(sharedRoute);
				}
			}
		}

		for (let index = 0; index < layout.pointsPerRecord; index += 1) {
			const base = layout.pointStart + index * POINT_STRIDE;
			const x = readInt(record, base, 5);
			const y = readInt(record, base + 5, 5);
			if (x === null || y === null) continue;
			pending.raw.push([x, y]);
		}

		const continued = readInt(record, layout.continuation.start, layout.continuation.length);
		if (continued) continue;

		output.push(finalize(pending, origin));
		pending = null;
	}

	if (pending !== null) {
		output.push(finalize(pending, origin));
	}
};

const collectNodes = (
	bytes: Uint8Array,
	meshCode: string,
	recordId: string,
	layout: NodeLayout,
	origin: MeshOrigin,
	output: DrmNode[]
) => {
	const network = recordId === RECORD_ID_BASIC_NODE ? '基本道路網' : '全道路網';

	for (let offset = 0; offset < bytes.length; offset += RECORD_LENGTH) {
		const record = bytes.subarray(offset, offset + RECORD_LENGTH);
		if (readText(record, 1, 2) !== recordId) continue;

		if (layout.itemRecordNo) {
			const itemRecordNo = readInt(
				record,
				layout.itemRecordNo.start,
				layout.itemRecordNo.length
			);
			if (itemRecordNo !== 1) continue;
		}

		const x = readInt(record, layout.x.start, layout.x.length);
		const y = readInt(record, layout.y.start, layout.y.length);
		if (x === null || y === null) continue;

		const nodeType = readInt(record, layout.nodeType.start, layout.nodeType.length);
		const elevation = layout.elevation
			? readInt(record, layout.elevation.start, layout.elevation.length)
			: null;

		output.push({
			properties: {
				メッシュコード: meshCode,
				ノード番号: readText(record, layout.nodeNo.start, layout.nodeNo.length),
				標高: elevation === null ? undefined : elevation * 10,
				ノード種別コード: nodeType,
				隣接メッシュコード: readText(
					record,
					layout.adjacentMeshCode.start,
					layout.adjacentMeshCode.length
				),
				隣接メッシュノード番号: readText(
					record,
					layout.adjacentNodeNo.start,
					layout.adjacentNodeNo.length
				),
				接続リンク本数: readInt(
					record,
					layout.connectionCount.start,
					layout.connectionCount.length
				),
				道路網: network,
				ノード種別: getCodeLabel(NODE_TYPE_LABELS, nodeType)
			},
			coordinate: toCoordinate(origin, x, y)
		});
	}
};

export const parseMesh = (
	buffer: ArrayBuffer | Uint8Array,
	meshCode: string,
	options: ParseOptions = {}
): DrmLink[] => {
	const bytes = toDrmBytes(buffer);
	if (bytes.length === 0) return [];

	const origin = meshOrigin(meshCode);
	const recordIds = getLinkRecordIds(options);

	const links: DrmLink[] = [];
	const basicLinkAttributes = collectLinkAttributes(bytes, BASIC_LINK_ATTRIBUTE_LAYOUT);
	const allLinkAttributes = collectLinkAttributes(bytes, ALL_LINK_ATTRIBUTE_LAYOUT);
	const linkCorrespondences = collectLinkCorrespondences(bytes);

	for (const recordId of recordIds) {
		const layout = LAYOUTS.get(recordId);
		if (!layout) {
			throw new DrmError(
				`レコードID "${recordId}" のレイアウトは未定義です（対応: ${
					[...LAYOUTS.keys()].join(', ')
				}）。`
			);
		}

		collectLinks(bytes, meshCode, recordId, layout, origin, links);
	}

	mergeSupplementaryRecords(
		links,
		basicLinkAttributes,
		allLinkAttributes,
		linkCorrespondences
	);

	return links;
};

const parseNodeMesh = (
	buffer: ArrayBuffer | Uint8Array,
	meshCode: string,
	options: ParseOptions = {}
): DrmNode[] => {
	const bytes = toDrmBytes(buffer);
	if (bytes.length === 0) return [];

	const origin = meshOrigin(meshCode);
	const recordIds = getNodeRecordIds(options);
	const nodes: DrmNode[] = [];

	for (const recordId of recordIds) {
		const layout = NODE_LAYOUTS.get(recordId);
		if (!layout) {
			throw new DrmError(
				`レコードID "${recordId}" のノードレイアウトは未定義です（対応: ${
					[...NODE_LAYOUTS.keys()].join(', ')
				}）。`
			);
		}

		collectNodes(bytes, meshCode, recordId, layout, origin, nodes);
	}

	return nodes;
};

const getGeoJsonCrs = (inputs: DrmInput[], options: ToGeoJsonOptions): string =>
	options.crs ?? detectCrs(...inputs.map((input) => input.name));

const toLinkGeoJson = (
	inputs: DrmInput[],
	options: ToGeoJsonOptions = {}
): DrmFeatureCollection => {
	const features: DrmFeature[] = [];

	for (const input of inputs) {
		const meshCode = meshCodeFromFileName(input.name);

		for (const link of parseMesh(input.data, meshCode, options)) {
			if (link.coordinates.length < 2) continue;
			if (options.nationalRoadsOnly && link.properties.国道分類 === null) continue;

			features.push({
				type: 'Feature',
				properties: link.properties,
				geometry: { type: 'LineString', coordinates: link.coordinates }
			});
		}
	}

	return {
		type: 'FeatureCollection',
		crs: getGeoJsonCrs(inputs, options),
		features
	};
};

const toNodeGeoJson = (
	inputs: DrmInput[],
	options: ToGeoJsonOptions = {}
): DrmFeatureCollection => {
	const features: DrmFeature[] = [];

	for (const input of inputs) {
		const meshCode = meshCodeFromFileName(input.name);

		for (const node of parseNodeMesh(input.data, meshCode, options)) {
			features.push({
				type: 'Feature',
				properties: node.properties,
				geometry: { type: 'Point', coordinates: node.coordinate }
			});
		}
	}

	return {
		type: 'FeatureCollection',
		crs: getGeoJsonCrs(inputs, options),
		features
	};
};

export const toGeoJson = (
	inputs: DrmInput[],
	options: ToGeoJsonOptions = {}
): DrmFeatureCollection => {
	if (options.recordId && isNodeRecordId(options.recordId)) {
		return toNodeGeoJson(inputs, options);
	}

	const linkGeoJson = toLinkGeoJson(inputs, options);
	if (linkGeoJson.features.length > 0 || options.nationalRoadsOnly) {
		return linkGeoJson;
	}

	return toNodeGeoJson(inputs, options);
};
