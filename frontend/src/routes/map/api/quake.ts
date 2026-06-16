import { createGeoJsonPointEntry } from '$routes/map/data/entries/_factories/geojson';
import { createAdjustableRange } from '$routes/map/data/types';
import type { Tag } from '$routes/map/data/types/tags';
import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';
import type { VectorTemporalItem } from '$routes/map/data/types/vector/properties';
import type { ColorsExpression } from '$routes/map/data/types/vector/style';
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { PointGeometry } from '$routes/map/types/geometry';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';

// https://www.p2pquake.net/develop/json_api_v2/

// タイムスタンプ情報
interface Timestamp {
	convert: string;
	register: string;
}

// 基本的な共通フィールド
interface BaseEvent {
	id: string;
	time: string;
	code: number;
	cancelled?: boolean;
	timestamp?: Timestamp;
	user_agent?: string;
	ver?: string;
}

// 地震情報のイシュー情報
interface Issue {
	source: string;
	time: string;
	correct?: string;
	type?: string;
	eventId?: string;
	serial?: string;
}

// 震源情報
interface Hypocenter {
	depth: number; // -1 で不明
	latitude: number; // -200 で不明
	longitude: number; // -200 で不明
	magnitude: number; // -1 で不明
	name: string; // 空文字で不明
	reduceName?: string;
}

// 地震情報
interface Earthquake {
	domesticTsunami: string; // "None", "Checking", "Unknown"
	foreignTsunami: string; // "None", "Checking", "Unknown"
	hypocenter: Hypocenter;
	maxScale: number; // -1 で不明
	time: string;
	condition?: string;
	originTime?: string;
	arrivalTime?: string;
}

// 震度観測点情報
interface Point {
	addr: string;
	isArea: boolean;
	pref: string;
	scale: number;
}

// コメント情報
interface Comments {
	freeFormComment: string;
}

// 津波到達情報
interface FirstHeight {
	condition?: string;
	arrivalTime?: string;
}

// 津波高さ情報
interface MaxHeight {
	description: string;
	value: number;
}

// 津波エリア情報
interface TsunamiArea {
	grade: string;
	immediate: boolean;
	name: string;
	firstHeight?: FirstHeight;
	maxHeight?: MaxHeight;
}

// 緊急地震速報エリア情報
interface EEWArea {
	pref: string;
	name: string;
	scaleFrom: number;
	scaleTo: number;
	kindCode: string;
	arrivalTime: string | null;
}

// ピア情報
interface PeerArea {
	id: number;
	peer: number;
}

// 地震情報 (code: 551)
interface EarthquakeInformation extends BaseEvent {
	code: 551;
	issue: Issue;
	earthquake: Earthquake;
	points: Point[];
	comments: Comments;
}

// 津波情報 (code: 552)
interface TsunamiInformation extends BaseEvent {
	code: 552;
	issue: Issue;
	areas: TsunamiArea[];
}

// ピア情報 (code: 555)
interface PeerInformation extends BaseEvent {
	code: 555;
	areas: PeerArea[];
}

// 完全版情報 (code: 554)
interface FullInformation extends BaseEvent {
	code: 554;
	type: string;
}

// 緊急地震速報 (code: 556)
interface EEWInformation extends BaseEvent {
	code: 556;
	earthquake: Earthquake;
	issue: Issue;
	areas: EEWArea[];
}

// エリア情報 (code: 561)
interface AreaInformation extends BaseEvent {
	code: 561;
	area: number;
}

// 不明な情報形式
interface UnknownInformation extends BaseEvent {
	[key: string]: any;
}

// 全ての情報タイプのユニオン型
type EventInformation =
	| EarthquakeInformation
	| TsunamiInformation
	| PeerInformation
	| FullInformation
	| EEWInformation
	| AreaInformation
	| UnknownInformation;

// メインの配列型
type EventData = EventInformation[];

export interface QuakePointConfig {
	id: string;
	name: string;
	description: string;
	tags?: Tag[];
	downloadUrl?: string;
	mapImage?: string;
}

type QuakeFeatureProperties = {
	time: string;
	hypocenterName: string;
	magnitude?: number;
	depth?: number;
	maxScale?: number;
	maxScaleLabel: string;
	domesticTsunami: string;
	foreignTsunami: string;
	pointsCount: number;
	comment?: string;
};

const EMPTY_GEOJSON: FeatureCollection<PointGeometry, QuakeFeatureProperties> = {
	type: 'FeatureCollection',
	features: []
};

const EMPTY_GEOJSON_DATA_URL = `data:application/json;charset=utf-8,${encodeURIComponent(
	JSON.stringify(EMPTY_GEOJSON)
)}`;

