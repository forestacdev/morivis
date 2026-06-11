import { createGeoJsonPointEntry } from '$routes/map/data/entries/_factories/geojson';
import { DEFAULT_POINT_LABEL_STYLE } from '$routes/map/data/entries/vector/_style';
import { createAdjustableRange } from '$routes/map/data/types';
import type { Tag } from '$routes/map/data/types/tags';
import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';
import type { VectorTemporalItem } from '$routes/map/data/types/vector/properties';
import type { ColorsExpression } from '$routes/map/data/types/vector/style';
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { PointGeometry } from '$routes/map/types/geometry';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
export interface JmaAmedasConfig {
	id: string;
	name: string;
	description: string;
	tags?: Tag[];
	downloadUrl?: string;
	mapImage?: string;
}

type AmedasStation = {
	lat: [number, number];
	lon: [number, number];
	kjName?: string;
	knName?: string;
	enName?: string;
	type?: string;
	alt?: number;
	elems?: string;
};

type AmedasObservationValue = [number, number] | undefined;

type AmedasObservation = Record<string, AmedasObservationValue>;

const EMPTY_GEOJSON: FeatureCollection = {
	type: 'FeatureCollection',
	features: []
};

const EMPTY_GEOJSON_DATA_URL = `data:application/json;charset=utf-8,${
	encodeURIComponent(
		JSON.stringify(EMPTY_GEOJSON)
	)
}`;

const AMEDAS_STATION_TABLE_URL = 'https://www.jma.go.jp/bosai/amedas/const/amedastable.json';
const AMEDAS_LATEST_TIME_URL = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt';
const AMEDAS_DATA_BASE_URL = 'https://www.jma.go.jp/bosai/amedas/data/map';
const AMEDAS_DEFAULT_RECENT_STEP_COUNT = 18;

const toDegrees = ([degree, minute]: [number, number]) => degree + minute / 60;

const toLatestTimestamp = (latestTimeText: string) =>
	latestTimeText.replace(/[-:TZ+]/g, '').slice(0, 14);

const formatAmedasTimeLabel = (timestamp: string) => {
	const year = timestamp.slice(0, 4);
	const month = timestamp.slice(4, 6);
	const day = timestamp.slice(6, 8);
	const hour = timestamp.slice(8, 10);
	const minute = timestamp.slice(10, 12);
	return `${year}/${month}/${day} ${hour}:${minute} JST`;
};

const shiftTimestampByMinutes = (timestamp: string, diffMinutes: number) => {
	const year = Number(timestamp.slice(0, 4));
	const month = Number(timestamp.slice(4, 6)) - 1;
	const day = Number(timestamp.slice(6, 8));
	const hour = Number(timestamp.slice(8, 10));
	const minute = Number(timestamp.slice(10, 12));
	const second = Number(timestamp.slice(12, 14));
	const date = new Date(year, month, day, hour, minute, second);
	date.setMinutes(date.getMinutes() + diffMinutes);

	return [
		String(date.getFullYear()).padStart(4, '0'),
		String(date.getMonth() + 1).padStart(2, '0'),
		String(date.getDate()).padStart(2, '0'),
		String(date.getHours()).padStart(2, '0'),
		String(date.getMinutes()).padStart(2, '0'),
		String(date.getSeconds()).padStart(2, '0')
	].join('');
};

const createGeoJsonBlobUrl = (geojson: FeatureCollection) =>
	URL.createObjectURL(new Blob([JSON.stringify(geojson)], { type: 'application/json' }));

