import { DOMParser } from '@xmldom/xmldom';
import { unzlibSync } from 'three/addons/libs/fflate.module.js';
import { formatVtk } from './definition';
import { cellsFromOffsets } from './legacy';
import { type ArrayBudget, count, readAsciiNumbers, readBinaryNumbers, typeSize } from './numeric';
import { mergeVtkPieces } from './pieces';
import { gridCells, gridExtent, gridPoints } from './structured';
import type { VtkCell, VtkData, VtkScalar } from './types';

const children = (element: Element, name: string): Element[] =>
	Array.from(element.childNodes).filter((node): node is Element =>
		node.nodeType === 1 && node.nodeName === name
	);

const one = (element: Element, name: string): Element => {
	const matches = children(element, name);
	if (matches.length !== 1) throw new Error(`VTK: ${name}は1つ必要です`);
	return matches[0];
};

const attributeCount = (element: Element, name: string, maximum: number, fallback?: number) => {
	const value = element.getAttribute(name);
	if (!value?.trim() && fallback === undefined) throw new Error(`VTK: ${name}がありません`);
	return count(value?.trim() ? Number(value) : fallback!, name, maximum);
};

// VTK writers can encode the compression header and payload as separate base64 segments.
const decodeBase64 = (text: string): Uint8Array => {
	const encoded = text.replace(/\s+/g, '');
	if (/[^A-Za-z0-9+/=]/.test(encoded)) throw new Error('VTK: Base64が不正です');
	const chunks: string[] = [];
	let length = 0;
	let consumed = 0;
	try {
		for (const match of encoded.matchAll(/[A-Za-z0-9+/]+={0,2}/g)) {
			if (match.index !== consumed || match[0].length % 4) throw new Error('Base64');
			consumed += match[0].length;
			const chunk = atob(match[0]);
			length += chunk.length;
			chunks.push(chunk);
		}
		if (consumed !== encoded.length) throw new Error('Base64');
	} catch {
		throw new Error('VTK: Base64が不正です');
	}
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		for (let i = 0; i < chunk.length; i++) bytes[offset++] = chunk.charCodeAt(i);
	}
	return bytes;
};

const unpack = (
	bytes: Uint8Array,
	headerType: string,
	littleEndian: boolean,
	compressed: boolean,
	budget: ArrayBudget
): Uint8Array => {
	const size = typeSize(headerType);
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const header = (i: number) => {
		if ((i + 1) * size > bytes.length) {
			throw new Error('VTK: バイナリヘッダーが途中で切れています');
		}
		return count(
			size === 4
				? view.getUint32(i * size, littleEndian)
				: Number(view.getBigUint64(i * size, littleEndian)),
			'バイナリヘッダー'
		);
	};
	if (!compressed) {
		const length = header(0);
		if (length > bytes.length - size) throw new Error('VTK: バイナリ配列が途中で切れています');
		return bytes.subarray(size, size + length);
	}
	const blocks = count(header(0), '圧縮ブロック数', 1_000_000);
	const blockSize = header(1);
	const lastSize = header(2);
	if (blocks && (!blockSize || lastSize > blockSize)) {
		throw new Error('VTK: 圧縮ブロック長が不正です');
	}
	// Last block size 0 means all blocks have the full block size (vtkXMLWriter).
	const finalSize = lastSize || blockSize;
	const length = blocks ? (blocks - 1) * blockSize + finalSize : 0;
	budget(length);
	let inputOffset = (3 + blocks) * size;
	if (inputOffset > bytes.length) throw new Error('VTK: 圧縮ヘッダーが途中で切れています');
	const output = new Uint8Array(length);
	let outputOffset = 0;
	for (let i = 0; i < blocks; i++) {
		const compressedSize = header(3 + i);
		if (!compressedSize || inputOffset + compressedSize > bytes.length) {
			throw new Error('VTK: 圧縮配列が途中で切れています');
		}
		const expected = i === blocks - 1 ? finalSize : blockSize;
		const decoded = unzlibSync(bytes.subarray(inputOffset, inputOffset + compressedSize), {
			out: new Uint8Array(expected + 1)
		});
		if (decoded.length !== expected) throw new Error('VTK: 展開後のブロック長が一致しません');
		output.set(decoded, outputOffset);
		outputOffset += expected;
		inputOffset += compressedSize;
	}
	return output;
};

