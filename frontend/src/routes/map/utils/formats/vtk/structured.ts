import { formatVtk } from './definition';
import { type ArrayBudget, count } from './numeric';
import type { VtkCell } from './types';

export const gridDimensions = (values: number[]): number[] => {
	if (values.length !== 3 || values.some(value => !Number.isSafeInteger(value) || value < 1)) {
		throw new Error('VTK: 格子のDIMENSIONSが不正です');
	}
	count(values.reduce((a, b) => a * b, 1), '格子点数', formatVtk.limits.maxSourcePoints);
	return values;
};

export const gridExtent = (text: string): number[] => {
	const values = text.trim().split(/\s+/).map(Number);
	if (values.length !== 6 || values.some(value => !Number.isSafeInteger(value))) {
		throw new Error('VTK: Extentが不正です');
	}
	gridDimensions([0, 1, 2].map(axis => values[axis * 2 + 1] - values[axis * 2] + 1));
	return values;
};

/** VTKの点・セルはXが最も速く変化する。縮退した軸もセル数の係数は1。 */
export const gridCells = (dimensions: number[], budget: ArrayBudget): VtkCell[] => {
	const dims = gridDimensions(dimensions);
	const strides = [1, dims[0], dims[0] * dims[1]];
	const axes = [0, 1, 2].filter(axis => dims[axis] > 1);
	const sizes = dims.map(n => Math.max(n - 1, 1));
	const n = count(sizes.reduce((a, b) => a * b, 1), '格子セル数', formatVtk.limits.maxFeatures);
	const offsets = axes.length === 3
		? [
			0,
			1,
			1 + strides[1],
			strides[1],
			strides[2],
			strides[2] + 1,
			strides[2] + strides[1] + 1,
			strides[2] + strides[1]
		]
		: axes.length === 2
		? [0, strides[axes[0]], strides[axes[0]] + strides[axes[1]], strides[axes[1]]]
		: axes.length === 1
		? [0, strides[axes[0]]]
		: [0];
	budget(n * offsets.length * 8);
	const cells: VtkCell[] = [];
	for (let z = 0; z < sizes[2]; z++) {
		for (let y = 0; y < sizes[1]; y++) {
			for (let x = 0; x < sizes[0]; x++) {
				const base = x + y * strides[1] + z * strides[2];
				cells.push({
					type: [1, 3, 9, 12][axes.length],
					points: offsets.map(offset => base + offset)
				});
			}
		}
	}
	return cells;
};

export const gridPoints = (coordinates: Float64Array[], budget: ArrayBudget): Float64Array => {
	const dimensions = gridDimensions(coordinates.map(values => values.length));
	const n = dimensions.reduce((a, b) => a * b, 1);
	budget(n * 24);
	const points = new Float64Array(n * 3);
	let i = 0;
	for (const z of coordinates[2]) {
		for (const y of coordinates[1]) {
			for (const x of coordinates[0]) {
				points[i++] = x;
				points[i++] = y;
				points[i++] = z;
			}
		}
	}
	return points;
};
