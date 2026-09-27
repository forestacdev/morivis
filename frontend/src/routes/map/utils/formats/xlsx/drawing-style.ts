import { hsl, rgb } from 'd3-color';

import { child, children, number, parseXml } from './drawing-geometry';

export const escapeXml = (value: string): string =>
	value.replace(
		/[&<>"']/g,
		(char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!
	);

export interface DrawingTheme {
	colors: Record<string, string>;
	fills: Element[];
	backgroundFills: Element[];
	lines: Element[];
	majorFont: string;
	minorFont: string;
}

export const readDrawingTheme = (xml?: string): DrawingTheme => {
	const elements = xml ? child(parseXml(xml), 'themeElements') : undefined;
	const colors: Record<string, string> = {
		dk1: '000000',
		lt1: 'FFFFFF',
		dk2: '44546A',
		lt2: 'E7E6E6',
		accent1: '4472C4',
		accent2: 'ED7D31',
		accent3: 'A5A5A5',
		accent4: 'FFC000',
		accent5: '5B9BD5',
		accent6: '70AD47',
		hlink: '0563C1',
		folHlink: '954F72'
	};
	for (const item of children(child(elements, 'clrScheme'))) {
		const color = children(item)[0];
		const value = color?.getAttribute(color.localName === 'sysClr' ? 'lastClr' : 'val');
		if (value && /^[0-9a-f]{6}$/i.test(value)) colors[item.localName] = value;
	}
	const format = child(elements, 'fmtScheme');
	const fonts = child(elements, 'fontScheme');
	const font = (name: string) => {
		const group = child(fonts, name);
		return child(group, 'ea')?.getAttribute('typeface')
			|| children(group, 'font').find((item) => item.getAttribute('script') === 'Jpan')
				?.getAttribute('typeface')
			|| child(group, 'latin')?.getAttribute('typeface') || 'sans-serif';
	};
	return {
		colors,
		fills: children(child(format, 'fillStyleLst')),
		backgroundFills: children(child(format, 'bgFillStyleLst')),
		lines: children(child(format, 'lnStyleLst')),
		majorFont: font('majorFont'),
		minorFont: font('minorFont')
	};
};

type Paint = { color: string; opacity: number; };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export const readColor = (
	container: Element | undefined,
	theme: DrawingTheme,
	placeholder?: Paint
): Paint | undefined => {
	const color = children(container).find((item) =>
		['srgbClr', 'schemeClr', 'sysClr', 'prstClr'].includes(item.localName)
	);
	if (!color) return undefined;
	const value = color.getAttribute('val') ?? '';
	const aliases: Record<string, string> = { tx1: 'dk1', tx2: 'dk2', bg1: 'lt1', bg2: 'lt2' };
	const presets: Record<string, string> = {
		black: '000000',
		white: 'FFFFFF',
		red: 'FF0000',
		blue: '0000FF',
		green: '008000',
		yellow: 'FFFF00',
		gray: '808080'
	};
	const hex = color.localName === 'schemeClr'
		? value === 'phClr' ? placeholder?.color.slice(1) : theme.colors[aliases[value] ?? value]
		: color.localName === 'sysClr'
		? color.getAttribute('lastClr')
		: color.localName === 'prstClr'
		? presets[value]
		: value;
	if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return undefined;
	let current = rgb(`#${hex}`);
	let opacity = value === 'phClr' ? placeholder?.opacity ?? 1 : 1;
	for (const transform of children(color)) {
		const amount = number(transform, 'val') / 100000;
		switch (transform.localName) {
			case 'alpha':
				opacity = amount;
				break;
			case 'alphaMod':
				opacity *= amount;
				break;
			case 'alphaOff':
				opacity += amount;
				break;
			case 'tint':
				current = rgb(
					...[current.r, current.g, current.b].map((channel) =>
						channel * amount + 255 * (1 - amount)
					) as [number, number, number]
				);
				break;
			case 'shade':
				current = rgb(current.r * amount, current.g * amount, current.b * amount);
				break;
			case 'lumMod':
			case 'lumOff':
			case 'satMod': {
				const converted = hsl(current);
				if (transform.localName === 'lumMod') converted.l = clamp(converted.l * amount);
				else if (transform.localName === 'lumOff') {
					converted.l = clamp(converted.l + amount);
				} else converted.s = clamp(converted.s * amount);
				current = converted.rgb();
				break;
			}
		}
	}
	return { color: current.formatHex(), opacity: clamp(opacity) };
};

const fillNode = (props: Element | undefined) =>
	children(props).find((item) =>
		['solidFill', 'noFill', 'gradFill', 'pattFill', 'blipFill', 'grpFill'].includes(
			item.localName
		)
	);

export const shapePaint = (shape: Element, theme: DrawingTheme, warnings: Set<string>): string => {
	const props = child(shape, 'spPr');
	const style = child(shape, 'style');
	const fillRef = child(style, 'fillRef');
	const fillIndex = number(fillRef, 'idx');
	const inheritedFill = fillIndex >= 1001
		? theme.backgroundFills[fillIndex - 1001]
		: theme.fills[fillIndex - 1];
	const fill = fillNode(props) ?? inheritedFill;
	const fillColor = fill?.localName === 'solidFill'
		? readColor(fill, theme, readColor(fillRef, theme))
		: !fill && fillIndex > 0
		? readColor(fillRef, theme)
		: undefined;
	if (fill && !['solidFill', 'noFill'].includes(fill.localName)) {
		warnings.add('グラデーション・模様・画像による塗りは未対応です。');
	}
	const lineRef = child(style, 'lnRef');
	const themeLine = theme.lines[number(lineRef, 'idx') - 1];
	const line = child(props, 'ln');
	const lineFill = fillNode(line) ?? fillNode(themeLine);
	const lineColor = readColor(lineFill, theme, readColor(lineRef, theme))
		?? readColor(lineRef, theme) ?? { color: '#000000', opacity: 1 };
	const stroke =
		lineFill?.localName === 'noFill' || (!line && lineRef?.getAttribute('idx') === '0')
			|| (!line && !lineRef
				&& ['1', 'true'].includes(
					child(child(shape, 'nvSpPr'), 'cNvSpPr')?.getAttribute('txBox') ?? ''
				))
			? 'none'
			: lineColor.color;
	const width = Math.max(0, number(line, 'w', number(themeLine, 'w', 9525)));
	const dash = child(line, 'prstDash')?.getAttribute('val')
		?? child(themeLine, 'prstDash')?.getAttribute('val');
	const patterns: Record<string, number[]> = {
		dash: [4, 3],
		sysDash: [3, 1],
		dot: [1, 3],
		sysDot: [1, 1],
		dashDot: [4, 3, 1, 3],
		lgDash: [8, 3],
		lgDashDot: [8, 3, 1, 3]
	};
	const dashAttr = dash && patterns[dash]
		? ` stroke-dasharray="${patterns[dash].map((value) => value * width).join(' ')}"`
		: '';
	if (child(line, 'headEnd') || child(line, 'tailEnd')) warnings.add('線の矢印は未対応です。');
	return `fill="${fillColor?.color ?? 'none'}" fill-opacity="${
		fillColor?.opacity ?? 1
	}" stroke="${stroke}" stroke-opacity="${lineColor.opacity}" stroke-width="${width}" stroke-linejoin="round"${dashAttr}`;
};
