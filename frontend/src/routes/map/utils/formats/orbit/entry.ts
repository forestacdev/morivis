import bbox from '@turf/bbox';

import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
import {
	type FieldDef,
	formatDate,
	type VectorTemporalItem
} from '$routes/map/data/types/vector/properties';
import type { FeatureCollection } from '$routes/map/types/geojson';

const labels: Record<string, string> = {
	satellite_id: '衛星番号',
	epoch: '軌道要素の基準時刻',
	name: '名称',
	height: '楕円体高 (m)',
	source_format: '元の形式',
	segment: '軌跡区間',
	point_count: '位置の数',
	start_time: '開始時刻'
};

const timeFormat = {
	inputPatterns: ['YYYY-MM-DDTHH:mm:ss.SSSZ'],
	displayPattern: 'YYYY年M月D日 HH:mm:ss.SSS (UTC)',
	invalidText: ''
};

export const createOrbitEntry = async (
	geojson: FeatureCollection,
	name: string
) => {
	const geometryType = geometryTypeToEntryType(geojson);
	if (!geometryType) throw new Error('選択したTLE / OMMデータに表示できる地物がありません');
	const entry = await createGeoJsonEntry(
		geojson,
		geometryType,
		name,
		bbox(geojson) as [number, number, number, number],
		undefined,
		{ attribution: 'TLE / OMM' }
	);
	if (!entry) throw new Error('TLE / OMMのエントリーを作成できませんでした');
	entry.metaData.description =
		'TLE / OMMの軌道要素から計算した衛星の地上位置と軌跡のデータ。指定期間の衛星位置や通過経路を確認する際に利用できる。';
	entry.properties.fields = entry.properties.fields.map((field): FieldDef => {
		if (['time', 'end_time', 'start_time', 'epoch'].includes(field.key)) {
			return {
				...field,
				label: field.key === 'time'
					? '時刻'
					: field.key === 'start_time'
					? '開始時刻'
					: field.key === 'epoch'
					? '軌道要素の基準時刻'
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
		entry.state = {
			...entry.state,
			temporalFilter: { enabled: true, mode: 'single_start', startIndex: 0, endIndex: 0 }
		};
	}
	return entry;
};
