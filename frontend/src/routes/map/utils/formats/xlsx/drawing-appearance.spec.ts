import { describe, expect, it } from 'vitest';

import {
	anchor,
	appearanceWorkbook,
	customTriangle,
	drawingXml,
	picture,
	pixelTransform,
	preset,
	shape,
	styledShape,
	testPictureBase64,
	testTheme
} from './__fixtures__/drawing-workbook';
import { drawingXmlToAppearance } from './drawing-appearance';
import { parseXml } from './drawing-geometry';
import { readColor, readDrawingTheme } from './drawing-style';
import { readXlsxDrawingWorkbook } from './drawings';

const elements = (svg: string, tag: string) =>
	Array.from(parseXml(svg).getElementsByTagNameNS('*', tag));

describe('Excel drawing appearance', () => {
	it('テーマの塗り・RGB線色・線幅・黒い文字をSVGに保持する', () => {
		const result = drawingXmlToAppearance(drawingXml(anchor(styledShape())), undefined, {
			themeXml: testTheme
		});
		expect(result).toMatchObject({
			shapeCount: 1,
			imageCount: 0,
			width: 164,
			height: 104,
			warnings: []
		});
		expect(result.svg).toContain('fill="#20c060"');
		expect(result.svg).toContain('stroke="#d02040"');
		expect(result.svg).toContain('stroke-width="19050"');
		const text = elements(result.svg, 'text')[0];
		expect(text.getAttribute('text-anchor')).toBe('middle');
		expect(text.textContent).toBe('test-label');
		expect(elements(result.svg, 'tspan')[0].getAttribute('fill')).toBe('#000000');
		expect(elements(result.svg, 'tspan')[0].getAttribute('font-weight')).toBe('bold');
		expect(Number(elements(result.svg, 'tspan')[0].getAttribute('font-size'))).toBeCloseTo(
			16 * 96 / 72
		);
	});
	it('スタイル参照の塗りと線・色の濃淡・透明度を解決する', () => {
		const styled = shape(preset(), pixelTransform(0, 0, 100, 80)).replace(
			'</xdr:sp>',
			'<xdr:style><a:fillRef idx="1"><a:schemeClr val="accent1"><a:alpha val="50000"/></a:schemeClr></a:fillRef><a:lnRef idx="1"><a:srgbClr val="0000FF"/></a:lnRef></xdr:style></xdr:sp>'
		);
		const result = drawingXmlToAppearance(drawingXml(anchor(styled)), undefined, {
			themeXml: testTheme
		});
		expect(result.svg).toContain('fill="#20c060" fill-opacity="0.5"');
		expect(result.svg).toContain('stroke="#0000ff"');
		const theme = readDrawingTheme(testTheme);
		expect(
			readColor(
				parseXml('<fill><srgbClr val="000000"><lumOff val="50000"/></srgbClr></fill>'),
				theme
			)?.color
		).toBe('#808080');
		expect(
			readColor(
				parseXml('<fill><srgbClr val="FFFFFF"><shade val="50000"/></srgbClr></fill>'),
				theme
			)?.color
		).toBe('#808080');
	});
	it('塗りなし・線なしを保持し、自由図形の倍率で線幅を増やさない', () => {
		const result = drawingXmlToAppearance(
			drawingXml(
				anchor(
					shape(
						customTriangle + '<a:noFill/><a:ln><a:noFill/></a:ln>',
						pixelTransform(0, 0, 200, 100)
					)
				)
			)
		);
		expect(result.svg).toContain('fill="none"');
		expect(result.svg).toContain('stroke="none"');
		expect(elements(result.svg, 'path')[0].getAttribute('transform')).toBe('');
		expect(elements(result.svg, 'path')[0].getAttribute('d')).toContain('1905000 952500');
	});
	it('改行・折り返し・特殊文字を文字として扱い、入力のタグを挿入しない', () => {
		const content = styledShape().replace('wrap="none"', 'wrap="square"').replace(
			'test-label',
			'&lt;script&gt;&amp;&quot;test&lt;/script&gt;'
		).replace('</a:r>', '</a:r><a:br/><a:r><a:t>test-second</a:t></a:r>');
		const result = drawingXmlToAppearance(drawingXml(anchor(content)));
		expect(elements(result.svg, 'script')).toHaveLength(0);
		expect(elements(result.svg, 'text').length).toBeGreaterThan(2);
		expect(elements(result.svg, 'text').map((node) => node.textContent).join('')).toBe(
			'<script>&"test</script>test-second'
		);
	});
	it('画像の切り抜きと回転を保持し、画像だけでも範囲を持つ', () => {
		const result = drawingXmlToAppearance(
			drawingXml(anchor(picture('l="50000"', 'rot="5400000"'))),
			undefined,
			{ images: new Map([['test-image', `data:image/png;base64,${testPictureBase64}`]]) }
		);
		expect(result).toMatchObject({ shapeCount: 0, imageCount: 1, skippedImageCount: 0 });
		expect(result.width).toBeCloseTo(104);
		expect(result.height).toBeCloseTo(164);
		const img = elements(result.svg, 'image')[0];
		expect(img.getAttribute('x')).toBe(String(-160 * 9525));
		expect(img.getAttribute('width')).toBe(String(320 * 9525));
	});
	it('グループの拡大縮小を画像と図形に同じように適用し、重なり順を保つ', () => {
		const group =
			`<xdr:grpSp><xdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="7620000" cy="3810000"/><a:chOff x="0" y="0"/><a:chExt cx="3810000" cy="1905000"/></a:xfrm></xdr:grpSpPr>${picture()}${styledShape()}</xdr:grpSp>`;
		const result = drawingXmlToAppearance(drawingXml(anchor(group)), undefined, {
			images: new Map([['test-image', `data:image/png;base64,${testPictureBase64}`]])
		});
		expect(result.width).toBeCloseTo(724);
		expect(result.svg.indexOf('<image')).toBeLessThan(result.svg.indexOf('<path'));
	});
	it('小さいグループ座標でも線幅と余白を拡大せず、輪郭だけを変換する', () => {
		const line = (offset: number) =>
			`<xdr:sp><xdr:spPr><a:xfrm><a:off x="0" y="${offset}"/><a:ext cx="200" cy="0"/></a:xfrm>${
				preset('line')
			}<a:ln w="19050"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></xdr:spPr></xdr:sp>`;
		const group =
			`<xdr:grpSp><xdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="381000"/><a:chOff x="0" y="0"/><a:chExt cx="200" cy="50"/></a:xfrm></xdr:grpSpPr>${
				line(0)
			}${line(50)}</xdr:grpSp>`;
		const result = drawingXmlToAppearance(drawingXml(anchor(group)));
		expect(result).toMatchObject({ width: 104, height: 44, shapeCount: 2, warnings: [] });
		expect(result.svg).toContain('stroke-width="19050"');
		const paths = elements(result.svg, 'path');
		expect(paths[0].getAttribute('d')).toBe('M0 0L952500 0');
		expect(paths[1].getAttribute('d')).toBe('M0 381000L952500 381000');
		// The line's ancestors must not scale its physical stroke width.
		expect((paths[0].parentNode as Element).getAttribute('transform')).toBe('');
	});
	it('未対応の塗りと画像参照は警告・件数に残す', () => {
		const result = drawingXmlToAppearance(
			drawingXml(anchor(shape(preset() + '<a:gradFill/>') + picture()))
		);
		expect(result.skippedImageCount).toBe(1);
		expect(result.warnings.join('')).toContain('グラデーション');
		expect(result.svg).not.toContain('<image');
	});
	it.each(['https://example.invalid/test.png', 'data:image/svg+xml;base64,PHN2Zy8+'])(
		'外部URLやSVGを生成画像へ埋め込まない (%s)',
		(url) => {
			const result = drawingXmlToAppearance(drawingXml(anchor(picture())), undefined, {
				images: new Map([['test-image', url]])
			});
			expect(result).toMatchObject({ svg: '', imageCount: 0, skippedImageCount: 1 });
		}
	);
});

