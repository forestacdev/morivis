import { readFileSync } from 'node:fs';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { normalizeMapInfoGeoJson } from '.';
import { syntheticAttribute, syntheticDbf, syntheticTab } from './__fixtures__/builders';
import { convertMapInfoTab } from './convert';
import { parseMapInfoTab, type TabBytes } from './parser';

const source = JSON.parse(
	readFileSync(new URL('./__fixtures__/test-source.geojson', import.meta.url), 'utf8')
);
const fixtureFiles = (name: string) =>
	['tab', 'dat', 'map', 'id'].map(ext =>
		new File(
			[readFileSync(new URL(`./__fixtures__/${name}.${ext}`, import.meta.url))],
			`table.${ext}`
		)
	);
const convert = (name: string, crs?: string) => convertMapInfoTab(fixtureFiles(name), crs);

describe('MapInfo Native TAB', () => {
	it('TypeScriptで点・線・穴のある面と日本語・数値属性を読む', async () => {
		const result = await convert('test-native');
		expect(result.spatialStatus).toBe('resolved');
		expect(result.geojson.features.map(f => f.geometry.type)).toEqual([
			'Point',
			'LineString',
			'Polygon'
		]);
		expect(result.geojson.features.map(f => f.properties.name)).toEqual(
			source.features.map((f: { properties: { name: string; }; }) => f.properties.name)
		);
		expect(result.geojson.features.map(f => f.properties.value)).toEqual([12.5, -2, 0]);
		const polygon = result.geojson.features[2].geometry;
		if (polygon.type !== 'Polygon') throw new Error('test-polygon');
		expect(polygon.coordinates).toHaveLength(2);
		expect(result.omittedCount).toBe(0);
	});
	it('MAP内の投影座標系を読み、経緯度の軸順へ変換する', async () => {
		const result = await convert('test-projected');
		expect(result.geojson.features).toHaveLength(3);
		expect(result.spatialStatus).toBe('resolved');
		expect(result.sourceCrs).toBe('EPSG:3857');
		const point = result.geojson.features[0].geometry;
		if (point.type !== 'Point') throw new Error('test-point');
		expect(point.coordinates[0]).toBeCloseTo(2.5, 5);
		expect(point.coordinates[1]).toBeCloseTo(1.25, 5);
		expect(result.geojson.features[0].properties.name).toBe('架空ポイント');
	});
	it('NonEarthは緯度経度の範囲内でも決めつけず、選択された座標系で再変換する', async () => {
		const local = await convert('test-local');
		expect(local.geojson.features).toHaveLength(3);
		expect(local.spatialStatus).toBe('crs-missing');
		expect(local.sourceCrs).toBe('');
		const result = await convert('test-local', 'EPSG:4326');
		expect(result.spatialStatus).toBe('resolved');
		const point = result.geojson.features[0].geometry;
		if (point.type !== 'Point') throw new Error('test-point');
		expect(point.coordinates[0]).toBeCloseTo(2.5, 2);
	});
	it('不正な指定座標系で黙って登録しない', async () => {
		await expect(convert('test-local', 'test-invalid-crs')).rejects.toThrow('指定した座標系');
	});
});

describe('MapInfo conversion validation', () => {
	it('図形のない行だけを除外し、除外数を返す', () => {
		const result = normalizeMapInfoGeoJson({
			...source,
			features: [
				{ type: 'Feature', geometry: null, properties: { name: 'test-empty' } },
				...source.features
			]
		}, true);
		expect(result.omittedCount).toBe(1);
		expect(result.geojson.features).toHaveLength(3);
	});
	it('不正・空・範囲外の座標を拒否する', () => {
		expect(() => normalizeMapInfoGeoJson({}, true)).toThrow();
		expect(() => normalizeMapInfoGeoJson({ type: 'FeatureCollection', features: [] }, true))
			.toThrow('図形');
		for (const coordinates of [[500, 0], [NaN, 0], [0, 91]]) {
			expect(() =>
				normalizeMapInfoGeoJson({
					type: 'FeatureCollection',
					features: [{
						type: 'Feature',
						geometry: { type: 'Point', coordinates },
						properties: {}
					}]
				}, true)
			).toThrow();
		}
	});
});

const rawFixture = (name: string) => ({
	tab: readFileSync(new URL(`./__fixtures__/${name}.tab`, import.meta.url)),
	attributes: readFileSync(new URL(`./__fixtures__/${name}.dat`, import.meta.url)),
	map: readFileSync(new URL(`./__fixtures__/${name}.map`, import.meta.url)),
	id: readFileSync(new URL(`./__fixtures__/${name}.id`, import.meta.url))
});
const compareCoordinates = (a: unknown, b: unknown): void => {
	if (typeof a === 'number') {
		expect(a).toBeCloseTo(b as number, 7);
		return;
	}
	expect(Array.isArray(a) && Array.isArray(b)).toBe(true);
	expect((a as unknown[]).length).toBe((b as unknown[]).length);
	(a as unknown[]).forEach((value, i) => compareCoordinates(value, (b as unknown[])[i]));
};

