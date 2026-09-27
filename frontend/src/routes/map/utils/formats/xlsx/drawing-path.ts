import { SVGPathData, SVGPathDataTransformer } from 'svg-pathdata';

import { children, number, parseXml } from './drawing-geometry';

/** Bake group coordinates into the outline. DrawingML line widths remain physical EMUs. */
export const transformDrawingOutline = (svg: string, matrix: number[]): string => {
	const root = parseXml(`<svg>${svg}</svg>`);
	return children(root).map((element) => {
		let path: string;
		const w = number(element, 'width'), h = number(element, 'height');
		switch (element.localName) {
			case 'path':
				path = element.getAttribute('d') ?? '';
				break;
			case 'rect':
				path = `M0 0 H${w} V${h} H0 Z`;
				break;
			case 'line':
				path = `M${number(element, 'x1')} ${number(element, 'y1')} L${
					number(element, 'x2')
				} ${number(element, 'y2')}`;
				break;
			case 'polygon':
				path = `M${element.getAttribute('points')} Z`;
				break;
			case 'ellipse': {
				const cx = number(element, 'cx'), cy = number(element, 'cy');
				const rx = number(element, 'rx'), ry = number(element, 'ry');
				path = `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${
					cx - rx
				} ${cy} Z`;
				break;
			}
			default:
				throw new Error('未対応の図形パス');
		}
		const [a, b, c, d, e, f] = matrix;
		const transformed = new SVGPathData(path).toAbs()
			.transform(SVGPathDataTransformer.NORMALIZE_HVZ())
			.transform(SVGPathDataTransformer.A_TO_C())
			.matrix(a, b, c, d, e, f).encode();
		const fill = element.getAttribute('fill') === 'none' ? ' fill="none"' : '';
		const stroke = element.getAttribute('stroke') === 'none' ? ' stroke="none"' : '';
		return `<path${fill}${stroke} d="${transformed}"/>`;
	}).join('');
};