describe('Excel embedded drawing resources', () => {
	it('関連ファイルからテーマと埋め込み画像を解決する', async () => {
		const workbook = await readXlsxDrawingWorkbook(await appearanceWorkbook());
		const result = await workbook.readSheet('test-drawing');
		expect(result.appearance).toMatchObject({
			shapeCount: 1,
			imageCount: 1,
			skippedImageCount: 0
		});
		expect(result.appearance.svg).toContain('fill="#20c060"');
		expect(result.appearance.svg).toContain(`data:image/png;base64,${testPictureBase64}`);
	});
	it('画像だけのシートを空のシートにしない', async () => {
		const workbook = await readXlsxDrawingWorkbook(
			await appearanceWorkbook({ imageOnly: true })
		);
		const result = await workbook.readSheet('test-drawing');
		expect(result.shapeCount).toBe(0);
		expect(result.appearance.imageCount).toBe(1);
		expect(result.appearance.svg).not.toBe('');
	});
	it.each([{ externalImage: true }, { missingImage: true }, { unsafeImage: true }])(
		'外部・欠落・偽装PNGを除外する (%j)',
		async (options) => {
			const workbook = await readXlsxDrawingWorkbook(await appearanceWorkbook(options));
			const result = await workbook.readSheet('test-drawing');
			expect(result.appearance).toMatchObject({
				shapeCount: 1,
				imageCount: 0,
				skippedImageCount: 1
			});
			expect(result.appearance.svg).not.toContain('<image');
		}
	);
});
