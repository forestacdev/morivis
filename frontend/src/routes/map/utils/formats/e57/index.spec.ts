import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import * as runtime from 'web-e57-internal/e57_bg.js';
import { E57_MAX_FILE_BYTES, parseE57, validateE57Size } from '.';

const fixture = (name: string) =>
	new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}.e57`, import.meta.url)));
const convert = runtime.convertE57;
beforeAll(async () => {
	const packageRoot = dirname(createRequire(import.meta.url).resolve('web-e57'));
	const { instance } = await WebAssembly.instantiate(
		readFileSync(join(packageRoot, 'e57_bg.wasm')),
		{ './e57_bg.js': runtime }
	);
	runtime.__wbg_set_wasm(instance.exports);
});

describe('E57 native decoding', () => {
	it('複数スキャンの回転・平行移動を一度だけ適用し、無効点を除く', () => {
		const result = parseE57(fixture('test-multi-scan'), convert);
		expect(result.scanCount).toBe(2);
		expect(result.pointCount).toBe(2);
		expect(result.sourcePointCount).toBe(2);
		expect(result.positions).toBeInstanceOf(Float64Array);
		[11, 2, 3, 0, 22, 4].forEach((value, i) =>
			expect(result.positions[i]).toBeCloseTo(value, 10)
		);
		expect(result.bbox).toEqual([0, 2, 11, 22]);
		expect([...result.colors!]).toEqual([255, 128, 0, 255, 255, 255]);
		expect(result.projection).toBeNull();
	});
	it('球面座標をCartesianへ直してposeを反映する', () => {
		const result = parseE57(fixture('test-spherical'), convert);
		[2, 0, 5, 0, 3, 5].forEach((value, i) =>
			expect(result.positions[i]).toBeCloseTo(value, 10)
		);
		expect(result.colors).toBeUndefined();
	});
	it('表示点数を制限しても、元の有効点数と全域のbboxを保つ', () => {
		const result = parseE57(fixture('test-multi-scan'), convert, 1);
		expect(result.pointCount).toBe(1);
		expect(result.sourcePointCount).toBe(2);
		expect([...result.positions]).toEqual([11, 2, 3]);
		expect(result.bbox).toEqual([0, 2, 11, 22]);
	});
	it.each(['test-empty', 'test-all-invalid'])('有効な点のない %s を拒否する', name => {
		expect(() => parseE57(fixture(name), convert)).toThrow(/点群|有効な点/);
	});
	it('識別子不正・容量超過・点数上限を事前に拒否する', () => {
		expect(() => parseE57(new Uint8Array(48), convert)).toThrow('識別子');
		expect(() => validateE57Size(0)).toThrow('ヘッダー');
		expect(() => validateE57Size(E57_MAX_FILE_BYTES + 1)).toThrow('256 MiB');
		expect(() => parseE57(fixture('test-multi-scan'), convert, 0)).toThrow('表示点数');
		const huge = (bytes: Uint8Array, format: string) =>
			convert(bytes, format).replace('recordCount="2"', 'recordCount="5000001"');
		expect(() => parseE57(fixture('test-multi-scan'), huge)).toThrow('500万点');
	});
	it('埋め込みWKTを座標系として渡し、値の範囲から推測しない', () => {
		const wkt = 'PROJCS["test-projection"]';
		const withCrs = (bytes: Uint8Array, format: string) =>
			format === 'XML'
				? convert(bytes, format).replace(
					'</e57Root>',
					`<coordinateMetadata type="String"><![CDATA[${wkt}]]></coordinateMetadata></e57Root>`
				)
				: convert(bytes, format);
		expect(parseE57(fixture('test-multi-scan'), withCrs).projection).toEqual({
			epsg: null,
			definition: wkt,
			coordinateType: 'projected'
		});
	});
	it('チェックサムが壊れたページを拒否する', () => {
		const bytes = fixture('test-multi-scan');
		bytes[60] ^= 1;
		expect(() => parseE57(bytes, convert)).toThrow();
	});
});