export const parseXmlVtk = (bytes: Uint8Array, budget: ArrayBudget): VtkData => {
	// Latin-1 keeps one code unit per byte, so offsets remain byte offsets even for raw data.
	const byteText = new TextDecoder('latin1').decode(bytes);
	const start = byteText.indexOf('<AppendedData');
	let appended: Uint8Array | undefined;
	let xml: string;
	if (start >= 0) {
		const tagEnd = byteText.indexOf('>', start);
		const end = byteText.lastIndexOf('</AppendedData>');
		if (tagEnd < 0 || end < tagEnd) throw new Error('VTK: AppendedDataが不正です');
		const marker = byteText.indexOf('_', tagEnd + 1);
		if (marker < 0 || marker >= end || byteText.slice(tagEnd + 1, marker).trim()) {
			throw new Error('VTK: AppendedDataの開始記号がありません');
		}
		appended = bytes.subarray(marker + 1, end);
		xml = new TextDecoder().decode(bytes.subarray(0, tagEnd + 1))
			+ '_' + new TextDecoder().decode(bytes.subarray(end));
	} else xml = new TextDecoder().decode(bytes);
	if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('VTK: DTD・外部実体には対応していません');
	const failXml = () => {
		throw new Error('VTK: XMLの構造が不正です');
	};
	const doc = new DOMParser({
		errorHandler: { warning: failXml, error: failXml, fatalError: failXml }
	})
		.parseFromString(xml, 'application/xml');
	const root = doc.documentElement;
	if (!root || root.tagName !== 'VTKFile') throw new Error('VTK: VTKFileがありません');
	const type = root.getAttribute('type');
	if (
		!type
		|| !['PolyData', 'UnstructuredGrid', 'ImageData', 'RectilinearGrid', 'StructuredGrid']
			.includes(type)
	) {
		throw new Error('VTK: 未対応のXMLデータセットです');
	}
	const dataset = one(root, type);
	const pieces = children(dataset, 'Piece');
	if (!pieces.length) throw new Error('VTK: Pieceがありません');
	const structured = !['PolyData', 'UnstructuredGrid'].includes(type);
	const whole = structured ? gridExtent(dataset.getAttribute('WholeExtent') ?? '') : undefined;
	const order = root.getAttribute('byte_order');
	if (order !== 'LittleEndian' && order !== 'BigEndian') {
		throw new Error('VTK: byte_orderが不正です');
	}
	const littleEndian = order === 'LittleEndian';
	const headerType = root.getAttribute('header_type') || 'UInt32';
	if (headerType !== 'UInt32' && headerType !== 'UInt64') {
		throw new Error('VTK: header_typeが不正です');
	}
	const compressor = root.getAttribute('compressor');
	if (compressor && compressor !== 'vtkZLibDataCompressor') {
		throw new Error(`VTK: 未対応の圧縮方式です (${compressor})`);
	}
	const appendedElement = children(root, 'AppendedData')[0];
	const encoding = appendedElement?.getAttribute('encoding');
	if (appended && encoding !== 'raw' && encoding !== 'base64') {
		throw new Error('VTK: AppendedDataのencodingが不正です');
	}
	const appendedOffsets = Array.from(root.getElementsByTagName('DataArray'))
		.filter(element => element.getAttribute('format') === 'appended')
		.map(element => attributeCount(element, 'offset', appended?.length ?? 0)).sort((a, b) =>
			a - b
		);
	const read = (element: Element): Float64Array => {
		const numericType = element.getAttribute('type') ?? '';
		typeSize(numericType);
		const format = element.getAttribute('format') || 'ascii';
		if (format === 'ascii') return readAsciiNumbers(element.textContent ?? '', budget);
		let encodedBytes: Uint8Array;
		if (format === 'binary') encodedBytes = decodeBase64(element.textContent ?? '');
		else if (format === 'appended') {
			if (!appended) throw new Error('VTK: AppendedDataがありません');
			const offset = attributeCount(element, 'offset', appended.length);
			const next = appendedOffsets.find(value => value > offset) ?? appended.length;
			const source = appended.subarray(offset, next);
			encodedBytes = encoding === 'raw'
				? source
				: decodeBase64(new TextDecoder().decode(source));
		} else throw new Error(`VTK: 未対応のDataArray格納方式です (${format})`);
		return readBinaryNumbers(
			unpack(encodedBytes, headerType, littleEndian, !!compressor, budget),
			numericType,
			littleEndian,
			budget
		);
	};
	const parsePiece = (piece: Element): VtkData => {
		let dimensions: number[] | undefined;
		let extent: number[] | undefined;
		if (whole) {
			extent = gridExtent(piece.getAttribute('Extent') ?? '');
			if (
				[0, 1, 2].some(axis =>
					extent![axis * 2] < whole[axis * 2]
					|| extent![axis * 2 + 1] > whole[axis * 2 + 1]
				)
			) throw new Error('VTK: PieceのExtentがWholeExtentの範囲外です');
			dimensions = [0, 1, 2].map(axis => extent![axis * 2 + 1] - extent![axis * 2] + 1);
		}
		const pointCount = dimensions
			? dimensions.reduce((a, b) => a * b, 1)
			: attributeCount(piece, 'NumberOfPoints', formatVtk.limits.maxSourcePoints);
		let points: Float64Array;
		if (type === 'ImageData') {
			const vector = (name: string, fallback: number[], length: number) => {
				const text = dataset.getAttribute(name);
				const values = text ? text.trim().split(/\s+/).map(Number) : fallback;
				if (values.length !== length || values.some(value => !Number.isFinite(value))) {
					throw new Error(`VTK: ${name}が不正です`);
				}
				return values;
			};
			const origin = vector('Origin', [0, 0, 0], 3);
			const spacing = vector('Spacing', [1, 1, 1], 3);
			const direction = vector('Direction', [1, 0, 0, 0, 1, 0, 0, 0, 1], 9);
			points = gridPoints(
				dimensions!.map((n, axis) =>
					Float64Array.from(
						{ length: n },
						(_, i) => (extent![axis * 2] + i) * spacing[axis]
					)
				),
				budget
			);
			for (let i = 0; i < points.length; i += 3) {
				const local = points.slice(i, i + 3);
				for (let axis = 0; axis < 3; axis++) {
					points[i + axis] = origin[axis]
						+ local.reduce(
							(sum, value, column) => sum + direction[axis * 3 + column] * value,
							0
						);
				}
			}
		} else if (type === 'RectilinearGrid') {
			const arrays = children(one(piece, 'Coordinates'), 'DataArray');
			if (arrays.length !== 3) throw new Error('VTK: 格子の座標配列は3つ必要です');
			const coordinates = arrays.map((array, axis) => {
				if (attributeCount(array, 'NumberOfComponents', 1, 1) !== 1) {
					throw new Error('VTK: 格子座標には1成分が必要です');
				}
				const values = read(array);
				if (values.length !== dimensions![axis]) {
					throw new Error('VTK: 格子座標数が一致しません');
				}
				return values;
			});
			points = gridPoints(coordinates, budget);
		} else if (!pointCount && !children(piece, 'Points').length) points = new Float64Array();
		else {
			const pointArray = one(one(piece, 'Points'), 'DataArray');
			if (attributeCount(pointArray, 'NumberOfComponents', 3, 1) !== 3) {
				throw new Error('VTK: 座標には3成分が必要です');
			}
			points = read(pointArray);
		}
		if (points.length !== pointCount * 3) throw new Error('VTK: 座標数が一致しません');
		const readCells = (name: string, n: number, cellType: number): VtkCell[] => {
			const sections = children(piece, name);
			if (!sections.length && !n) return [];
			const section = one(piece, name);
			const arrays = children(section, 'DataArray');
			if (!n && !arrays.length) return [];
			const named = (label: string) => {
				const matches = arrays.filter(array => array.getAttribute('Name') === label);
				if (matches.length !== 1) throw new Error(`VTK: ${name}/${label}は1つ必要です`);
				if (attributeCount(matches[0], 'NumberOfComponents', 1, 1) !== 1) {
					throw new Error('VTK: セル接続には1成分が必要です');
				}
				return read(matches[0]);
			};
			const cells = cellsFromOffsets(named('connectivity'), named('offsets'), cellType);
			if (cells.length !== n) throw new Error('VTK: セル数が一致しません');
			if (name === 'Cells') {
				const types = named('types');
				if (types.length !== n) throw new Error('VTK: セル型の数が一致しません');
				cells.forEach((cell, i) => {
					cell.type = types[i];
				});
			}
			return cells;
		};
		const cells = structured ? gridCells(dimensions!, budget) : type === 'UnstructuredGrid'
			? readCells(
				'Cells',
				attributeCount(piece, 'NumberOfCells', formatVtk.limits.maxFeatures),
				0
			)
			: [['Verts', 2], ['Lines', 4], ['Polys', 7], ['Strips', 6]].flatMap((
				[name, cellType]
			) => readCells(
				String(name),
				attributeCount(piece, `NumberOf${name}`, formatVtk.limits.maxFeatures, 0),
				Number(cellType)
			));
		count(cells.length, 'セル数', formatVtk.limits.maxFeatures);
		const scalars: VtkScalar[] = [];
		for (const association of ['point', 'cell'] as const) {
			const sectionName = association === 'point' ? 'PointData' : 'CellData';
			const sections = children(piece, sectionName);
			if (!sections.length) continue;
			const section = one(piece, sectionName);
			const tuples = association === 'point' ? pointCount : cells.length;
			for (const array of children(section, 'DataArray')) {
				const components = attributeCount(array, 'NumberOfComponents', 1024, 1);
				if (!components) throw new Error('VTK: 属性成分数が0です');
				const values = read(array);
				if (values.length !== tuples * components) {
					throw new Error('VTK: 属性数が一致しません');
				}
				const name = array.getAttribute('Name') || `array-${scalars.length + 1}`;
				if (name === 'vtkGhostType' && values.some(value => value !== 0)) {
					throw new Error('VTK: ghost cell/pointを含むデータには対応していません');
				}
				if (components === 1 && name !== 'vtkGhostType') {
					scalars.push({ name, association, values });
				}
			}
		}
		return { points, cells, scalars };
	};
	const parsed: VtkData[] = [];
	let totalPoints = 0;
	let totalCells = 0;
	for (const piece of pieces) {
		const data = parsePiece(piece);
		totalPoints += data.points.length / 3;
		totalCells += data.cells.length;
		count(totalPoints, '全Pieceの点数', formatVtk.limits.maxSourcePoints);
		count(totalCells, '全Pieceのセル数', formatVtk.limits.maxFeatures);
		parsed.push(data);
	}
	return mergeVtkPieces(parsed, budget);
};
