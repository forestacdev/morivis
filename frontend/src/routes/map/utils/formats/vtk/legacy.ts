import { formatVtk } from './definition';
import { type ArrayBudget, count, numericToken, readBinaryNumbers, typeSize } from './numeric';
import { gridCells, gridDimensions, gridPoints } from './structured';
import type { VtkCell, VtkData, VtkScalar } from './types';

const LEGACY_TYPES: Record<string, string> = {
	char: 'Int8',
	signed_char: 'Int8',
	unsigned_char: 'UInt8',
	short: 'Int16',
	unsigned_short: 'UInt16',
	int: 'Int32',
	unsigned_int: 'UInt32',
	float: 'Float32',
	double: 'Float64',
	vtkidtype: 'Int64',
	vtktypeint64: 'Int64',
	vtktypeuint64: 'UInt64',
	long_long: 'Int64',
	unsigned_long_long: 'UInt64'
};

const createReader = (bytes: Uint8Array, budget: ArrayBudget) => {
	let offset = 0;
	const decoder = new TextDecoder();
	const whitespace = (value: number) => value === 32 || (value >= 9 && value <= 13);
	const line = (): string => {
		const start = offset;
		while (offset < bytes.length && bytes[offset] !== 10) offset++;
		const text = decoder.decode(bytes.subarray(start, offset)).trim();
		if (offset < bytes.length) offset++;
		return text;
	};
	const header = (): string[] => {
		while (offset < bytes.length) {
			const text = line();
			if (text) return text.split(/\s+/);
		}
		return [];
	};
	const numbers = (length: number, type: string, binary: boolean) => {
		count(length, '配列長', formatVtk.limits.maxExpandedBytes / 8);
		const mapped = LEGACY_TYPES[type.toLowerCase()];
		if (!mapped) throw new Error(`VTK: 未対応のLegacy数値型です (${type})`);
		if (binary) {
			const end = offset + length * typeSize(mapped);
			if (end > bytes.length) throw new Error('VTK: バイナリ配列が途中で切れています');
			const values = readBinaryNumbers(bytes.subarray(offset, end), mapped, false, budget);
			offset = end;
			return values;
		}
		budget(length * 8);
		const values = new Float64Array(length);
		for (let i = 0; i < length; i++) {
			while (offset < bytes.length && whitespace(bytes[offset])) offset++;
			const start = offset;
			while (offset < bytes.length && !whitespace(bytes[offset])) offset++;
			if (start === offset) throw new Error('VTK: 数値配列が途中で切れています');
			values[i] = numericToken(decoder.decode(bytes.subarray(start, offset)));
		}
		return values;
	};
	const nextIsOffsets = () => {
		let start = offset;
		while (start < bytes.length && whitespace(bytes[start])) start++;
		return decoder.decode(bytes.subarray(start, start + 7)).toUpperCase() === 'OFFSETS';
	};
	return { line, header, numbers, nextIsOffsets };
};

export const cellsFromOffsets = (
	connectivity: Float64Array,
	offsets: Float64Array,
	type: number
): VtkCell[] => {
	count(offsets.length, 'セル数', formatVtk.limits.maxFeatures);
	let start = 0;
	const cells = Array.from(offsets, end => {
		count(end, 'セル終端', connectivity.length);
		if (end <= start) throw new Error('VTK: セルの接続オフセットが不正です');
		const points = Array.from(connectivity.subarray(start, end));
		start = end;
		return { type, points };
	});
	if (start !== connectivity.length) throw new Error('VTK: セル接続配列の長さが一致しません');
	return cells;
};