const AMEDAS_COLOR_EXPRESSIONS: ColorsExpression[] = [
	{
		type: 'single',
		key: '単色',
		name: '単色',
		mapping: {
			value: '#1f78b4',
			pattern: null
		}
	},
	{
		type: 'step',
		key: 'temp',
		name: '気温による色分け',
		mapping: {
			scheme: 'YlOrRd',
			range: createAdjustableRange(-15, 40),
			divisions: 7
		}
	},
	{
		type: 'step',
		key: 'humidity',
		name: '湿度による色分け',
		mapping: {
			scheme: 'Blues',
			range: createAdjustableRange(0, 100),
			divisions: 6
		}
	},
	{
		type: 'step',
		key: 'precipitation10m',
		name: '10分降水量による色分け',
		mapping: {
			scheme: 'PuBu',
			range: createAdjustableRange(0, 30),
			divisions: 6
		}
	},
	{
		type: 'step',
		key: 'precipitation1h',
		name: '1時間降水量による色分け',
		mapping: {
			scheme: 'PuBu',
			range: createAdjustableRange(0, 80),
			divisions: 6
		}
	},
	{
		type: 'step',
		key: 'wind',
		name: '風速による色分け',
		mapping: {
			scheme: 'YlGnBu',
			range: createAdjustableRange(0, 30),
			divisions: 6
		}
	},
	{
		type: 'step',
		key: 'snow',
		name: '積雪による色分け',
		mapping: {
			scheme: 'Greys',
			range: createAdjustableRange(0, 300),
			divisions: 6
		}
	},
	{
		type: 'step',
		key: 'pressure',
		name: '現地気圧による色分け',
		mapping: {
			scheme: 'BuPu',
			range: createAdjustableRange(960, 1040),
			divisions: 6
		}
	}
];

const getObservationValue = (value: AmedasObservationValue) =>
	Array.isArray(value) ? value[0] : null;

const getObservationAqc = (value: AmedasObservationValue) => Array.isArray(value) ? value[1] : null;

const compactFeatureProperties = (
	properties: Record<string, string | number | boolean | null | undefined>
) => Object.fromEntries(
	Object.entries(properties).filter(([, value]) => value !== null && value !== undefined)
) as Record<string, string | number | boolean>;

const buildAmedasFeature = (
	stationId: string,
	station: AmedasStation,
	observation: AmedasObservation,
	observationTime: string
): Feature<PointGeometry> => ({
	type: 'Feature',
	id: stationId,
	geometry: {
		type: 'Point',
		coordinates: [toDegrees(station.lon), toDegrees(station.lat)]
	},
	properties: compactFeatureProperties({
		stationId,
		name: station.kjName ?? station.enName ?? stationId,
		nameKana: station.knName,
		type: station.type,
		altitude: station.alt,
		observationTime,
		temp: getObservationValue(observation.temp),
		pressure: getObservationValue(observation.pressure),
		normalPressure: getObservationValue(observation.normalPressure),
		humidity: getObservationValue(observation.humidity),
		wind: getObservationValue(observation.wind),
		windDirection: getObservationValue(observation.windDirection),
		visibility: getObservationValue(observation.visibility),
		sun10m: getObservationValue(observation.sun10m),
		sun1h: getObservationValue(observation.sun1h),
		snow: getObservationValue(observation.snow),
		precipitation10m: getObservationValue(observation.precipitation10m),
		precipitation1h: getObservationValue(observation.precipitation1h),
		precipitation3h: getObservationValue(observation.precipitation3h),
		precipitation24h: getObservationValue(observation.precipitation24h),
		tempAqc: getObservationAqc(observation.temp),
		humidityAqc: getObservationAqc(observation.humidity),
		windAqc: getObservationAqc(observation.wind),
		precipitation10mAqc: getObservationAqc(observation.precipitation10m),
		precipitation1hAqc: getObservationAqc(observation.precipitation1h)
	})
});

let amedasStationTablePromise: Promise<Record<string, AmedasStation>> | null = null;
const amedasGeoJsonCache = new Map<string, FeatureCollection>();

const getAmedasStationTable = async () => {
	if (!amedasStationTablePromise) {
		amedasStationTablePromise = fetch(AMEDAS_STATION_TABLE_URL)
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(`amedastable.json の取得に失敗しました: ${response.status}`);
				}
				return (await response.json()) as Record<string, AmedasStation>;
			})
			.catch((error) => {
				amedasStationTablePromise = null;
				throw error;
			});
	}

	return amedasStationTablePromise;
};

