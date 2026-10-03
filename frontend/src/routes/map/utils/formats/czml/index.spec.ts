import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parseCzml } from '.';
import cases from './__fixtures__/test-cases.json';
import { formatCzml } from './definition';
const fixture = (name: string) =>
	readFileSync(new URL(`./__fixtures__/${name}.czml`, import.meta.url), 'utf8');
const input = (key: keyof typeof cases) =>
	JSON.stringify([{ id: 'document', version: '1.0' }, ...cases[key]]);

describe('CZML', () => {
	it('静的な点・線・穴付きポリゴンを変換し、日付を追加しない', async () => {
		const result = await parseCzml(fixture('test-static'));
		expect(result.points.features).toHaveLength(1);
		expect(result.lines.features).toHaveLength(1);
		expect(result.polygons.features).toHaveLength(1);
		expect(result.timestamps).toEqual([]);
		expect(result.points.features[0].properties).toMatchObject({
			height: expect.closeTo(10, 4),
			test_value: 7
		});
		expect(result.points.features[0].properties.time).toBeUndefined();
		const polygon = result.polygons.features[0].geometry;
		if (polygon.type !== 'Polygon') throw new Error('Expected Polygon');
		expect(polygon.coordinates).toHaveLength(2);
		expect(polygon.coordinates[0][0]).toEqual(polygon.coordinates[0].at(-1));
	});
	it('秒数とepoch、位置参照を読み、時刻別ポイントと軌跡を作る', async () => {
		const result = await parseCzml(fixture('test-moving'));
		expect(result.timestamps).toHaveLength(3);
		expect(result.points.features).toHaveLength(6);
		expect(result.tracks.features).toHaveLength(2);
		expect(result.points.features[0].geometry).toEqual(result.points.features[3].geometry);
		expect(result.points.features[1].properties.time).toBe('2024-01-02T00:00:10.000Z');
	});
	it('サンプルの中間時刻をCesiumで補間する', async () => {
		const document = JSON.parse(fixture('test-moving'));
		document[0].clock.currentTime = '2024-01-02T00:00:05Z';
		const result = await parseCzml(JSON.stringify(document));
		const point = result.points.features.find(feature =>
			feature.properties.time === '2024-01-02T00:00:05.000Z'
		)!;
		if (point.geometry.type !== 'Point') throw new Error('Expected Point');
		expect(point.geometry.coordinates[0]).toBeGreaterThan(2.5);
		expect(point.geometry.coordinates[0]).toBeLessThan(2.51);
	});
	it('idの省略されたパケットにも一意のIDを付ける', async () => {
		const document = JSON.parse(fixture('test-static'));
		delete document[1].id;
		const result = await parseCzml(JSON.stringify(document));
		expect(result.points.features).toHaveLength(1);
		expect(result.points.features[0].properties.entity_id).toBe('czml-packet-0');
	});
	it('ECEFをWGS84へ変換する', async () => {
		const point = (await parseCzml(input('ecef'))).points.features[0];
		expect(point.geometry).toEqual({ type: 'Point', coordinates: [0, 0] });
		expect(point.properties.height).toBeCloseTo(10, 4);
	});
	it('ラジアンを度へ変換する', async () => {
		const point = (await parseCzml(input('radians'))).points.features[0].geometry;
		if (point.type !== 'Point') throw new Error('Expected Point');
		expect(point.coordinates[0]).toBeCloseTo(0.025 * 180 / Math.PI);
	});
	it('同じIDの上書きと削除を適用する', async () => {
		const result = await parseCzml(input('update'));
		expect(result.points.features).toHaveLength(1);
		const point = result.points.features[0].geometry;
		if (point.type !== 'Point') throw new Error('Expected Point');
		expect(point.coordinates[0]).toBeCloseTo(2.7);
	});
	it('離れたavailability・position区間を軌跡でつながない', async () => {
		const result = await parseCzml(input('intervals'));
		expect(result.points.features).toHaveLength(4);
		expect(result.tracks.features).toHaveLength(2);
	});
	it('ISO8601のサンプル時刻を扱う', async () => {
		expect((await parseCzml(input('iso-time'))).timestamps).toEqual([
			'2024-01-02T00:00:00.000Z',
			'2024-01-02T00:00:01.000Z'
		]);
	});
	it('同じエンティティのpositionを使ったラインは循環参照ではない', async () => {
		expect((await parseCzml(input('self-polyline'))).lines.features).toHaveLength(1);
	});
	it('モデルや画像のURLを取得せず、位置をポイント化する', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch');
		try {
			const result = await parseCzml(input('external-model'));
			expect(result.points.features).toHaveLength(1);
			expect(result.warnings.join('')).toContain('モデル');
			expect(fetch).not.toHaveBeenCalled();
		} finally {
			fetch.mockRestore();
		}
	});
	it.each(
		[
			'inertial',
			'cycle',
			'invalid-coordinates',
			'invalid-count',
			'missing-epoch',
			'empty-shapes'
		] as const
	)('%sを無言で誤配置しない', async key => {
		await expect(parseCzml(input(key))).rejects.toThrow();
	});
	it('出力件数を制限し、途中結果は返さない', async () => {
		const original = formatCzml.limits.maxFeatures;
		Object.assign(formatCzml.limits, { maxFeatures: 4 });
		try {
			await expect(parseCzml(fixture('test-moving'))).rejects.toThrow('組み合わせ');
		} finally {
			Object.assign(formatCzml.limits, { maxFeatures: original });
		}
	});
});
