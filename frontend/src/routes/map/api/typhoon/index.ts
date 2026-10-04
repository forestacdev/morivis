import { DEFAULT_SYMBOL_TEXT_FONT } from '$routes/constants';
import { createGeoJsonLineEntry } from '$routes/map/data/entries/_factories/geojson';
import type { FieldDef } from '$routes/map/data/types/vector/properties';
import type { ColorsExpression } from '$routes/map/data/types/vector/style';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { emptyTyphoonData, type TyphoonData } from './types';

export const TYPHOON_BASE_URL = 'https://www.jma.go.jp/bosai/typhoon/data';
const PAGE_URL = 'https://www.jma.go.jp/bosai/map.html#contents=typhoon';
const ENTRY_ID = 'jma_typhoon_tracks';
const CENTER_SOURCE_ID = `${ENTRY_ID}_centers_source`;
const combineLines = (data: TyphoonData): FeatureCollection => ({
	type: 'FeatureCollection',
	features: [...data.tracks.features, ...data.circles.features]
});
const fields: FieldDef[] = [
	{ key: 'label', label: '台風', type: 'string' },
	{ key: 'kind', label: '情報種別', type: 'string' },
	{ key: 'typhoon_number', label: '台風番号', type: 'string' },
	{ key: 'issue_time', label: '発表時刻 (UTC)', type: 'string' },
	{ key: 'valid_time', label: '対象時刻 (UTC)', type: 'string' },
	{ key: 'forecast_hours', label: '予報時間', type: 'number', unit: '時間後' },
	{ key: 'radius_km', label: '予報円の半径', type: 'number', unit: 'km' },
	{ key: 'probability', label: '中心が円内に入る確率', type: 'number', unit: '%' }
];
const colors: ColorsExpression[] = [
	{
		type: 'match',
		key: 'kind',
		name: '情報種別',
		mapping: {
			categories: ['実況経路', '発達前の経路', '予報中心線', '予報円', '予報円の接線'],
			values: ['#1f78b4', '#a6cee3', '#ff7f00', '#ff7f00', '#ff7f00'],
			patterns: Array(5).fill(null)
		}
	}
];

export const createTyphoonEntry = (data: TyphoonData = emptyTyphoonData()) => {
	const geojson = combineLines(data);
	const entry = createGeoJsonLineEntry({
		id: ENTRY_ID,
		name: '台風（実況・予報）',
		description:
			'気象庁の台風情報から作成した進路・予報円・中心位置のデータ。発表時刻と予報対象時刻を確認しながら、台風の移動と中心が入る確率70％の範囲を地図に重ねる際に利用できる。',
		url: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(geojson))}`,
		format: 'geojson',
		attribution: '気象庁',
		location: '世界',
		bounds: [100, 0, 180, 65],
		downloadUrl: PAGE_URL,
		tags: ['気象', '地図'],
		zoom: { min: 0, max: 24 },
		xyzImageTile: 'zoom_0',
		fields: fields.map((field) => ({ ...field })),
		titleTemplate: '{label}',
		colors: structuredClone(colors),
		opacity: 1,
		width: 2,
		lineStyle: 'solid'
	});

	// 中心位置は親エントリーと一緒に追加・削除・表示切替される補助表示。
	// 不透明度は固定せず、共通のspec生成で親の値を引き継ぐ。
	entry.auxiliaryLayers = {
		sources: {
			[CENTER_SOURCE_ID]: { type: 'geojson', data: data.centers }
		},
		layers: [
			{
				id: `${ENTRY_ID}_centers`,
				type: 'circle',
				source: CENTER_SOURCE_ID,
				clickable: true,
				paint: {
					'circle-radius': 6,
					'circle-color': ['match', ['get', 'kind'], '実況', '#e31a1c', '#ff7f00']
				}
			},
			{
				id: `${ENTRY_ID}_center_labels`,
				type: 'symbol',
				source: CENTER_SOURCE_ID,
				layout: {
					'text-field': ['get', 'label'],
					'text-font': DEFAULT_SYMBOL_TEXT_FONT,
					'text-size': 12,
					'text-anchor': 'bottom',
					'text-offset': [0, -0.8]
				},
				paint: {
					'text-color': '#ffffff',
					'text-halo-color': '#333333',
					'text-halo-width': 1
				}
			}
		]
	};
	return entry;
};

export const parseTyphoonTargets = (data: unknown): string[] => {
	if (!Array.isArray(data) || data.length > 30) throw new Error('台風一覧の形式が変わっています');
	const ids = data.map((value) => {
		const id: unknown = value?.tropicalCyclone;
		if (typeof id !== 'string' || !/^TC\d{4,8}$/.test(id)) {
			throw new Error('台風一覧の識別番号を読み取れません');
		}
		return id;
	});
	return [...new Set(ids)];
};
const fetchJson = async (url: string): Promise<unknown> => {
	const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
	if (!response.ok) {
		throw new Error(`気象庁の台風データを取得できませんでした (${response.status})`);
	}
	const raw = await response.text();
	if (raw.length > 2 * 1024 * 1024) throw new Error('台風データが読み込み上限を超えています');
	return JSON.parse(raw);
};

export const fetchTyphoonData = async (): Promise<TyphoonData> => {
	const { convertTyphoonForecast } = await import('./convert');
	const ids = parseTyphoonTargets(await fetchJson(`${TYPHOON_BASE_URL}/targetTc.json`));
	const result = emptyTyphoonData();
	// 複数の台風は同時4件まで取得し、一部の取得失敗を「台風なし」にしない。
	for (let i = 0; i < ids.length; i += 4) {
		const forecasts = await Promise.all(
			ids
				.slice(i, i + 4)
				.map(async (id) =>
					convertTyphoonForecast(await fetchJson(`${TYPHOON_BASE_URL}/${id}/forecast.json`), id)
				)
		);
		for (const forecast of forecasts) {
			for (const kind of ['centers', 'tracks', 'circles'] as const) {
				result[kind].features.push(...forecast[kind].features);
			}
		}
	}
	return result;
};
let snapshot: { at: number; data: TyphoonData } | undefined;
let inflight: Promise<TyphoonData> | undefined;
const currentData = async () => {
	if (snapshot && Date.now() - snapshot.at < 60_000) return snapshot.data;
	if (inflight) return inflight;
	inflight = fetchTyphoonData()
		.then((data) => {
			snapshot = { at: Date.now(), data };
			return data;
		})
		.finally(() => {
			inflight = undefined;
		});
	return inflight;
};
export const loadTyphoonEntry = async () => {
	const data = await currentData();
	const entry = createTyphoonEntry(data);
	GeojsonCache.set(entry.id, combineLines(data));
	if (!data.centers.features.length) {
		entry.metaData.description += ' 現在発表中の対象はありません。';
	}
	return entry;
};