export const getLatestAmedasTimestamp = async () => {
	const latestTimeResponse = await fetch(AMEDAS_LATEST_TIME_URL);
	if (!latestTimeResponse.ok) {
		throw new Error(`latest_time.txt の取得に失敗しました: ${latestTimeResponse.status}`);
	}

	const latestTimeText = (await latestTimeResponse.text()).trim();
	return toLatestTimestamp(latestTimeText);
};

export const getRecentAmedasTemporalItems = async (
	stepCount: number = AMEDAS_DEFAULT_RECENT_STEP_COUNT
): Promise<VectorTemporalItem[]> => {
	const latestTimestamp = await getLatestAmedasTimestamp();

	return Array.from({ length: stepCount }, (_, index) => {
		const raw = shiftTimestampByMinutes(latestTimestamp, -10 * index);
		return {
			raw,
			timestamp: Date.parse(
				`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${
					raw.slice(
						10,
						12
					)
				}:${raw.slice(12, 14)}+09:00`
			),
			label: formatAmedasTimeLabel(raw)
		};
	});
};

export const fetchAmedasGeoJsonByTimestamp = async (
	timestamp: string
): Promise<FeatureCollection> => {
	if (amedasGeoJsonCache.has(timestamp)) {
		return amedasGeoJsonCache.get(timestamp)!;
	}

	const [stations, observationResponse] = await Promise.all([
		getAmedasStationTable(),
		fetch(`${AMEDAS_DATA_BASE_URL}/${timestamp}.json`)
	]);

	if (!observationResponse.ok) {
		throw new Error(`アメダス観測値の取得に失敗しました: ${observationResponse.status}`);
	}

	const observations = (await observationResponse.json()) as Record<string, AmedasObservation>;

	const geojson = {
		type: 'FeatureCollection',
		features: Object.entries(observations)
			.map(([stationId, observation]) => {
				const station = stations[stationId];
				if (!station) return null;
				return buildAmedasFeature(
					stationId,
					station,
					observation,
					formatAmedasTimeLabel(timestamp)
				);
			})
			.filter((feature): feature is Feature<PointGeometry> => feature !== null)
	} satisfies FeatureCollection;

	amedasGeoJsonCache.set(timestamp, geojson);
	return geojson;
};

