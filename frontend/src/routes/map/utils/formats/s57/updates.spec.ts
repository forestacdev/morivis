import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseS57 } from '.';
import { formatS57 } from './definition';
import { getS57Datasets, isS57Update, S57_FILE_ACCEPT } from './files';
import { type Fields, readRecords } from './iso8211';
import { readUpdatedRecords, type S57UpdateInput } from './updates';

const fixture = (name = 'test-chart.000') =>
	new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url)));
const update = (number = 1): S57UpdateInput => ({
	name: `test-chart.${String(number).padStart(3, '0')}`,
	bytes: fixture(`test-chart.${String(number).padStart(3, '0')}`)
});
const edit = (
	input: S57UpdateInput,
	tag: string,
	apply: (bytes: Uint8Array, view: DataView) => void,
	index = 0
) => {
	let found = 0;
	readRecords(input.bytes, (fields, ddr) => {
		if (ddr) return;
		for (const bytes of fields.get(tag) ?? []) {
			if (found++ === index) {
				apply(bytes, new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength));
			}
		}
	});
	return input;
};
const merged = (updates: S57UpdateInput[]) => {
	const result: Fields[] = [];
	readUpdatedRecords(fixture(), updates, (fields, ddr) => {
		if (!ddr) result.push(fields);
	});
	return result;
};

describe('S-57更新差分', () => {
	it('地物と空間レコードの追加・変更・削除を適用する', () => {
		const result = parseS57(fixture(), [update()]);
		expect(result.metadata).toMatchObject({
			name: 'test-chart',
			edition: '1',
			updateNumber: '1',
			issueDate: '20000102',
			scale: 10000
		});
		expect(result.geojson.features).toHaveLength(5);
		expect(result.geojson.features.some(f => f.properties.RCID === 2)).toBe(false);
		const light = result.geojson.features.find(f => f.properties.RCID === 4)!;
		expect(light.geometry).toEqual({ type: 'Point', coordinates: [2.5, 1.5] });
		expect(light.properties).toMatchObject({
			OBJNAM: 'test-updated',
			NOBJNM: 'test-更新',
			INFORM: 'test-new',
			ATTR_65000: 'test-unknown',
			RVER: 2
		});
		expect(light.properties).not.toHaveProperty('COLOUR');
		expect(JSON.parse(String(light.properties.FFPT))).toEqual([{
			LNAM: '03e7000000060001',
			RIND: 1,
			COMT: 'test-replaced'
		}]);
		expect(result.geojson.features.find(f => f.properties.RCID === 6)?.properties.OBJNAM).toBe(
			'test-added'
		);
		expect(
			result.geojson.features.filter(f => f.properties.OBJL === 129).map(f =>
				f.properties.DEPTH
			)
		).toEqual([45.6, -0.5]);
		const polygon = result.geojson.features.find(f => f.properties.OBJL === 42)!;
		expect(polygon.geometry).toEqual({
			type: 'Polygon',
			coordinates: [
				[[1, 1], [1.5, 1], [1.75, 1], [4, 1], [4, 2], [4, 4], [1, 4], [1, 1]],
				[[2, 2], [2, 3], [3, 3], [3, 2], [2, 2]]
			]
		});
		const records = merged([update()]);
		expect(records.some(fields => {
			const id = fields.get('VRID')?.[0];
			return id?.[0] === 110 && id[1] === 2;
		})).toBe(false);
		const edge = records.find(fields =>
			fields.get('VRID')?.[0][0] === 130 && fields.get('VRID')?.[0][1] === 8
		)!;
		expect(edge.get('VRPT')![0][10]).toBe(9);
	});
	it('連番を順に適用し、座標・属性・参照の削除と挿入を扱う', () => {
		const result = parseS57(fixture(), [update(2), update(1)]);
		expect(result.metadata.updateNumber).toBe('2');
		expect(result.geojson.features).toHaveLength(4);
		const light = result.geojson.features.find(f => f.properties.RCID === 4)!;
		expect(light.properties).not.toHaveProperty('NOBJNM');
		expect(light.properties.RVER).toBe(4);
		expect(JSON.parse(String(light.properties.FFPT))[0].COMT).toBe('test-inserted');
		expect(result.geojson.features.find(f => f.properties.RCID === 6)!.geometry).toEqual({
			type: 'Point',
			coordinates: [1.25, 1.25]
		});
	});
	it('更新ファイルのDDRにDSPMがなくても基本セルの座標倍率を使用する', () => {
		readRecords(update().bytes, (fields, ddr) => {
			if (ddr) expect(fields.has('DSPM')).toBe(false);
		});
		expect(
			parseS57(fixture(), [update()]).geojson.features.find(f => f.properties.OBJL === 129)
				?.properties.DEPTH
		).toBe(45.6);
	});
	it('更新単独、更新番号の欠落・重複を拒否する', () => {
		expect(() => parseS57(update().bytes)).toThrow();
		expect(() => parseS57(fixture(), [update(2)])).toThrow('.001が必要');
		expect(() => parseS57(fixture(), [update(), update()])).toThrow('連続');
	});
	it('外部ファイル名と内部のセル名・更新番号を照合する', () => {
		expect(() => parseS57(fixture(), [{ ...update(), name: 'test-other.001' }])).toThrow(
			'セル名'
		);
		expect(() => parseS57(fixture(), [{ ...update(), name: 'test-chart.002' }])).toThrow(
			'更新番号'
		);
	});
	it.each([
		['版', '\x1f1\x1f1\x1f', '\x1f2\x1f1\x1f', '版'],
		['取消', '\x1f1\x1f1\x1f', '\x1f0\x1f1\x1f', '取り消す'],
		['更新番号', '\x1f1\x1f1\x1f', '\x1f1\x1f2\x1f', '更新番号']
	])('%sの不整合を拒否する', (_, before, after, message) => {
		const patched = edit(update(), 'DSID', bytes => {
			const start = new TextDecoder().decode(bytes).indexOf(before);
			expect(start).toBeGreaterThan(0);
			bytes.set(new TextEncoder().encode(after), start);
		});
		expect(() => parseS57(fixture(), [patched])).toThrow(message);
	});
	it('異なる文字コードの差分を混ぜない', () => {
		expect(() =>
			parseS57(fixture(), [edit(update(), 'DSSI', bytes => {
				bytes[2] = 1;
			})])
		).toThrow('文字コード');
	});
	it.each(['FSPC', 'FFPC', 'VRPC', 'SGCC'])('%sの範囲外・件数違い・不明命令を拒否する', tag => {
		for (const [offset, value] of [[1, 0], [1, 65535], [3, 99]]) {
			const patched = edit(update(), tag, (_, view) => view.setUint16(offset, value, true));
			expect(() => parseS57(fixture(), [patched])).toThrow(/範囲外|項目数/);
		}
		expect(() =>
			parseS57(fixture(), [edit(update(), tag, bytes => {
				bytes[0] = 9;
			})])
		).toThrow('範囲外');
	});
	it('欠損した更新対象とRVERの不連続を拒否する', () => {
		expect(() =>
			parseS57(fixture(), [edit(update(), 'VRID', (_, view) => view.setUint32(1, 999, true))])
		).toThrow('更新対象');
		expect(() =>
			parseS57(fixture(), [edit(update(), 'FRID', (_, view) => view.setUint16(9, 9, true))])
		).toThrow('RVER');
	});
	it('既存IDへの挿入やFOIDのすり替えを拒否する', () => {
		expect(() =>
			parseS57(fixture(), [
				edit(update(), 'VRID', (_, view) => view.setUint32(1, 1, true), 3)
			])
		).toThrow('追加命令');
		expect(() =>
			parseS57(fixture(), [edit(update(), 'FOID', (_, view) => view.setUint32(2, 999, true))])
		).toThrow('FOID');
	});
	it('更新後に参照が欠損する場合は部分成功にしない', () => {
		expect(() =>
			parseS57(fixture(), [edit(update(), 'FSPT', (_, view) => view.setUint32(1, 999, true))])
		).toThrow('空間参照先');
	});
	it('成功時も失敗時も元ファイルのバイト列を変更しない', () => {
		const base = fixture();
		const first = update();
		const bad = edit(update(2), 'SGCC', bytes => {
			bytes[0] = 9;
		});
		const originalBase = base.slice();
		const originalUpdate = first.bytes.slice();
		expect(() => parseS57(base, [first, bad])).toThrow();
		expect(parseS57(base, [first]).metadata.updateNumber).toBe('1');
		expect(base).toEqual(originalBase);
		expect(first.bytes).toEqual(originalUpdate);
	});
	it('更新一式の容量上限を解析前に確認する', () => {
		const original = formatS57.limits.maxDatasetBytes;
		Object.defineProperty(formatS57.limits, 'maxDatasetBytes', {
			value: 1,
			configurable: true
		});
		try {
			expect(() => parseS57(fixture(), [update()])).toThrow('128 MiB');
		} finally {
			Object.defineProperty(formatS57.limits, 'maxDatasetBytes', {
				value: original,
				configurable: true
			});
		}
	});
});

