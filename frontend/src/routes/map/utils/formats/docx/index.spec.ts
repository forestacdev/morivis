import { describe, expect, it } from 'vitest';

import { docxFixture } from '../office-drawing/__fixtures__/documents';
import { readDocxDrawings } from './index';

describe('Word drawings', () => {
	it('段落ごとに分け、互換図形を二重に読まず、重なり順・文字・画像を維持する', async () => {
		const doc = await readDocxDrawings(await docxFixture());
		expect(doc.items).toHaveLength(3);
		const drawing = await doc.readDrawing('0');
		expect(drawing.shapeCount).toBe(1);
		expect(drawing.geometry.shapeCount).toBe(1);
		expect(drawing.geometry.featureCollection.features).toHaveLength(1);
		expect(drawing.geometry.featureCollection.features[0]).toMatchObject({
			geometry: {
				type: 'LineString',
				coordinates: [[0, 0], [100, 0], [100, -50], [0, -50], [0, 0]]
			},
			properties: { name: 'test-word-shape', text: 'test-word', shapeId: 'shape-0' }
		});
		expect(drawing.imageCount).toBe(1);
		expect(drawing.width).toBe(204);
		expect(drawing.svg).toContain('test-word');
		expect(drawing.svg).toContain('font-size="16"');
		expect(drawing.svg).toContain('font-weight="bold"');
		expect(drawing.svg).toContain('#aa0000');
		expect(drawing.svg.indexOf('<image')).toBeLessThan(drawing.svg.indexOf('<path'));
		expect((await doc.readDrawing('1')).imageCount).toBe(0);
		const inline = await doc.readDrawing('2');
		expect(inline.width).toBe(104);
		expect(inline.imageCount).toBe(1);
		expect(inline.geometry.featureCollection.features).toHaveLength(0);
	});
	it('解決できない揃え位置を誤った座標で描画しない', async () => {
		const doc = await readDocxDrawings(await docxFixture({ aligned: true }));
		const drawing = await doc.readDrawing('0');
		expect(drawing.svg).toBe('');
		expect(drawing.warnings.some((warning) => warning.includes('位置を確定'))).toBe(true);
	});
	it('空文書・不正な選択・欠落した本文を扱う', async () => {
		const doc = await readDocxDrawings(await docxFixture({ empty: true }));
		expect(doc.items).toHaveLength(0);
		await expect(doc.readDrawing('0')).rejects.toThrow('図面');
		await expect(readDocxDrawings(await docxFixture({ missing: true }))).rejects.toThrow(
			'参照先'
		);
	});
});