const QUAKE_COLOR_EXPRESSIONS: ColorsExpression[] = [
	{
		type: 'single',
		key: '単色',
		name: '単色',
		mapping: {
			value: '#e31a1c',
			pattern: null
		}
	},
	{
		type: 'step',
		key: 'maxScale',
		name: '最大震度による色分け',
		mapping: {
			scheme: 'YlOrRd',
			range: createAdjustableRange(10, 70),
			divisions: 7
		}
	},
	{
		type: 'step',
		key: 'magnitude',
		name: 'マグニチュードによる色分け',
		mapping: {
			scheme: 'OrRd',
			range: createAdjustableRange(0, 8),
			divisions: 6
		}
	},
	{
		type: 'step',
		key: 'depth',
		name: '深さによる色分け',
		mapping: {
			scheme: 'BuPu',
			range: createAdjustableRange(0, 500),
			divisions: 6
		}
	}
];

const formatScaleLabel = (scale: number) => {
	if (scale < 0) return '不明';
	if (scale === 10) return '1';
	if (scale === 20) return '2';
	if (scale === 30) return '3';
	if (scale === 40) return '4';
	if (scale === 45) return '5弱';
	if (scale === 50) return '5強';
	if (scale === 55) return '6弱';
	if (scale === 60) return '6強';
	if (scale === 70) return '7';
	return String(scale);
};

const formatDepth = (depth: number) => (depth < 0 ? null : depth);
const formatMagnitude = (magnitude: number) => (magnitude < 0 ? null : magnitude);

const createGeoJsonBlobUrl = (geojson: FeatureCollection) =>
	URL.createObjectURL(new Blob([JSON.stringify(geojson)], { type: 'application/json' }));

const compactFeatureProperties = (
	properties: Record<string, string | number | boolean | null | undefined>
) =>
	Object.fromEntries(
		Object.entries(properties).filter(([, value]) => value !== null && value !== undefined)
	) as QuakeFeatureProperties;