describe('保存したGDAL 3.8.4の参照結果との比較', () => {
	it.each(['test-native', 'test-local', 'test-projected', 'test-shapes', 'test-blocks'])(
		'%sの元座標・属性を維持する',
		name => {
			const parsed = parseMapInfoTab(rawFixture(name));
			const expected = JSON.parse(
				readFileSync(
					new URL(`./__fixtures__/${name}.expected.json`, import.meta.url),
					'utf8'
				)
			);
			expect(parsed.geojson.features).toHaveLength(expected.features.length);
			parsed.geojson.features.forEach((f, i) => {
				expect(f.properties).toEqual(expected.features[i].properties);
				expect(f.geometry?.type).toBe(expected.features[i].geometry.type);
				if (!f.geometry || f.geometry.type === 'GeometryCollection') {
					throw new Error('test-geometry');
				}
				compareCoordinates(
					f.geometry.coordinates,
					expected.features[i].geometry.coordinates
				);
			});
		}
	);
});

describe('MAPバイナリの図形型と境界', () => {
	it.each([1, 2, 0x28, 0x29, 0x2b, 0x2c])('記号点 0x%s', type => {
		expect(parseMapInfoTab(syntheticTab(type)).geojson.features[0].geometry).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
	});
	it.each([4, 5, 0x31, 0x32, 0x40, 0x41])('圧縮・非圧縮・V450/V800の線 0x%s', type => {
		expect(parseMapInfoTab(syntheticTab(type)).geojson.features[0].geometry).toEqual({
			type: 'LineString',
			coordinates: [[1, 2], [4, 5]]
		});
	});
	it.each([0x2e, 0x2f, 0x3d, 0x3e])('V450/V800の面 0x%s', type => {
		expect(parseMapInfoTab(syntheticTab(type)).geojson.features[0].geometry).toEqual({
			type: 'Polygon',
			coordinates: [[[1, 2], [4, 2], [4, 5], [1, 2]]]
		});
	});
	it.each([0x34, 0x35, 0x43, 0x44])('複数点 0x%s', type => {
		expect(parseMapInfoTab(syntheticTab(type)).geojson.features[0].geometry).toEqual({
			type: 'MultiPoint',
			coordinates: [[1, 2], [4, 5]]
		});
	});
	it.each([0x37, 0x38, 0x46, 0x47])('複合図形 0x%s', type => {
		const geometry = parseMapInfoTab(syntheticTab(type)).geojson.features[0].geometry;
		expect(geometry?.type).toBe('GeometryCollection');
		if (geometry?.type !== 'GeometryCollection') throw new Error('test-collection');
		expect(geometry.geometries).toEqual([
			{ type: 'Polygon', coordinates: [[[1, 2], [3, 2], [3, 4], [1, 2]]] },
			{ type: 'LineString', coordinates: [[1, 2], [4, 5]] },
			{ type: 'MultiPoint', coordinates: [[1, 2], [4, 5]] }
		]);
	});
	it.each([0x13, 0x14, 0x16, 0x17, 0x19, 0x1a])('矩形・角丸矩形・楕円 0x%s', type => {
		const geometry = parseMapInfoTab(syntheticTab(type)).geojson.features[0].geometry;
		expect(geometry?.type).toBe('Polygon');
		if (geometry?.type !== 'Polygon') throw new Error('test-region');
		const ring = geometry.coordinates[0];
		expect(ring[0]).toEqual(ring.at(-1));
		expect(
			ring.every(([x, y]) => x >= 1 - 1e-8 && x <= 5 + 1e-8 && y >= 2 - 1e-8 && y <= 6 + 1e-8)
		).toBe(true);
	});
	it.each([0x0a, 0x0b])('円弧 0x%s', type => {
		const geometry = parseMapInfoTab(syntheticTab(type)).geojson.features[0].geometry;
		if (geometry?.type !== 'LineString') throw new Error('test-arc');
		expect(geometry.coordinates[0]).toEqual([5, 4]);
		compareCoordinates(geometry.coordinates.at(-1), [3, 6]);
	});
	it('未知の図形・不正ID・切れたMAP・属性・過剰な行数を拒否する', () => {
		for (
			const mutate of [
				(f: TabBytes) => {
					f.map[1044] = 0x3a;
				},
				(f: TabBytes) => {
					new DataView(f.id.buffer).setUint32(0, 100, true);
				},
				(f: TabBytes) => {
					f.map = f.map.slice(0, 1100);
				},
				(f: TabBytes) => {
					f.attributes = f.attributes.slice(0, -10);
				},
				(f: TabBytes) => {
					new DataView(f.attributes.buffer).setUint32(4, 500001, true);
				}
			]
		) {
			const fixture = syntheticTab();
			mutate(fixture);
			expect(() => parseMapInfoTab(fixture)).toThrow();
		}
	});
	it('巨大な頂点数は展開前に拒否する', () => {
		const fixture = syntheticTab(0x35);
		new DataView(fixture.map.buffer).setInt32(1053, 5000001, true);
		expect(() => parseMapInfoTab(fixture)).toThrow('点数');
	});
	it('座標ブロックの循環と終端切れを検知する', () => {
		for (const next of [0, 1536]) {
			const fixture = syntheticTab(0x35), v = new DataView(fixture.map.buffer);
			v.setInt32(1053, 80, true);
			v.setInt32(1540, next, true);
			expect(() => parseMapInfoTab(fixture)).toThrow('座標ブロック');
		}
	});
	it('属性だけの行と削除行を区別する', () => {
		const fixture = syntheticTab();
		fixture.id.fill(0);
		expect(parseMapInfoTab(fixture).geojson.features[0].geometry).toBeNull();
		const view = new DataView(fixture.attributes.buffer);
		fixture.attributes[view.getUint16(8, true)] = 42;
		expect(parseMapInfoTab(fixture).geojson.features).toHaveLength(0);
	});
	it('未知の投影は元座標を維持する', async () => {
		const fixture = syntheticTab();
		fixture.map[0x16d] = 99;
		const result = await convertMapInfoTab(toFiles(fixture));
		expect(result.spatialStatus).toBe('crs-missing');
		expect(result.geojson.features[0].geometry).toEqual({ type: 'Point', coordinates: [1, 2] });
	});
});

