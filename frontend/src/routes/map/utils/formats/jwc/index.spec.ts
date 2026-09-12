import { describe, expect, it } from 'vitest';
import { parseJwc } from '.';
import { jwcFixture } from './__fixtures__/builder';

describe('JWC fixed record profiles', () => {
	it.each([false, true])('2つの縮尺格納形式をメートルに変換する（f32=%s）', float => {
		const r = parseJwc(jwcFixture(float));
		expect(r.version).toBeNull();
		expect(r.geojson.features.map(f => f.geometry.type)).toEqual([
			'LineString',
			'LineString',
			'Point',
			'Point'
		]);
		const line = r.geojson.features[0].geometry;
		if (line.type !== 'LineString') throw new Error('test line');
		expect(line.coordinates[0][0]).toBeCloseTo(0);
		expect(line.coordinates[1][0]).toBeCloseTo(10 * 297 / 518 * 50 / 1000);
		expect(r.geojson.features[2].properties).toMatchObject({
			text: 'test',
			text_height: 0.15,
			layer_name: 'test-l',
			group_name: 'test-g'
		});
		expect(r.geojson.features[1].properties.visible).toBe(false);
		expect(r.warnings.join('')).toContain('既定色');
	});
	it('円弧の扁平率・回転・縮尺を適用する', () => {
		const arc = parseJwc(jwcFixture()).geojson.features[1].geometry;
		if (arc.type !== 'LineString') throw new Error('test arc');
		expect(arc.coordinates[0][0]).toBeCloseTo(0);
		expect(arc.coordinates[0][1]).toBeCloseTo(10 * 297 / 518 * 100 / 1000, 4);
		expect(arc.coordinates.at(-1)![0]).toBeCloseTo(-5 * 297 / 518 * 100 / 1000);
	});
	it('誤形式・破損レコード・文字参照の範囲外を拒否する', () => {
		expect(() => parseJwc(new ArrayBuffer(2))).toThrow(/長さ/);
		const bad = jwcFixture();
		new Uint8Array(bad)[22] = 120;
		expect(() => parseJwc(bad)).toThrow(/ヘッダー/);
		expect(() => parseJwc(jwcFixture().slice(0, -1))).toThrow(/ファイル長/);
		const reference = jwcFixture();
		new DataView(reference).setUint32(2389 + 22 + 32 + 16, 0, true);
		expect(() => parseJwc(reference)).toThrow(/文字列参照/);
		const nan = jwcFixture();
		new DataView(nan).setFloat32(2389, NaN, true);
		expect(() => parseJwc(nan)).toThrow(/数値/);
	});
});
