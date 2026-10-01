import { expect, it } from 'vitest';

import { children, parseXml } from '../xlsx/drawing-geometry';
import { groupedDrawing, inheritedPlaceholder } from './__fixtures__/documents';
import { renderOfficeDrawing } from './index';

it('グループ内の互換分岐を一度だけ描画し、線幅はグループの倍率で増やさない', async () => {
	const result = await renderOfficeDrawing(children(parseXml(groupedDrawing)), {});
	expect(result.shapeCount).toBe(1);
	expect(result.width).toBe(204);
	expect(result.height).toBe(104);
	expect(result.svg).toContain('stroke-width="9525"');
	expect(result.geometry.shapeCount).toBe(1);
	expect(result.geometry.featureCollection.features[0].geometry.coordinates).toEqual([
		[0, 0],
		[200, 0],
		[200, -100],
		[0, -100],
		[0, 0]
	]);
});

it('レイアウト継承で位置不明のプレースホルダーを原点に描かない', async () => {
	const result = await renderOfficeDrawing(children(parseXml(inheritedPlaceholder)), {});
	expect(result.svg).toBe('');
	expect(result.warnings).toContain('位置・サイズを直接指定していない図形は省略しています。');
});