export const parseLegacyVtk = (bytes: Uint8Array, budget: ArrayBudget): VtkData => {
	const reader = createReader(bytes, budget);
	if (!/^#\s*vtk DataFile Version \d+\.\d+/i.test(reader.line())) {
		throw new Error('VTK: Legacyヘッダーがありません');
	}
	reader.line(); // タイトルは空でもよい。
	const encoding = reader.line().toUpperCase();
	if (encoding !== 'ASCII' && encoding !== 'BINARY') throw new Error('VTK: 不明な格納方式です');
	const binary = encoding === 'BINARY';
	const datasetHeader = reader.header();
	const dataset = datasetHeader[1]?.toUpperCase();
	if (
		datasetHeader[0]?.toUpperCase() !== 'DATASET'
		|| ![
			'POLYDATA',
			'UNSTRUCTURED_GRID',
			'STRUCTURED_POINTS',
			'STRUCTURED_GRID',
			'RECTILINEAR_GRID'
		].includes(dataset)
	) {
		throw new Error('VTK: 未対応のLegacy DATASETです');
	}
	let points: Float64Array | undefined;
	const structured = !['POLYDATA', 'UNSTRUCTURED_GRID'].includes(dataset);
	let dimensions: number[] | undefined;
	let origin = [0, 0, 0];
	let spacing = [1, 1, 1];
	const coordinates: Float64Array[] = [];
	const gridSections = new Set<string>();
	const groups = new Map<string, VtkCell[]>();
	let types: Float64Array | undefined;
	const scalars: VtkScalar[] = [];
	let association: VtkScalar['association'] | undefined;
	let tuples = 0;
	const dataCounts = new Map<string, number>();
	const read = (n: number, type: string) => reader.numbers(n, type, binary);
	const addScalar = (name: string, components: number, values: Float64Array, n = tuples) => {
		if (name === 'vtkGhostType') {
			if (values.some(value => value !== 0)) {
				throw new Error('VTK: ghost cell/pointを含むデータには対応していません');
			}
			return;
		}
		if (association && components === 1 && n === tuples) {
			scalars.push({ name, association, values });
		}
	};
	let totalCells = 0;
	for (let header = reader.header(); header.length; header = reader.header()) {
		const [rawKey, a, b, c] = header;
		const key = rawKey.toUpperCase();
		if (
			[
				'DIMENSIONS',
				'ORIGIN',
				'SPACING',
				'ASPECT_RATIO',
				'X_COORDINATES',
				'Y_COORDINATES',
				'Z_COORDINATES'
			].includes(key)
		) {
			const section = key === 'ASPECT_RATIO' ? 'SPACING' : key;
			if (!structured || gridSections.has(section)) {
				throw new Error('VTK: 格子の定義が不正または重複しています');
			}
			gridSections.add(section);
			if (key === 'DIMENSIONS') dimensions = gridDimensions(header.slice(1).map(Number));
			else if (key.endsWith('_COORDINATES')) {
				if (dataset !== 'RECTILINEAR_GRID') {
					throw new Error('VTK: 座標配列とDATASETが一致しません');
				}
				coordinates['XYZ'.indexOf(key[0])] = read(
					count(Number(a), '軸の点数', formatVtk.limits.maxSourcePoints),
					b
				);
			} else {
				if (dataset !== 'STRUCTURED_POINTS') {
					throw new Error('VTK: ORIGIN/SPACINGとDATASETが一致しません');
				}
				const values = header.slice(1).map(Number);
				if (values.length !== 3 || values.some(value => !Number.isFinite(value))) {
					throw new Error('VTK: ORIGIN/SPACINGが不正です');
				}
				if (key === 'ORIGIN') origin = values;
				else spacing = values;
			}
		} else if (key === 'POINTS') {
			if (structured && dataset !== 'STRUCTURED_GRID') {
				throw new Error('VTK: POINTSとDATASETが一致しません');
			}
			if (points) throw new Error('VTK: POINTSが重複しています');
			const n = count(Number(a), '点数', formatVtk.limits.maxSourcePoints);
			points = read(n * 3, b);
		} else if (['VERTICES', 'LINES', 'POLYGONS', 'TRIANGLE_STRIPS', 'CELLS'].includes(key)) {
			if (structured) throw new Error('VTK: 構造格子にセル接続配列は指定できません');
			if (groups.has(key)) throw new Error(`VTK: ${key}が重複しています`);
			if ((key === 'CELLS') !== (dataset === 'UNSTRUCTURED_GRID')) {
				throw new Error('VTK: DATASETとセル定義が一致しません');
			}
			const n = count(Number(a), 'セル数', formatVtk.limits.maxFeatures + 1);
			const length = count(Number(b), '接続配列長', formatVtk.limits.maxExpandedBytes / 8);
			const cellType = { VERTICES: 2, LINES: 4, POLYGONS: 7, TRIANGLE_STRIPS: 6 }[key] ?? 0;
			let cells: VtkCell[];
			if (reader.nextIsOffsets()) {
				const offsetsHeader = reader.header();
				const offsets = read(n, offsetsHeader[1]);
				const connectivityHeader = reader.header();
				if (connectivityHeader[0]?.toUpperCase() !== 'CONNECTIVITY' || offsets[0] !== 0) {
					throw new Error('VTK: OFFSETS / CONNECTIVITYが不正です');
				}
				cells = cellsFromOffsets(
					read(length, connectivityHeader[1]),
					offsets.subarray(1),
					cellType
				);
			} else {
				const values = read(length, 'int');
				cells = [];
				let offset = 0;
				for (let i = 0; i < n; i++) {
					const size = count(values[offset++], 'セル頂点数', values.length - offset);
					if (!size) throw new Error('VTK: 空のセルがあります');
					cells.push({
						type: cellType,
						points: Array.from(values.subarray(offset, offset + size))
					});
					offset += size;
				}
				if (offset !== length) throw new Error('VTK: セル接続配列の長さが一致しません');
			}
			totalCells += cells.length;
			count(totalCells, 'セル数', formatVtk.limits.maxFeatures);
			groups.set(key, cells);
		} else if (key === 'CELL_TYPES') {
			if (dataset !== 'UNSTRUCTURED_GRID') {
				throw new Error('VTK: CELL_TYPESとDATASETが一致しません');
			}
			if (types) throw new Error('VTK: CELL_TYPESが重複しています');
			types = read(count(Number(a), 'セル数', formatVtk.limits.maxFeatures), 'int');
		} else if (key === 'POINT_DATA' || key === 'CELL_DATA') {
			association = key === 'POINT_DATA' ? 'point' : 'cell';
			tuples = count(Number(a), '属性数', formatVtk.limits.maxSourcePoints);
			if (dataCounts.has(association)) throw new Error('VTK: 属性セクションが重複しています');
			dataCounts.set(association, tuples);
		} else if (key === 'SCALARS') {
			if (!association) throw new Error('VTK: 属性の関連先がありません');
			const components = count(Number(c ?? 1), 'スカラー成分数', 4);
			if (!components) throw new Error('VTK: スカラー成分数が0です');
			if (reader.header()[0]?.toUpperCase() !== 'LOOKUP_TABLE') {
				throw new Error('VTK: LOOKUP_TABLEがありません');
			}
			addScalar(a, components, read(tuples * components, b));
		} else if (key === 'FIELD') {
			const arrays = count(Number(b), 'FIELD配列数', 1024);
			for (let i = 0; i < arrays; i++) {
				const [name, componentText, tupleText, type] = reader.header();
				const components = count(Number(componentText), 'FIELD成分数', 1024);
				const n = count(
					Number(tupleText),
					'FIELD要素数',
					formatVtk.limits.maxExpandedBytes / 8
				);
				if (!components) throw new Error('VTK: FIELD成分数が0です');
				addScalar(name, components, read(n * components, type), n);
			}
		} else if (
			['VECTORS', 'NORMALS', 'TENSORS', 'TEXTURE_COORDINATES', 'COLOR_SCALARS'].includes(key)
		) {
			if (!association) throw new Error('VTK: 属性の関連先がありません');
			const components = key === 'TENSORS'
				? 9
				: key === 'TEXTURE_COORDINATES' || key === 'COLOR_SCALARS'
				? Number(b)
				: 3;
			count(components, '属性成分数', 9);
			if (!components) throw new Error('VTK: 属性成分数が0です');
			read(
				tuples * components,
				key === 'COLOR_SCALARS'
					? (binary ? 'unsigned_char' : 'float')
					: key === 'TEXTURE_COORDINATES'
					? c
					: b
			);
		} else if (key === 'LOOKUP_TABLE') {
			read(count(Number(b), '色数', 65536) * 4, binary ? 'unsigned_char' : 'float');
		} else {
			throw new Error(`VTK: 未対応のLegacyセクションです (${rawKey})`);
		}
	}
	if (structured) {
		if (!dimensions) throw new Error('VTK: DIMENSIONSがありません');
		if (dataset === 'STRUCTURED_POINTS') {
			points = gridPoints(
				dimensions.map((n, axis) =>
					Float64Array.from({ length: n }, (_, i) => origin[axis] + i * spacing[axis])
				),
				budget
			);
		} else if (dataset === 'RECTILINEAR_GRID') {
			if (dimensions.some((n, axis) => coordinates[axis]?.length !== n)) {
				throw new Error('VTK: 格子座標数が一致しません');
			}
			points = gridPoints(coordinates, budget);
		}
		if (points?.length !== dimensions.reduce((a, b) => a * b, 1) * 3) {
			throw new Error('VTK: 格子座標数が一致しません');
		}
	}
	if (!points?.length) throw new Error('VTK: 座標がありません');
	// vtkPolyDataのCELL_DATAはファイルの記載順によらずverts, lines, polys, strips順。
	const cells = structured ? gridCells(dimensions!, budget) : dataset === 'POLYDATA'
		? ['VERTICES', 'LINES', 'POLYGONS', 'TRIANGLE_STRIPS'].flatMap(key => groups.get(key) ?? [])
		: groups.get('CELLS') ?? [];
	if (dataset === 'UNSTRUCTURED_GRID') {
		if (!types || types.length !== cells.length) {
			throw new Error('VTK: CELL_TYPESの数が一致しません');
		}
		cells.forEach((cell, i) => {
			cell.type = types![i];
		});
	}
	for (const [kind, n] of dataCounts) {
		if (n !== (kind === 'point' ? points.length / 3 : cells.length)) {
			throw new Error('VTK: 属性数と点・セル数が一致しません');
		}
	}
	return { points, cells, scalars };
};