const toFiles = (f: TabBytes) =>
	Object.entries(f).map(([key, bytes]) =>
		new File([new Uint8Array(bytes)], `table.${key === 'attributes' ? 'dat' : key}`)
	);

describe('属性と埋め込み投影の補足', () => {
	it('DBFの文字列・数値・論理値・日付を読む', () => {
		expect(parseMapInfoTab(syntheticDbf()).geojson.features[0].properties).toEqual({
			name: 'test-dbf',
			amount: -12.5,
			active: 'T',
			day: '2001-01-02'
		});
	});
	it('TABと属性の列数不一致を拒否する', () => {
		const fixture = syntheticTab();
		const v = new DataView(fixture.attributes.buffer);
		v.setUint16(8, 33, true);
		expect(() => parseMapInfoTab(fixture)).toThrow();
	});
	it('アフィン付き投影を勝手に通常のCRSとして登録しない', async () => {
		const fixture = syntheticTab();
		fixture.map[512] = 1;
		expect((await convertMapInfoTab(toFiles(fixture))).spatialStatus).toBe('crs-missing');
	});
	it.each([1, 3, 7, 8])('TMの単位コード%sと偽東距・偽北距を換算する', async unit => {
		const fixture = syntheticTab(), v = new DataView(fixture.map.buffer);
		fixture.map[0x16d] = 8;
		fixture.map[0x16f] = unit;
		const params = [3, 0, 0.9996, 500, 10, 0];
		params.forEach((value, i) => v.setFloat64(0x190 + i * 8, value, true));
		const factors: Record<number, number> = { 1: 1000, 3: 0.3048, 7: 1, 8: 1200 / 3937 },
			factor = factors[unit];
		const expected = proj4(
			`+proj=tmerc +lon_0=3 +lat_0=0 +k=0.9996 +x_0=${500 * factor} +y_0=${
				10 * factor
			} +datum=WGS84 +to_meter=${factor}`,
			'EPSG:4326',
			[1, 2]
		);
		const result = await convertMapInfoTab(toFiles(fixture));
		expect(result.spatialStatus).toBe('resolved');
		const geometry = result.geojson.features[0].geometry;
		if (geometry.type !== 'Point') throw new Error('test-point');
		compareCoordinates(geometry.coordinates, expected);
	});
});

it('LargeIntの桁とDateTime・DBF時刻を保持する', () => {
	const big = new Uint8Array(8);
	new DataView(big.buffer).setBigInt64(0, 9007199254740993n, true);
	expect(
		parseMapInfoTab(syntheticAttribute('LargeInt', big)).geojson.features[0].properties?.value
	).toBe('9007199254740993');
	const date = new Uint8Array(8), v = new DataView(date.buffer);
	v.setInt16(0, 2001, true);
	date[2] = 2;
	date[3] = 3;
	v.setInt32(4, 3723004, true);
	expect(
		parseMapInfoTab(syntheticAttribute('DateTime', date)).geojson.features[0].properties?.value
	).toBe('2001-02-03T01:02:03.004');
	expect(
		parseMapInfoTab(syntheticAttribute('Time', new TextEncoder().encode('010203004'), false))
			.geojson.features[0].properties?.value
	).toBe('01:02:03.004');
	expect(
		parseMapInfoTab(
			syntheticAttribute('LargeInt', new TextEncoder().encode('9007199254740993'), false)
		).geojson.features[0].properties?.value
	).toBe('9007199254740993');
});
