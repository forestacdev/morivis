import { describe, expect, it } from 'vitest';

import {
	anchor,
	anchoredSheetXml,
	cellAnchor,
	custom,
	customTriangle,
	drawingWorkbook,
	drawingXml,
	point,
	preset,
	shape,
	transform
} from './__fixtures__/drawing-workbook';
import { drawingXmlToGeojson } from './drawing-geometry';
import { readXlsxDrawingWorkbook } from './drawings';

describe('Excel drawing geometry', () => {
	it('自由図形を拡大・配置し、Y軸を反転した閉じた線へ変換する', async () => {
		const result = await drawingXmlToGeojson(drawingXml(anchor(shape(customTriangle))));
		expect(result.shapeCount).toBe(1);
		expect(result.skippedShapeCount).toBe(0);
		expect(result.featureCollection.features[0].geometry).toEqual({
			type: 'LineString',
			coordinates: [[10, -20], [50, -20], [50, -40], [10, -20]]
		});
		expect(result.featureCollection.features[0].properties).toMatchObject({
			name: 'test-shape',
			text: 'test-label'
		});
	});
	it('線の水平反転と回転を図形の中心に適用する', async () => {
		const result = await drawingXmlToGeojson(
			drawingXml(anchor(shape(preset('line'), transform('flipH="1" rot="5400000"'))))
		);
		const points = result.featureCollection.features[0].geometry.coordinates as number[][];
		expect(points[0][0]).toBeCloseTo(40);
		expect(points[0][1]).toBeCloseTo(-50);
		expect(points[1][0]).toBeCloseTo(20);
		expect(points[1][1]).toBeCloseTo(-10);
	});
	it('入れ子グループの子座標原点と倍率を適用する', async () => {
		const group = (content: string) =>
			`<xdr:grpSp><xdr:grpSpPr><a:xfrm><a:off x="100" y="200"/><a:ext cx="200" cy="400"/><a:chOff x="10" y="20"/><a:chExt cx="100" cy="100"/></a:xfrm></xdr:grpSpPr>${content}</xdr:grpSp>`;
		const local = '<a:xfrm><a:off x="10" y="20"/><a:ext cx="100" cy="100"/></a:xfrm>';
		const result = await drawingXmlToGeojson(
			drawingXml(anchor(group(group(shape(preset('line'), local)))))
		);
		const points = result.featureCollection.features[0].geometry.coordinates as number[][];
		expect(points[0][0]).toBeCloseTo(280 / 9525);
		expect(points[0][1]).toBeCloseTo(-920 / 9525);
		expect(points[1][0]).toBeCloseTo(680 / 9525);
		expect(points[1][1]).toBeCloseTo(-2520 / 9525);
	});
	it('二次・三次ベジェ曲線をサンプリングする', async () => {
		const geometry = custom(
			`<a:moveTo>${point(0, 0)}</a:moveTo><a:quadBezTo>${point(0, 100)}${
				point(50, 50)
			}</a:quadBezTo><a:cubicBezTo>${point(75, 0)}${point(100, 25)}${
				point(100, 100)
			}</a:cubicBezTo>`
		);
		const result = await drawingXmlToGeojson(drawingXml(anchor(shape(geometry))));
		const coordinates = result.featureCollection.features[0].geometry.coordinates as number[][];
		expect(coordinates.length).toBeGreaterThan(20);
		expect(coordinates[0]).toEqual([10, -20]);
		expect(coordinates.at(-1)).toEqual([50, -40]);
	});
	it.each(['rect', 'ellipse', 'triangle', 'rtTriangle', 'diamond', 'straightConnector1'])(
		'基本図形 %s を読む',
		async (name) => {
			const result = await drawingXmlToGeojson(drawingXml(anchor(shape(preset(name)))));
			expect(result.shapeCount).toBe(1);
			expect(result.featureCollection.features[0].geometry.type).toBe('LineString');
		}
	);
	it.each([true, false])('セルアンカーで列幅と行高を反映する (twoCells=%s)', async (twoCells) => {
		const result = await drawingXmlToGeojson(
			drawingXml(cellAnchor(twoCells)),
			anchoredSheetXml
		);
		expect(result.featureCollection.features[0].geometry.coordinates).toEqual([
			[145, -40],
			[209, -40],
			[209, -60],
			[145, -60],
			[145, -40]
		]);
	});
	it('水平線の高さがゼロでも失わない', async () => {
		const result = await drawingXmlToGeojson(
			drawingXml(anchor(shape(preset('line'), transform().replace('cy="190500"', 'cy="0"'))))
		);
		expect(result.featureCollection.features[0].geometry.coordinates).toEqual([[10, -20], [
			50,
			-20
		]]);
	});
	it('高さを省略した自由図形の水平線を読む', async () => {
		const geometry = custom(
			`<a:moveTo>${point(0, 0)}</a:moveTo><a:lnTo>${point(100, 0)}</a:lnTo>`
		).replace(' h="100"', '');
		const result = await drawingXmlToGeojson(
			drawingXml(anchor(shape(geometry, transform().replace('cy="190500"', 'cy="0"'))))
		);
		expect(result.shapeCount).toBe(1);
		expect(result.skippedShapeCount).toBe(0);
		expect(result.featureCollection.features[0].geometry.coordinates).toEqual([[10, -20], [
			50,
			-20
		]]);
	});
	it('未対応図形と画像を数え、他の図形は読み込む', async () => {
		const result = await drawingXmlToGeojson(
			drawingXml(
				anchor(shape(preset('test-unsupported')) + '<xdr:pic/>' + shape(customTriangle))
			)
		);
		expect(result).toMatchObject({ shapeCount: 1, skippedShapeCount: 1, imageCount: 1 });
	});
	it('未対応のパス命令で途切れた輪郭を生成しない', async () => {
		const geometry = custom(
			`<a:moveTo>${point(0, 0)}</a:moveTo><a:lnTo>${
				point(100, 100)
			}</a:lnTo><a:arcTo wR="20" hR="20"/>`
		);
		const result = await drawingXmlToGeojson(drawingXml(anchor(shape(geometry))));
		expect(result).toMatchObject({ shapeCount: 0, skippedShapeCount: 1 });
		expect(result.featureCollection.features).toHaveLength(0);
	});
	it('不正なXMLをエラーにする', async () => {
		await expect(drawingXmlToGeojson('<!DOCTYPE test><test/>')).rejects.toThrow();
	});
});

describe('Excel drawing workbook', () => {
	it('ブックとシートの関連ファイルから図面を解決する', async () => {
		const workbook = await readXlsxDrawingWorkbook(await drawingWorkbook());
		expect(workbook.sheetNames).toEqual(['test-empty', 'test-drawing']);
		expect((await workbook.readSheet('test-empty')).featureCollection.features).toHaveLength(0);
		expect((await workbook.readSheet('test-drawing')).shapeCount).toBe(1);
		await expect(workbook.readSheet('test-missing')).rejects.toThrow('シート');
	});
	it.each([{ missing: true }, { external: true }])(
		'欠落・外部参照の図面を読まない (%j)',
		async (options) => {
			const workbook = await readXlsxDrawingWorkbook(await drawingWorkbook(options));
			await expect(workbook.readSheet('test-drawing')).rejects.toThrow('図面参照先');
		}
	);
	it('ZIPでない入力を拒否する', async () => {
		await expect(readXlsxDrawingWorkbook(new ArrayBuffer(4))).rejects.toThrow();
	});
});
