import bbox from '@turf/bbox';

import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
import {
	type FieldDef,
	formatDate,
	type VectorTemporalItem
} from '$routes/map/data/types/vector/properties';
import type { FeatureCollection } from '$routes/map/types/geojson';

const labels: Record<string, string> = {
	mmsi: 'MMSI',
	name: '船名',
	callsign: '呼出符号',
	imo: 'IMO番号',
	ship_type: '船種',
	destination: '目的地',
	draught: '喫水 (m)',
	speed: '対地速度 (ノット)',
	course: '対地針路 (度)',
	heading: '船首方位 (度)',
	nav_status: '航海状態',
	utc_second: 'AIS内のUTC秒',
	message_type: 'AISメッセージ種別',
	source: '受信局',
	channel: '受信チャネル',
	time_source: '時刻の記録元',
	sentence: 'センテンス',
	line: 'ログ行番号',
	segment: '航跡区間',
	point_count: '位置報告数',
	start_time: '開始時刻',
	end_time: '終了時刻',
	source_format: '元の形式'
};

const timeFormat = {
	inputPatterns: ['YYYY-MM-DDTHH:mm:ss.SSSZ'],
	displayPattern: 'YYYY年M月D日 HH:mm:ss.SSS (UTC)',
	invalidText: ''
};

export const createAisEntry = async (geojson: FeatureCollection, name: string) => {
	const geometryType = geometryTypeToEntryType(geojson);
	if (!geometryType) throw new Error('選択したAISデータに表示できる地物がありません');
	const entry = await createGeoJsonEntry(
		geojson,
		geometryType,
		name,
		bbox(geojson) as [number, number, number, number],
		undefined,
		{ attribution: 'AIS' }
	);
	if (!entry) throw new Error('AISのエントリーを作成できませんでした');
	entry.metaData.description =
		'AISログに記録された船舶の位置と航跡のデータ。船舶ごとの移動経路や航海情報を確認する際に利用できる。';
	entry.properties.fields = entry.properties.fields.map((field): FieldDef => {
		if (field.key === 'time' || field.key === 'end_time' || field.key === 'start_time') {
			return {
				...field,
				label: field.key === 'time'
					? '受信時刻'
					: field.key === 'start_time'
					? '開始時刻'
					: '終了時刻',
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
