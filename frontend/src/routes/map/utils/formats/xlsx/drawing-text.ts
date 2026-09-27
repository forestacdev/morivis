import { type Box, child, children, EMU_PER_PIXEL, number } from './drawing-geometry';
import { type DrawingTheme, escapeXml, readColor } from './drawing-style';

type Run = { text: string; size: number; attributes: string; };
type Line = { runs: Run[]; size: number; align: string; };

/** Text remains SVG text until the browser rasterizes it, using locally available fonts. */
export const renderDrawingText = (
	shape: Element,
	box: Box,
	theme: DrawingTheme,
	warnings: Set<string>
): string => {
	const body = child(shape, 'txBody');
	if (!body) return '';
	const props = child(body, 'bodyPr');
	const vertical = props?.getAttribute('vert');
	if (vertical && vertical !== 'horz') warnings.add('縦書きの文字は横書きで表示します。');
	const left = number(props, 'lIns', 91440);
	const right = number(props, 'rIns', 91440);
	const top = number(props, 'tIns', 45720);
	const bottom = number(props, 'bIns', 45720);
	const width = Math.max(1, box.width - left - right);
	const fontRef = child(child(shape, 'style'), 'fontRef');
	const baseColor = readColor(fontRef, theme) ?? { color: '#000000', opacity: 1 };
	const fontScale = number(child(props, 'normAutofit'), 'fontScale', 100000) / 100000;
	const lines: Line[] = [];
	for (const paragraph of children(body, 'p')) {
		const paragraphProps = child(paragraph, 'pPr');
		const level = number(paragraphProps, 'lvl');
		const listProps = child(child(body, 'lstStyle'), `lvl${level + 1}pPr`);
		const defaults = child(paragraphProps, 'defRPr') ?? child(listProps, 'defRPr');
		const align = paragraphProps?.getAttribute('algn') || listProps?.getAttribute('algn')
			|| 'l';
		let line: Line = { runs: [], size: number(defaults, 'sz', 1100) * 127 * fontScale, align };
		let used = 0;
		const flush = () => {
			lines.push(line);
			line = { runs: [], size: line.size, align };
			used = 0;
		};
		for (const item of children(paragraph)) {
			if (item.localName === 'br') {
				flush();
				continue;
			}
			if (!['r', 'fld'].includes(item.localName)) continue;
			const runProps = child(item, 'rPr');
			const size = Math.max(
				1,
				number(runProps, 'sz', number(defaults, 'sz', 1100)) * 127 * fontScale
			);
			const color =
				readColor(child(runProps, 'solidFill') ?? child(defaults, 'solidFill'), theme)
					?? baseColor;
			const rawFont = child(runProps, 'ea')?.getAttribute('typeface')
				|| child(runProps, 'latin')?.getAttribute('typeface')
				|| child(defaults, 'ea')?.getAttribute('typeface')
				|| child(defaults, 'latin')?.getAttribute('typeface')
				|| (fontRef?.getAttribute('idx') === 'major' ? theme.majorFont : theme.minorFont);
			const font = rawFont.startsWith('+mj')
				? theme.majorFont
				: rawFont.startsWith('+mn')
				? theme.minorFont
				: rawFont;
			const flag = (name: string) =>
				['1', 'true'].includes(
					runProps?.getAttribute(name) || defaults?.getAttribute(name) || ''
				);
			const underline = runProps?.getAttribute('u') || defaults?.getAttribute('u');
			const attributes = `font-size="${size / EMU_PER_PIXEL}" font-family="${
				escapeXml(font)
			}" fill="${color.color}" fill-opacity="${color.opacity}" font-weight="${
				flag('b') ? 'bold' : 'normal'
			}" font-style="${flag('i') ? 'italic' : 'normal'}"${
				underline && underline !== 'none' ? ' text-decoration="underline"' : ''
			}`;
			const text = child(item, 't')?.textContent ?? '';
			for (const character of text) {
				const advance = size * (character.codePointAt(0)! > 255 ? 1 : 0.55);
				if (
					character === '\n'
					|| (props?.getAttribute('wrap') !== 'none' && used > 0
						&& used + advance > width)
				) flush();
				if (character === '\n') continue;
				const last = line.runs.at(-1);
				if (last?.attributes === attributes) last.text += character;
				else line.runs.push({ text: character, size, attributes });
				line.size = Math.max(line.size, size);
				used += advance;
			}
		}
		flush();
	}
	if (!lines.some((line) => line.runs.length)) return '';
	const height = lines.reduce((sum, line) => sum + line.size * 1.2, 0);
	const anchor = props?.getAttribute('anchor');
	let y = top + (anchor === 'ctr'
		? (box.height - top - bottom - height) / 2
		: anchor === 'b'
		? box.height - top - bottom - height
		: 0);
	const text = lines.map((line) => {
		y += line.size;
		const x = line.align === 'ctr'
			? left + width / 2
			: line.align === 'r'
			? box.width - right
			: left;
		const result = `<text x="${x / EMU_PER_PIXEL}" y="${y / EMU_PER_PIXEL}" text-anchor="${
			line.align === 'ctr' ? 'middle' : line.align === 'r' ? 'end' : 'start'
		}" stroke="none" xml:space="preserve">${
			line.runs.map((run) => `<tspan ${run.attributes}>${escapeXml(run.text)}</tspan>`).join(
				''
			)
		}</text>`;
		y += line.size * 0.2;
		return result;
	}).join('');
	const rotation = number(props, 'rot') / 60000;
	// SVG font sizes use pixels here: browsers clamp fonts expressed as large EMU values.
	return `<g transform="rotate(${rotation} ${box.width / 2} ${
		box.height / 2
	})"><g transform="scale(${EMU_PER_PIXEL})">${text}</g></g>`;
};
