import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { readAttributes, readTabHeader } from './attributes';
import { requireTab, TabReader } from './binary';
import { formatMapinfoTab } from './definition';
import { createGeometryReader } from './geometry';
import { mapProjection, readMapHeader } from './projection';

export interface TabBytes {
	tab: Uint8Array;
	attributes: Uint8Array;
	map: Uint8Array;
	id: Uint8Array;
}

export const parseMapInfoTab = (input: TabBytes) => {
	requireTab(
		Object.values(input).reduce((size, bytes) => size + bytes.length, 0)
			<= formatMapinfoTab.limits.maxDatasetBytes,
		'一式は256 MiB以下にしてください'
	);
	const tab = readTabHeader(input.tab), header = readMapHeader(input.map);
	const rows = readAttributes(input.attributes, tab);
	const ids = new TabReader(input.id);
	requireTab(
		input.id.length % 4 === 0 && input.id.length >= rows.length * 4,
		'IDの行数が属性と一致しません'
	);
	const geometry = createGeometryReader(input.map, header);
	const features: Feature<Geometry | null>[] = [];
	for (let i = 0; i < rows.length; i++) {
		const offset = ids.u32(), properties = rows[i];
		// 削除された行の古い図形参照は使わない。属性だけの行は正規化で除外数へ含める。
		if (!properties) continue;
		features.push({
			type: 'Feature',
			id: i + 1,
			geometry: geometry(offset, i + 1),
			properties
		});
	}
	return {
		geojson: { type: 'FeatureCollection', features } as FeatureCollection<Geometry | null>,
		sourceCrs: mapProjection(header) ?? ''
	};
};
