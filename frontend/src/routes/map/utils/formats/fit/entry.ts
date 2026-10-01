import bbox from '@turf/bbox';

import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
import {
	type FieldDef,
	formatDate,
	type VectorTemporalItem
} from '$routes/map/data/types/vector/properties';
import type { FeatureCollection } from '$routes/map/types/geojson';

const labels: Record<string, string> = {
	lon: '経度',
	lat: '緯度',
	ele: '標高 (m)',
	distance_meters: '累積距離 (m)',
	heart_rate_bpm: '心拍数 (bpm)',
	cadence: 'ケイデンス (rpm)',
	watts: 'パワー (W)',
	speed: '速度 (m/s)',
	temperature: '気温 (℃)',
	gps_accuracy: 'GPS精度 (m)',
	track_index: '軌跡番号',
	point_index: '計測点番号',
	point_count: '計測点数',
	name: '名称',
	point_type: 'コースポイント種別',
	source_format: '元の形式'
};

const timeFormat = {
	inputPatterns: ['YYYY-MM-DDTHH:mm:ssZ'],
	displayPattern: 'YYYY年M月D日 HH:mm:ss (UTC)',
	invalidText: ''
};

export const createFitEntry = async (geojson: FeatureCollection, name: string) => {
	const geometryType = geometryTypeToEntryType(geojson);
	if (!geometryType) throw new Error('選択したFITデータに表示できる地物がありません');
	const entry = await createGeoJsonEntry(
		geojson,
		geometryType,
		name,
		bbox(geojson) as [number, number, number, number],
		undefined,
		{ attribution: 'FIT' }
	);
	if (!entry) throw new Error('FITのエントリーを作成できませんでした');
	entry.metaData.description =
		'FITに記録されたGPS軌跡や計測点のデータ。移動経路や位置ごとの計測値を確認する際に利用できる。';
	entry.properties.fields = entry.properties.fields.map((field): FieldDef => {
		if (field.key === 'time' || field.key === 'end_time') {
			return {
				...field,
				label: field.key === 'time' ? '時刻' : '終了時刻',
				type: 'datetime',
				format: { date: timeFormat }
			};
		}
		return { ...field, label: labels[field.key] ?? field.label };
	});
	const items = new Map<string, VectorTemporalItem>();
	for (const feature of geojson.features) {
		const raw = feature.properties.time;
		if (typeof raw !== 'string' || !Number.isFinite(Date.parse(raw))) continue;
		items.set(raw, { raw, timestamp: Date.parse(raw), label: formatDate(raw, timeFormat) });
	}
	if (items.size) {
		const sorted = [...items.values()].sort((a, b) => a.timestamp - b.timestamp);
		entry.properties.temporal = {
			dimension: {
				type: 'time',
				values: sorted.map(item => item.raw),
				labels: sorted.map(item => item.label)
			},
			behaviors: [{ type: 'filter', key: 'time' }],
			items: sorted
		};
		entry.properties.attributeView.timeKey = 'time';
	}
	return entry;
};