const toTemporalItem = (time: string): VectorTemporalItem => ({
	raw: time,
	timestamp: Date.parse(time.replace(/\//g, '-').replace(' ', 'T') + '+09:00'),
	label: time
});

// 型ガード関数
export function isEarthquakeInformation(event: EventInformation): event is EarthquakeInformation {
	return event.code === 551;
}

export function isTsunamiInformation(event: EventInformation): event is TsunamiInformation {
	return event.code === 552;
}

export function isPeerInformation(event: EventInformation): event is PeerInformation {
	return event.code === 555;
}

export function isFullInformation(event: EventInformation): event is FullInformation {
	return event.code === 554;
}

export function isEEWInformation(event: EventInformation): event is EEWInformation {
	return event.code === 556;
}

export function isAreaInformation(event: EventInformation): event is AreaInformation {
	return event.code === 561;
}

export const getEarthquakeData = async (): Promise<EventData> => {
	try {
		const response = await fetch('https://api.p2pquake.net/v2/history?codes=551&limit=100');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data: EventData = await response.json();
		// 座標がおかしいものは排除
		const filteredData = data.filter((event) => {
			if (isEarthquakeInformation(event)) {
				return event.earthquake.hypocenter.latitude !== -200 && event.points.length > 0;
			}
			return false;
		});
		return filteredData;
	} catch (error) {
		console.error('Error fetching earthquake data:', error);
		throw new Error('Failed to fetch earthquake data');
	}
};

const buildEarthquakeFeature = (
	event: EarthquakeInformation
): Feature<PointGeometry, QuakeFeatureProperties> => ({
	type: 'Feature',
	id: event.id,
	geometry: {
		type: 'Point',
		coordinates: [event.earthquake.hypocenter.longitude, event.earthquake.hypocenter.latitude]
	},
	properties: compactFeatureProperties({
		time: event.time,
		hypocenterName: event.earthquake.hypocenter.name || '震源不明',
		magnitude: formatMagnitude(event.earthquake.hypocenter.magnitude),
		depth: formatDepth(event.earthquake.hypocenter.depth),
		maxScale: event.earthquake.maxScale < 0 ? null : event.earthquake.maxScale,
		maxScaleLabel: formatScaleLabel(event.earthquake.maxScale),
		domesticTsunami: event.earthquake.domesticTsunami,
		foreignTsunami: event.earthquake.foreignTsunami,
		pointsCount: event.points.length,
		comment: event.comments?.freeFormComment || undefined
	})
});

export const fetchEarthquakeGeoJson = async (): Promise<
	FeatureCollection<PointGeometry, QuakeFeatureProperties>
> => {
	const data = await getEarthquakeData();

	return {
		type: 'FeatureCollection',
		features: data.filter(isEarthquakeInformation).map(buildEarthquakeFeature)
	};
};

const createEarthquakePointEntry = (
	config: QuakePointConfig,
	url: string,
	temporalItems?: VectorTemporalItem[]
): PointEntry<GeoJsonMetaData> => {
	const entry = createGeoJsonPointEntry({
		id: config.id,
		name: config.name,
		url,
		format: 'geojson',
		attribution: 'P2P地震情報',
		location: '全国',
		description: config.description,
		downloadUrl: config.downloadUrl,
		tags: config.tags ?? ['地震'],
		zoom: { min: 3, max: 24 },
		xyzImageTile: 'zoom_8',
		mapImage: config.mapImage,
		fields: [
			{
				key: 'time',
				label: '発生時刻',
				type: 'datetime',
				format: {
					date: {
						inputPatterns: ['YYYY/MM/DD HH:mm:ss'],
						displayPattern: 'YYYY年M月D日 HH:mm:ss',
						invalidText: ''
					}
				}
			},
			{ key: 'hypocenterName', label: '震源地', type: 'string' },
			{ key: 'magnitude', label: 'マグニチュード', type: 'number', format: { digits: 1 } },
			{ key: 'depth', label: '深さ', type: 'number', unit: 'km' },
			{ key: 'maxScaleLabel', label: '最大震度', type: 'string' },
			{ key: 'pointsCount', label: '観測点数', type: 'integer' },
			{ key: 'domesticTsunami', label: '国内津波', type: 'string' },
			{ key: 'foreignTsunami', label: '海外津波', type: 'string' },
			{ key: 'comment', label: 'コメント', type: 'string' }
		],
		popupKeys: [
			'time',
			'hypocenterName',
			'magnitude',
			'depth',
			'maxScaleLabel',
			'pointsCount',
			'domesticTsunami',
			'foreignTsunami',
			'comment'
		],
		titleTemplate: '{hypocenterName}',
		opacity: 0.7,
		colors: QUAKE_COLOR_EXPRESSIONS,
		color: '#e31a1c',
		radius: 6
	});

	entry.style.colors.key = 'magnitude';

	entry.style.labels = {
		...entry.style.labels,
		key: 'hypocenterName',
		show: false,
		expressions: [
			{ key: 'hypocenterName', name: '震源地' },
			{ key: 'magnitude', name: 'マグニチュード' },
			{ key: 'maxScaleLabel', name: '最大震度' },
			{ key: 'time', name: '発生時刻' }
		]
	};

	entry.style.radius = {
		key: 'magnitude',
		expressions: [
			{
				type: 'single',
				key: '単一',
				name: '単一',
				mapping: {
					value: 6
				}
			},
			{
				type: 'linear',
				key: 'magnitude',
				name: 'マグニチュード',
				mapping: {
					range: createAdjustableRange(0, 8),
					values: [4, 14]
				}
			},
			{
				type: 'linear',
				key: 'depth',
				name: '深さ',
				mapping: {
					range: createAdjustableRange(0, 500),
					values: [12, 4]
				}
			}
		]
	};

	if (temporalItems && temporalItems.length > 0) {
		entry.properties.temporal = {
			dimension: {
				type: 'time',
				values: temporalItems.map((item) => item.raw),
				labels: temporalItems.map((item) => item.label)
			},
			behaviors: [{ type: 'filter', key: 'time' }],
			items: temporalItems
		};
		entry.properties.attributeView.timeKey = 'time';
	}

	return entry;
};

export const createEarthquakeFallbackEntry = (
	config: QuakePointConfig
): PointEntry<GeoJsonMetaData> => createEarthquakePointEntry(config, EMPTY_GEOJSON_DATA_URL);

export const loadEarthquakePointEntry = async (
	config: QuakePointConfig
): Promise<PointEntry<GeoJsonMetaData>> => {
	try {
		const geojson = await fetchEarthquakeGeoJson();
		const temporalItems = Array.from(
			new Set(geojson.features.map((feature) => feature.properties.time))
		)
			.map(toTemporalItem)
			.filter((item) => !Number.isNaN(item.timestamp))
			.sort((a, b) => a.timestamp - b.timestamp);
		const entry = createEarthquakePointEntry(config, createGeoJsonBlobUrl(geojson), temporalItems);
		GeojsonCache.set(entry.id, geojson);
		return entry;
	} catch (error) {
		console.error(`${config.name}エントリの初期化に失敗しました`, error);
		return createEarthquakeFallbackEntry(config);
	}
};