describe('S-57更新一式の組み立て', () => {
	const file = (name: string) => new File(['test'], name);
	it('基本セル別に番号順へまとめ、カタログを除外する', () => {
		const files = [
			'test-chart.002',
			'test-other.000',
			'test-chart.000',
			'CATALOG.031',
			'test-chart.001'
		].map(file);
		const datasets = getS57Datasets(files);
		expect(
			datasets.map(
				dataset => [dataset.base.name, ...dataset.updates.map(update => update.name)]
			)
		).toEqual([
			['test-chart.000', 'test-chart.001', 'test-chart.002'],
			['test-other.000']
		]);
		expect(S57_FILE_ACCEPT.split(',')).toContain('.999');
		expect(isS57Update(file('CATALOG.031'))).toBe(false);
	});
	it('基本セルなし・番号重複・別セルの更新を拒否する', () => {
		for (const names of [['test-chart.001'], ['test-chart.000', 'test-other.001']]) {
			expect(() => getS57Datasets(names.map(file))).toThrow('基本ファイル');
		}
		expect(() =>
			getS57Datasets(['test-chart.000', 'test-chart.001', 'test-chart.001'].map(file))
		).toThrow('重複');
	});
	it('別ディレクトリの同名セルを混ぜない', () => {
		const inputs = ['test-a/test-chart.000', 'test-b/test-chart.000', 'test-a/test-chart.001']
			.map(path => {
				const input = file(path.split('/').at(-1)!);
				Object.defineProperty(input, 'morivisRelativePath', { value: path });
				return input;
			});
		expect(getS57Datasets(inputs).map(dataset => dataset.updates.length)).toEqual([1, 0]);
	});
});
