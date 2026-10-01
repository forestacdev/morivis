import { describe, expect, it } from 'vitest';

import { pptxFixture } from '../office-drawing/__fixtures__/documents';
import { readPptxDrawings } from './index';

describe('PowerPoint drawings', () => {
	it('スライド順・部品参照・テーマ・図形と画像を読み込む', async () => {
		const doc = await readPptxDrawings(await pptxFixture());
		expect(doc.items.map((item) => item.id)).toEqual(['second', 'first']);
		const drawing = await doc.readDrawing('second');
		expect(drawing.shapeCount).toBe(1);
		expect(drawing.geometry.shapeCount).toBe(1);
		expect(drawing.geometry.featureCollection.features).toHaveLength(1);
		expect(drawing.geometry.featureCollection.features[0]).toMatchObject({
			geometry: {
				type: 'LineString',
				coordinates: [[0, 0], [100, 0], [100, -50], [0, -50], [0, 0]]
			},
			properties: { name: 'test-shape', text: 'test-label', shapeId: 'shape-0' }
		});
		expect(drawing.imageCount).toBe(1);
		expect(drawing.width).toBe(204);
		expect(drawing.svg).toContain('#12ab34');
		expect(drawing.svg).toContain('test-label');
		expect(drawing.svg).toContain('test-font');
		expect((await doc.readDrawing('first')).svg).toContain('#ab1234');
	});
	it('外部画像は取得せず欠落として返す', async () => {
		const doc = await readPptxDrawings(await pptxFixture({ external: true }));
		const drawing = await doc.readDrawing('second');
		expect(drawing.imageCount).toBe(0);
		expect(drawing.skippedImageCount).toBe(1);
		expect(drawing.svg).not.toContain('https:');
	});
	it('空のスライド・不正な選択・欠落した部品を扱う', async () => {
		const doc = await readPptxDrawings(await pptxFixture({ empty: true }));
		expect((await doc.readDrawing('second')).svg).toBe('');
		await expect(doc.readDrawing('missing')).rejects.toThrow('スライド');
		const missing = await readPptxDrawings(await pptxFixture({ missing: true }));
		await expect(missing.readDrawing('second')).rejects.toThrow('参照先');
	});
});
