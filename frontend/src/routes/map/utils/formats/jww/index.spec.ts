import { describe, expect, it } from 'vitest';
import { parseJww } from '.';
import { createTestWriter, jwwFixture, type TestEntity } from './__fixtures__/builder';
import { createJwwReader, readJww } from './reader';

const line: TestEntity = { kind: 'Sen', values: [0, 0, 20, 10] };
const parse = (options: Parameters<typeof jwwFixture>[0]) => parseJww(jwwFixture(options));

describe('JWW parser', () => {
	it('予約位置の文書設定だけを除外し、同じ文字列の図面注記は残す', () => {
		// These are the format's reserved marker coordinates, not a real location.
		const result = parse({
			entities: [line, {
				kind: 'Moji',
				values: [0, -1000, 0, -1000],
				text: 'Printer_PaperSize = 7'
			}, { kind: 'Moji', values: [3, 4, 5, 4], text: 'Printer_PaperSize = 7' }]
		});
		expect(result.geojson.features).toHaveLength(2);
		expect(result.geojson.features[1].properties.text).toBe('Printer_PaperSize = 7');
		expect(result.warnings.join('')).toContain('印刷・表示設定');
	});
	it.each([200, 223, 225, 230, 300, 351, 420, 600, 700])(
		'内部バージョン %i のヘッダーと線を読む',
		version => {
			const result = parse({ version, entities: [line] });
			expect(result.version).toBe(version);
			expect(result.geojson.features[0]).toMatchObject({
				geometry: { type: 'LineString', coordinates: [[0, 0], [1, 0.5]] },
				properties: {
					layer: '0-0',
					layer_name: 'test-layer-0-0',
					color: '#112233',
					scale: 50
				}
			});
		}
	);
	it('グループごとの縮尺・非表示状態・SXFの色を保持する', () => {
		const result = parse({
			hiddenGroup: 1,
			entities: [line, { ...line, group: 1, penColor: 100 }]
		});
		expect(result.geojson.features[1]).toMatchObject({
			geometry: { coordinates: [[0, 0], [2, 1]] },
			properties: { color: '#445566', visible: false }
		});
		expect(result.layers.map(layer => [layer.key, layer.scale, layer.visible])).toEqual([[
			'0-0',
			50,
			true
		], ['1-0', 100, false]]);
	});
	it('クラス再利用、32bitタグ、オブジェクト参照を同じ索引で解決する', () => {
		const result = parse({
			longTags: true,
			entities: [line, { kind: 'Ten', values: [1, 2] }, line, { kind: 'reference', id: 2 }]
		});
		expect(result.geojson.features.map(feature => feature.geometry.type)).toEqual([
			'LineString',
			'Point',
			'LineString',
			'LineString'
		]);
	});
	it('Shift-JIS・Unicode・長いCStringを読む', () => {
		const w = createTestWriter();
		w.raw([4, 0x83, 0x65, 0x83, 0x58]); // synthetic Japanese characters
		w.string('test-' + 'あ'.repeat(300));
		const r = createJwwReader(w.finish());
		expect(r.string()).toBe('テス');
		expect(r.string()).toBe('test-' + 'あ'.repeat(300));
	});
	it('円弧をライン、文字と実点をポイント、任意色ソリッドをポリゴンにする', () => {
		const result = parse({
			scales: [1000],
			entities: [
				{ kind: 'Enko', values: [0, 0, 2, 0, Math.PI / 2, 0, 1, 0] },
				{ kind: 'Moji', values: [1, 2, 3, 2], text: 'test-注記' },
				{ kind: 'Ten', values: [2, 3] },
				{ kind: 'Solid', values: [0, 0, 0, 2, 3, 0, 3, 2], penColor: 10, color: 0xccbbaa }
			]
		});
		const [arc, text, dot, solid] = result.geojson.features;
		if (arc.geometry.type !== 'LineString') throw new Error('test arc');
		expect(arc.geometry.coordinates[0]).toEqual([2, 0]);
		expect(arc.geometry.coordinates.at(-1)![1]).toBeCloseTo(2);
		expect(text.properties).toMatchObject({
			type: 'TEXT',
			text: 'test-注記',
			font: 'test-font'
		});
		expect(dot.geometry).toEqual({ type: 'Point', coordinates: [2, 3] });
		expect(solid.geometry).toEqual({
			type: 'Polygon',
			coordinates: [[[0, 0], [3, 0], [3, 2], [0, 2], [0, 0]]]
		});
		expect(solid.properties.color).toBe('#aabbcc');
	});
	it('回転した楕円の端点と全円を保持する', () => {
		const result = parse({
			scales: [1000],
			entities: [
				{ kind: 'Enko', values: [0, 0, 4, 0, Math.PI / 2, Math.PI / 2, 0.5, 0] },
				{ kind: 'Enko', values: [0, 0, 4, 0, 0, 0, 1, 1] }
			]
		});
		const geometry = result.geojson.features[0].geometry;
		if (geometry.type !== 'LineString') throw new Error('test arc');
		expect(geometry.coordinates[0][1]).toBeCloseTo(4);
		expect(geometry.coordinates.at(-1)![0]).toBeCloseTo(-2);
		expect(result.geojson.features[1].properties.type).toBe('CIRCLE');
	});
	it.each([false, true])('ブロックの移動・回転・拡大を展開する（64bit時刻=%s）', time64 => {
		const result = parse({
			scales: [1000],
			entities: [{ kind: 'Block', id: 7, values: [10, 20, 2, 3, Math.PI / 2] }],
			blocks: [{
				kind: 'List',
				id: 7,
				text: 'test-block',
				time64,
				children: [{ kind: 'Sen', values: [0, 0, 2, 0], group: 1 }]
			}]
		});
		const feature = result.geojson.features[0];
		expect(feature.geometry).toEqual({ type: 'LineString', coordinates: [[10, 20], [10, 24]] });
		expect(feature.properties).toMatchObject({
			block: 'test-block',
			layer: '0-0',
			source_layer: '1-0'
		});
	});
	it('入れ子ブロックと親の縮尺を一度だけ適用する', () => {
		const result = parse({
			entities: [{ kind: 'Block', id: 1, values: [10, 0, 1, 1, 0] }],
			blocks: [
				{
					kind: 'List',
					id: 1,
					children: [{ kind: 'Block', id: 2, values: [20, 0, 1, 1, 0] }]
				},
				{ kind: 'List', id: 2, children: [line] }
			]
		});
		expect(result.geojson.features[0].geometry).toEqual({
			type: 'LineString',
			coordinates: [[1.5, 0], [2.5, 0.5]]
		});
	});
	it.each([0, 1])('寸法図形の有効なメンバーだけ描画する（SXFモード=%i）', mode => {
		const result = parse({ entities: [{ kind: 'Sunpou', values: [mode] }, line] });
		expect(result.geojson.features).toHaveLength(mode ? 7 : 3);
		expect(result.geojson.features[1].properties.text).toBe('test-dimension');
	});
	it('円環の穴と扇形をポリゴンとして保持する', () => {
		const result = parse({
			scales: [1000],
			entities: [
				{ kind: 'Solid', penStyle: 105, values: [0, 0, 4, 1, 0, 0, 2 * Math.PI, 2] },
				{ kind: 'Solid', penStyle: 101, values: [0, 0, 4, 1, 0, 0, Math.PI / 2, 0] }
			]
		});
		const ring = result.geojson.features[0].geometry;
		if (ring.type !== 'Polygon') throw new Error('test ring');
		expect(ring.coordinates).toHaveLength(2);
		expect(ring.coordinates[0][0]).toEqual([4, 0]);
		expect(result.geojson.features[1].geometry.type).toBe('Polygon');
	});
	it('画像・仮点を注記へ誤変換せず、除外理由を返す', () => {
		const result = parse({
			images: true,
			entities: [
				line,
				{ kind: 'Moji', values: [0, 0, 1, 1], text: '^@BMtest-image.bmp.gz' },
				{ kind: 'Ten', values: [0, 0, 1] }
			]
		});
		expect(result.geojson.features).toHaveLength(1);
		expect(result.warnings.join('')).toContain('同梱画像 1 件');
		expect(result.warnings.join('')).toContain('仮点');
	});
	it('壊れた入力、未知のクラス、過大な数値を明示的に拒否する', () => {
		const valid = jwwFixture({ entities: [line] });
		expect(() => parseJww(valid.slice(0, -5))).toThrow(/切れて|長さ/);
		expect(() => parseJww(new ArrayBuffer(8))).toThrow(/JWW形式/);
		expect(() => parse({ version: 999, entities: [line] })).toThrow(/バージョン/);
		expect(() => parse({ entities: [{ kind: 'Unknown' }] })).toThrow(/未対応のJWW図形/);
		expect(() => parse({ entities: [{ ...line, values: [NaN, 0, 1, 1] }] })).toThrow(/数値/);
		expect(() => parse({ scales: [0], entities: [line] })).toThrow(/縮尺/);
		expect(() => parse({ entities: [] })).toThrow(/図形がありません/);
	});
	it('存在しない参照と循環ブロックを拒否する', () => {
		expect(() => parse({ entities: [{ kind: 'reference', id: 12 }] })).toThrow(/図形参照/);
		const block: TestEntity = { kind: 'Block', id: 1, values: [0, 0, 1, 1, 0] };
		expect(() => parse({ entities: [block] })).toThrow(/見つかりません/);
		expect(() =>
			parse({ entities: [block], blocks: [{ kind: 'List', id: 1, children: [block] }] })
		).toThrow(/循環参照/);
	});
	it('ヘッダー解析で末尾まで消費し、未対応の追記を拒否する', () => {
		const data = jwwFixture({ entities: [line] });
		expect(readJww(data).entities).toHaveLength(1);
		const appended = new Uint8Array(data.byteLength + 1);
		appended.set(new Uint8Array(data));
		expect(() => readJww(appended.buffer)).toThrow(/末尾/);
	});
});
