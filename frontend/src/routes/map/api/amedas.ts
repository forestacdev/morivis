import { createGeoJsonPointEntry } from '$routes/map/data/entries/_factories/geojson';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import type { PointEntry, GeoJsonMetaData } from '$routes/map/data/types/vector';
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { PointGeometry } from '$routes/map/types/geometry';
import type { Tag } from '$routes/map/data/types/tags';

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

const EMPTY_GEOJSON_DATA_URL = `data:application/json;charset=utf-8,${encodeURIComponent(
	JSON.stringify(EMPTY_GEOJSON)
)}`;

const AMEDAS_STATION_TABLE_URL = 'https://www.jma.go.jp/bosai/amedas/const/amedastable.json';
const AMEDAS_LATEST_TIME_URL = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt';
const AMEDAS_DATA_BASE_URL = 'https://www.jma.go.jp/bosai/amedas/data/map';

const toDegrees = ([degree, minute]: [number, number]) => degree + minute / 60;

const toLatestTimestamp = (latestTimeText: string) => latestTimeText.replace(/[-:TZ+]/g, '').slice(0, 14);

const createGeoJsonBlobUrl = (geojson: FeatureCollection) =>
	URL.createObjectURL(new Blob([JSON.stringify(geojson)], { type: 'application/json' }));

const getObservationValue = (value: AmedasObservationValue) => (Array.isArray(value) ? value[0] : null);

const getObservationAqc = (value: AmedasObservationValue) => (Array.isArray(value) ? value[1] : null);

const compactFeatureProperties = (
	properties: Record<string, string | number | boolean | null | undefined>
) =>
	Object.fromEntries(
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

const fetchAmedasGeoJson = async (): Promise<FeatureCollection> => {
	const latestTimeResponse = await fetch(AMEDAS_LATEST_TIME_URL);
	if (!latestTimeResponse.ok) {
		throw new Error(`latest_time.txt の取得に失敗しました: ${latestTimeResponse.status}`);
	}

	const latestTimeText = (await latestTimeResponse.text()).trim();
	const latestTimestamp = toLatestTimestamp(latestTimeText);

	const [stationTableResponse, observationResponse] = await Promise.all([
		fetch(AMEDAS_STATION_TABLE_URL),
		fetch(`${AMEDAS_DATA_BASE_URL}/${latestTimestamp}.json`)
	]);

	if (!stationTableResponse.ok) {
		throw new Error(`amedastable.json の取得に失敗しました: ${stationTableResponse.status}`);
	}

	if (!observationResponse.ok) {
		throw new Error(`アメダス観測値の取得に失敗しました: ${observationResponse.status}`);
	}

	const stations = (await stationTableResponse.json()) as Record<string, AmedasStation>;
	const observations = (await observationResponse.json()) as Record<string, AmedasObservation>;

	return {
		type: 'FeatureCollection',
		features: Object.entries(observations)
			.map(([stationId, observation]) => {
				const station = stations[stationId];
				if (!station) return null;
				return buildAmedasFeature(stationId, station, observation, latestTimeText);
			})
			.filter((feature): feature is Feature<PointGeometry> => feature !== null)
	};
};

const createAmedasPointEntry = (
	config: JmaAmedasConfig,
	url: string
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
			{ key: 'precipitation10m', label: '10分降水量', type: 'number', unit: 'mm', format: { digits: 1 } },
			{ key: 'precipitation1h', label: '1時間降水量', type: 'number', unit: 'mm', format: { digits: 1 } },
			{ key: 'wind', label: '風速', type: 'number', unit: 'm/s', format: { digits: 1 } },
			{ key: 'windDirection', label: '風向', type: 'number' },
			{ key: 'snow', label: '積雪', type: 'number', unit: 'cm' },
			{ key: 'sun1h', label: '日照時間', type: 'number', unit: 'h', format: { digits: 1 } },
			{ key: 'pressure', label: '現地気圧', type: 'number', unit: 'hPa', format: { digits: 1 } }
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
		color: '#1d7ddc',
		radius: 5
	});

	entry.properties.attributeView.descriptionKey = 'nameKana';

	return entry;
};

export const createAmedasFallbackEntry = (
	config: JmaAmedasConfig
): PointEntry<GeoJsonMetaData> => createAmedasPointEntry(config, EMPTY_GEOJSON_DATA_URL);

export const loadAmedasPointEntry = async (
	config: JmaAmedasConfig
): Promise<PointEntry<GeoJsonMetaData>> => {
	try {
		const geojson = await fetchAmedasGeoJson();
		const entry = createAmedasPointEntry(config, createGeoJsonBlobUrl(geojson));
		GeojsonCache.set(entry.id, geojson);
		return entry;
	} catch (error) {
		console.error(`${config.name}エントリの初期化に失敗しました`, error);
		return createAmedasFallbackEntry(config);
	}
};