const createAmedasPointEntry = (
	config: JmaAmedasConfig,
	url: string,
	temporalItems?: VectorTemporalItem[]
): PointEntry<GeoJsonMetaData> => {
	const entry = createGeoJsonPointEntry({
		id: config.id,
		name: config.name,
		url,
		format: 'geojson',
		attribution: '気象庁',
		location: '全国',
		description: config.description,
		downloadUrl: config.downloadUrl,
		tags: config.tags ?? ['気象', '地図'],
		zoom: { min: 3, max: 24 },
		xyzImageTile: 'zoom_7',
		mapImage: config.mapImage,
		fields: [
			{ key: 'observationTime', label: '観測時刻', type: 'string' },
			{ key: 'temp', label: '気温', type: 'number', unit: '℃', format: { digits: 1 } },
			{ key: 'humidity', label: '湿度', type: 'number', unit: '%' },
			{
				key: 'precipitation10m',
				label: '10分降水量',
				type: 'number',
				unit: 'mm',
				format: { digits: 1 }
			},
			{
				key: 'precipitation1h',
				label: '1時間降水量',
				type: 'number',
				unit: 'mm',
				format: { digits: 1 }
			},
			{ key: 'wind', label: '風速', type: 'number', unit: 'm/s', format: { digits: 1 } },
			{ key: 'windDirection', label: '風向', type: 'number' },
			{ key: 'snow', label: '積雪', type: 'number', unit: 'cm' },
			{ key: 'sun1h', label: '日照時間', type: 'number', unit: 'h', format: { digits: 1 } },
			{
				key: 'pressure',
				label: '現地気圧',
				type: 'number',
				unit: 'hPa',
				format: { digits: 1 }
			}
		],
		popupKeys: [
			'observationTime',
			'temp',
			'humidity',
			'precipitation10m',
			'precipitation1h',
			'wind',
			'windDirection',
			'snow',
			'sun1h',
			'pressure'
		],
		titleTemplate: '{name}',
		opacity: 0.7,
		colors: AMEDAS_COLOR_EXPRESSIONS,
		color: '#1d7ddc',
		radius: 5
	});

	entry.style.colors.key = 'temp';
	entry.style.outline.show = false;

	entry.style.labels = {
		...entry.style.labels,
		key: 'temp',
		show: true,
		expressions: [
			{ key: 'temp', name: '気温' },
			{ key: 'humidity', name: '湿度' },
			{ key: 'precipitation10m', name: '10分降水量' },
			{ key: 'precipitation1h', name: '1時間降水量' },
			{ key: 'wind', name: '風速' },
			{ key: 'snow', name: '積雪' },
			{ key: 'pressure', name: '現地気圧' },
			{ key: 'observationTime', name: '観測時刻' },
			{ key: 'name', name: '観測所名' }
		]
	};
	entry.style.radius = {
		key: 'temp',
		expressions: [
			{
				type: 'single',
				key: '単一',
				name: '単一',
				mapping: {
					value: 5
				}
			},
			{
				type: 'linear',
				key: 'temp',
				name: '気温',
				mapping: {
					range: createAdjustableRange(-15, 40),
					values: [3, 12]
				}
			},
			{
				type: 'linear',
				key: 'humidity',
				name: '湿度',
				mapping: {
					range: createAdjustableRange(0, 100),
					values: [3, 11]
				}
			},
			{
				type: 'linear',
				key: 'precipitation10m',
				name: '10分降水量',
				mapping: {
					range: createAdjustableRange(0, 30),
					values: [3, 13]
				}
			},
			{
				type: 'linear',
				key: 'precipitation1h',
				name: '1時間降水量',
				mapping: {
					range: createAdjustableRange(0, 80),
					values: [3, 13]
				}
			},
			{
				type: 'linear',
				key: 'wind',
				name: '風速',
				mapping: {
					range: createAdjustableRange(0, 30),
					values: [3, 12]
				}
			},
			{
				type: 'linear',
				key: 'snow',
				name: '積雪',
				mapping: {
					range: createAdjustableRange(0, 300),
					values: [3, 14]
				}
			},
			{
				type: 'linear',
				key: 'pressure',
				name: '現地気圧',
				mapping: {
					range: createAdjustableRange(960, 1040),
					values: [4, 10]
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
			behaviors: [{ type: 'source' }]
		};
		entry.state = {
			...entry.state,
			dimension: {
				currentIndex: 0
			}
		};
		entry.format.runtimeSource = {
			type: 'geojson',
			resolveData: fetchAmedasGeoJsonByTimestamp
		};
	}

	entry.style.default = {
		...entry.style.default,
		symbol: DEFAULT_POINT_LABEL_STYLE
	};

	return entry;
};

export const createAmedasFallbackEntry = (config: JmaAmedasConfig): PointEntry<GeoJsonMetaData> =>
	createAmedasPointEntry(config, EMPTY_GEOJSON_DATA_URL);

export const loadAmedasPointEntry = async (
	config: JmaAmedasConfig
): Promise<PointEntry<GeoJsonMetaData>> => {
	try {
		const temporalItems = await getRecentAmedasTemporalItems();
		const initialTimestamp = temporalItems[0]?.raw ?? (await getLatestAmedasTimestamp());
		const geojson = await fetchAmedasGeoJsonByTimestamp(initialTimestamp);
		const entry = createAmedasPointEntry(config, createGeoJsonBlobUrl(geojson), temporalItems);
		GeojsonCache.set(entry.id, geojson);
		return entry;
	} catch (error) {
		console.error(`${config.name}エントリの初期化に失敗しました`, error);
		return createAmedasFallbackEntry(config);
	}
};
