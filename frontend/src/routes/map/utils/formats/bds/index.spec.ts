import { describe, expect, it } from 'vitest';
import { parseBds } from '.';
import { createTestBds } from './__fixtures__/test-bds';

describe('BDS境界線と文字位置', () => {
	it('座標とUnicode・数値属性を読み、文字注記を別の点にする', () => {
		const result = parseBds(createTestBds());
		expect(result.geojson.features).toHaveLength(2);
		expect(result.geojson.features[0].geometry).toEqual({
			type: 'LineString',
			coordinates: [[0, 0], [4, 0], [4, 2]]
		});
		expect(result.geojson.features[0].properties).toEqual({
			'test-name$': 'test-日本語🌲',
			'test-count&': 7,
			'test-size#': 2.5
		});
		expect(result.geojson.features[1].geometry).toEqual({ type: 'Point', coordinates: [2, 3] });
		expect(result.geojson.features[1].properties).toEqual({ BDS文字: 'test-label' });
		expect(result.proj4String).toContain('+lat_0=0 +lon_0=0');
	});
	it('図形が空のデータセットを読める', () => {
		expect(parseBds(createTestBds({ empty: true })).geojson.features).toEqual([]);
	});
	it('部品定義を地図上の図形として追加しない', () => {
		expect(parseBds(createTestBds({ definitions: true })).geojson.features).toHaveLength(2);
	});
	it('グループの属性を子図形へ引き継ぐ', () => {
		expect(
			parseBds(createTestBds({ group: true })).geojson.features[0].properties['test-count&']
		).toBe(7);
	});
	it('複数パートの間を線で結ばない', () => {
		const geometry = parseBds(createTestBds({ multipart: true })).geojson.features[0].geometry;
		expect(geometry.type).toBe('MultiLineString');
		expect(geometry.coordinates).toHaveLength(2);
	});
	it('曲線は制御点を頂点にせず端点間の線にする', () => {
		const result = parseBds(createTestBds({ curve: true }));
		expect(result.curveCount).toBe(1);
		expect(result.geojson.features[0].geometry.coordinates).toEqual([[0, 0], [4, 0]]);
	});
	it('書式付き注記の文字位置を読む', () => {
		expect(parseBds(createTestBds({ textMode: 1 })).geojson.features[1].geometry.coordinates)
			.toEqual([2, 3]);
	});
	it.each([{ unknown: true }, { badBounds: true }, { badDatum: true }])(
		'未対応・不正な入力を拒否する: %j',
		options => {
			expect(() => parseBds(createTestBds(options))).toThrow('BDS:');
		}
	);
	it('すべての切断位置で途中ファイルを拒否する', () => {
		const buffer = createTestBds();
		for (let i = 0; i < buffer.byteLength; i++) {
			expect(() => parseBds(buffer.slice(0, i))).toThrow('BDS:');
		}
	});
	it('破損した検証マーカーを拒否する', () => {
		const buffer = createTestBds();
		new DataView(buffer).setUint8(9, 0x80);
		expect(() => parseBds(buffer)).toThrow('BDS:');
	});
	it('異なるバージョンを拒否する', () => {
		const buffer = createTestBds();
		new DataView(buffer).setUint16(4, 42, true);
		expect(() => parseBds(buffer)).toThrow('バージョン');
	});
});
