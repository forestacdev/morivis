import bbox from '@turf/bbox';

import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
import {
	type FieldDef,
	formatDate,
	type VectorTemporalItem
} from '$routes/map/data/types/vector/properties';
import type { FeatureCollection } from '$routes/map/types/geojson';

const labels: Record<string, string> = {
	time_utc: '時刻 (UTC)',
	start_time_utc: '開始時刻 (UTC)',
	end_time_utc: '終了時刻 (UTC)',
	altitude_msl: '平均海面からの高度 (m)',
	geoid_separation: 'ジオイド高 (m)',
	speed: '対地速度 (m/s)',
	course_true: '対地針路 (度・真北)',
	hdop: 'HDOP',
	satellites: '衛星数',
	fix_type: '測位種別',
	sentence: 'センテンス',
	talker: 'トーカーID',
	track_index: '軌跡番号',
	point_index: '計測点番号',
	point_count: '計測点数',
	source_format: '元の形式'
};

const timeFormat = {
	inputPatterns: ['YYYY-MM-DDTHH:mm:ss.SSSZ'],
	displayPattern: 'YYYY年M月D日 HH:mm:ss.SSS (UTC)',
	invalidText: ''
};

export const createNmeaEntry = async (geojson: FeatureCollection, name: string) => {
	const geometryType = geometryTypeToEntryType(geojson);
	if (!geometryType) throw new Error('選択したNMEA 0183データに表示できる地物がありません');
	const entry = await createGeoJsonEntry(
		geojson,
		geometryType,
		name,
		bbox(geojson) as [number, number, number, number],
		undefined,
		{ attribution: 'NMEA 0183' }
	);
	if (!entry) throw new Error('NMEA 0183のエントリーを作成できませんでした');
	entry.metaData.description =
		'NMEA 0183に記録されたGNSS軌跡や計測点のデータ。移動経路や位置ごとの計測値を確認する際に利用できる。';
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
