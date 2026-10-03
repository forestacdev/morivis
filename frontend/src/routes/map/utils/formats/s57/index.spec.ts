import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseS57 } from '.';
import { formatS57 } from './definition';
import { checkS57File, isS57Update } from './files';
import { readRecords } from './iso8211';

const fixture = (name = 'test-chart.000') =>
	new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url)));
const mutate = (tag: string, edit: (bytes: Uint8Array, view: DataView) => void, index = 0) => {
	const bytes = fixture();
	const fields: Uint8Array[] = [];
	readRecords(bytes, (record, ddr) => {
		if (!ddr) fields.push(...(record.get(tag) ?? []));
	});
	const field = fields[index];
	edit(field, new DataView(field.buffer, field.byteOffset, field.byteLength));
	return bytes;
};

describe('S-57 ENC', () => {
	it('基本セルからWGS84の点・線・面と地物分類を取り出す', () => {
		const result = parseS57(fixture());
		expect(result.metadata).toEqual({
			name: 'test-chart',
			edition: '1',
			updateNumber: '0',
			issueDate: '20000101',
			scale: 10000,
			depthUnit: 1,
			soundingDatum: 16
		});
		expect(result.omittedNonSpatialCount).toBe(1);
		expect(result.geojson.features).toHaveLength(5);
		expect(result.classes).toEqual([
			{ code: 30, acronym: 'COALNE', name: 'Coastline', count: 1 },
			{ code: 42, acronym: 'DEPARE', name: 'Depth area', count: 1 },
			{ code: 75, acronym: 'LIGHTS', name: 'Light', count: 1 },
			{ code: 129, acronym: 'SOUNDG', name: 'Sounding', count: 2 }
		]);
	});
	it('端点と中間点を接続し、ORNT=2のラインを逆順にする', () => {
		const line = parseS57(fixture()).geojson.features.find(feature =>
			feature.properties.OBJL === 30
		)!;
		expect(line.geometry).toEqual({
			type: 'LineString',
			coordinates: [[4, 4], [4, 1], [1.5, 1], [1, 1]]
		});
	});
	it('面の穴を保持し、GeoJSONの外周と内周の向きをそろえる', () => {
		const feature = parseS57(fixture()).geojson.features[0];
		expect(feature.properties).toMatchObject({ DRVAL1: 1.5, DRVAL2: 20, OBJL_NAME: 'DEPARE' });
		expect(feature.geometry).toEqual({
			type: 'Polygon',
			coordinates: [
				[[1, 1], [1.5, 1], [4, 1], [4, 4], [1, 4], [1, 1]],
				[[2, 2], [2, 3], [3, 3], [3, 2], [2, 2]]
			]
		});
	});
	it('COMF/SOMFを適用し、複数の測深値を各点の属性に保存する', () => {
		const points = parseS57(fixture()).geojson.features.filter(feature =>
			feature.properties.OBJL === 129
		);
		expect(points.map(point => point.geometry)).toEqual([
			{ type: 'Point', coordinates: [1.25, 1.25] },
			{ type: 'Point', coordinates: [1.75, 1.75] }
		]);
		expect(points.map(point => point.properties.DEPTH)).toEqual([12.3, -0.5]);
		expect(points[0].properties).toMatchObject({
			DEPTH_UNIT: 1,
			SOUNDING_DATUM: 16,
			LNAM: '03e7000000030001'
		});
	});
	it.each([['test-chart.000', 'test-架空'], ['test-other.000', 'test-café']])(
		'Latin1と国内文字列を辞書名の属性へ変換する: %s',
		(file, national) => {
			const point = parseS57(fixture(file)).geojson.features.at(-1)!;
			expect(point.properties).toMatchObject({
				OBJNAM: 'test-café',
				NOBJNM: national,
				COLOUR: '3,4',
				ATTR_65000: 'test-unknown'
			});
			expect(JSON.parse(String(point.properties.FFPT))).toEqual([{
				LNAM: '03e7000000030001',
				RIND: 1,
				COMT: 'test-relation'
			}]);
		}
	);
	it('未登録の地物コードは番号を失わずに保持する', () => {
		const bytes = mutate('FRID', (_, view) => view.setUint16(7, 65000, true));
		expect(parseS57(bytes).geojson.features[0].properties).toMatchObject({
			OBJL: 65000,
			OBJL_NAME: 'OBJL_65000'
		});
	});
	it.each(
		[
			['DSID', 5, 2, '更新ファイル'],
			['FRID', 11, 3, '更新ファイル'],
			['VRID', 7, 2, '更新ファイル'],
			['DSPM', 5, 1, 'WGS84'],
			['DSPM', 15, 2, '経緯度'],
			['DSSI', 0, 4, 'Planar graph'],
			['DSSI', 2, 3, '文字コード'],
			['FSPT', 5, 255, 'エッジ参照'],
			['VRPT', 7, 255, '始点・終点']
		] as const
	)('%sの未対応・不正な値を拒否する', (tag, offset, value, message) => {
		expect(() =>
			parseS57(mutate(tag, bytes => {
				bytes[offset] = value;
			}))
		).toThrow(message);
	});
	it('参照先の欠損を部分成功にしない', () => {
		expect(() => parseS57(mutate('FSPT', (_, view) => view.setUint32(1, 999, true)))).toThrow(
			'空間参照先'
		);
	});
	it('複数の外周をMultiPolygonへ分ける', () => {
		const bytes = fixture();
		let node = 0;
		let feature = 0;
		readRecords(bytes, (fields, ddr) => {
			if (ddr) return;
			const coordinates = fields.get('SG2D')?.[0];
			if (coordinates && ++node >= 5 && node <= 8) {
				const view = new DataView(
					coordinates.buffer,
					coordinates.byteOffset,
					coordinates.byteLength
				);
				view.setInt32(4, view.getInt32(4, true) + 4_000_000, true);
			}
			const links = fields.get('FSPT')?.[0];
			if (links && ++feature === 1) { for (let i = 4; i < 8; i++) links[i * 8 + 6] = 1; }
		});
		const shape = parseS57(bytes).geojson.features[0].geometry;
		expect(shape.type).toBe('MultiPolygon');
		if (shape.type !== 'MultiPolygon') throw new Error('test-type');
		expect(shape.coordinates).toHaveLength(2);
		expect(shape.coordinates[1][0]).toEqual([[6, 2], [7, 2], [7, 3], [6, 3], [6, 2]]);
	});
	it('離れたラインを直線で結ばずMultiLineStringにする', () => {
		const bytes = mutate('FSPT', (_, view) => view.setUint32(9, 5, true), 1);
		const shape = parseS57(bytes).geojson.features[1].geometry;
		expect(shape).toEqual({
			type: 'MultiLineString',
			coordinates: [[[4, 4], [4, 1]], [[3, 2], [2, 2]]]
		});
	});
	it('DDRのASCII符号化をバイナリと誤読しない', () => {
		const bytes = fixture();
		readRecords(bytes, (fields, ddr) => {
			if (!ddr) return;
			const field = fields.get('FRID')![0];
			const start = new TextDecoder().decode(field).indexOf('(b11');
			field[start + 1] = 65;
		});
		expect(() => parseS57(bytes)).toThrow(/未対応|符号化/);
	});
	it('切れたファイル、改ざんされたdirectory、非S-57を拒否する', () => {
		const bytes = fixture();
		expect(() => parseS57(bytes.subarray(0, -1))).toThrow('ISO 8211');
		bytes[24 + 4] = 120;
		expect(() => parseS57(bytes)).toThrow('ISO 8211');
		expect(() => parseS57(new TextEncoder().encode('test-not-an-enc'))).toThrow('ISO 8211');
	});
	it('欠損した属性終端・倍率ゼロ・座標範囲外を拒否する', () => {
		expect(() =>
			parseS57(mutate('ATTF', bytes => {
				bytes[bytes.length - 2] = 0;
			}))
		).toThrow('ISO 8211');
		expect(() => parseS57(mutate('DSPM', (_, view) => view.setUint32(16, 0, true)))).toThrow(
			'倍率'
		);
		expect(() => parseS57(mutate('SG2D', (_, view) => view.setInt32(0, 100000000, true))))
			.toThrow('経緯度');
	});
	it('接続していない面を閉じた面と誤認しない', () => {
		expect(() =>
			parseS57(mutate('FSPT', bytes => {
				bytes[5] = 2;
			}))
		).toThrow('つながって');
	});
	it('入出力の容量・地物・頂点・レコードの上限を検査する', () => {
		expect(() => checkS57File({ name: 'test-chart.000', size: formatS57.limits.maxFileBytes }))
			.not.toThrow();
		expect(() =>
			checkS57File({ name: 'test-chart.000', size: formatS57.limits.maxFileBytes + 1 })
		).toThrow('64 MiB');
		for (
			const key of ['maxFeatures', 'maxVertices', 'maxSections', 'maxOutputBytes'] as const
		) {
			const original = formatS57.limits[key];
			Object.defineProperty(formatS57.limits, key, { value: 1, configurable: true });
			try {
				expect(() => parseS57(fixture())).toThrow(/上限|128 MiB/);
			} finally {
				Object.defineProperty(formatS57.limits, key, {
					value: original,
					configurable: true
				});
			}
		}
	});
	it('更新ファイルを拒否し、CATALOG.031は差分と混同しない', () => {
		expect(() => checkS57File({ name: 'test-chart.001', size: 1 })).toThrow('更新ファイル');
		expect(isS57Update({ name: 'CATALOG.031' })).toBe(false);
		expect(isS57Update({ name: 'test-chart.031' })).toBe(true);
	});
});
