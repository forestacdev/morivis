import { describe, expect, it } from 'vitest';
import { parseGcd } from '.';
import { createTestGcd } from './__fixtures__/test-gcd';

describe('GCD境界線の読み込み', () => {
	it('符号付き差分座標・Unicode属性・PDF参照パスを復元する', () => {
		const result = parseGcd(createTestGcd());
		expect(result.crs).toBe('EPSG:3857');
		expect(result.vertexCount).toBe(2);
		expect(result.geojson.features[0]).toEqual({
			type: 'Feature',
			id: 0,
			geometry: { type: 'LineString', coordinates: [[-2, -1], [4, 2]] },
			properties: {
				'test-name': 'test-日本語🌲',
				'test-document': 'test-folder/test-document.pdf'
			}
		});
	});
	it('複数の境界線をつなぎ合わせずに保持する', () => {
		const result = parseGcd(createTestGcd({ multipart: true, flags: 2 }));
		expect(result.geojson.features[0].geometry).toEqual({
			type: 'MultiLineString',
			coordinates: [[[-2, -1], [4, 2]], [[0, 0], [2, 4]]]
		});
	});
	it.each([
		{ geometryType: 99 },
		{ coordinateMode: 0 },
		{ flags: 4 },
		{ fieldType: 77 },
		{ badBounds: true },
		{ badPart: true },
		{ multipart: true, badPart: true },
		{ crs: '' },
		{ fieldName: '__proto__' },
		{ scale: 0 }
	])('不明な形式・不正な値を拒否する: %j', options => {
		expect(() => parseGcd(createTestGcd(options))).toThrow('GCD:');
	});
	it('バージョンの違うファイルを拒否する', () => {
		const bytes = new Uint8Array(createTestGcd());
		bytes[1]++;
		expect(() => parseGcd(bytes.buffer)).toThrow('バージョン');
	});
	it('すべての切断位置で破損を検出する', () => {
		const buffer = createTestGcd();
		for (let length = 0; length < buffer.byteLength; length++) {
			expect(() => parseGcd(buffer.slice(0, length))).toThrow('GCD:');
		}
	});
	it('終端後の追加バイトを読み捨てない', () => {
		const buffer = createTestGcd();
		const bytes = new Uint8Array(buffer.byteLength + 1);
		bytes.set(new Uint8Array(buffer));
		expect(() => parseGcd(bytes.buffer)).toThrow('GCD:');
	});
});
