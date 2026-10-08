import { formatVtk } from './definition';
import { type ArrayBudget, count } from './numeric';
import type { VtkData, VtkScalar } from './types';

/** 属性の点番号は維持し、体積セルの面照合だけ座標が一致する点を同一視する。 */
export const mergeVtkPieces = (pieces: VtkData[], budget: ArrayBudget): VtkData => {
	if (pieces.length === 1) return pieces[0];
	const pointCount = count(
		pieces.reduce((n, piece) => n + piece.points.length / 3, 0),
		'全Pieceの点数',
		formatVtk.limits.maxSourcePoints
	);
	count(
		pieces.reduce((n, piece) => n + piece.cells.length, 0),
		'全Pieceのセル数',
		formatVtk.limits.maxFeatures
	);
	budget(pointCount * 28);
	const points = new Float64Array(pointCount * 3);
	const topologyIds = new Uint32Array(pointCount);
	const coordinates = new Map<string, number>();
	const cells: VtkData['cells'] = [];
	const scalars = new Map<string, VtkScalar>();
	const cellCount = pieces.reduce((n, piece) => n + piece.cells.length, 0);
	let pointOffset = 0;
	let cellOffset = 0;
	for (const piece of pieces) {
		points.set(piece.points, pointOffset * 3);
		for (let i = 0; i < piece.points.length / 3; i++) {
			const key = `${piece.points[i * 3]},${piece.points[i * 3 + 1]},${
				piece.points[i * 3 + 2]
			}`;
			let id = coordinates.get(key);
			if (id === undefined) {
				id = coordinates.size;
				coordinates.set(key, id);
			}
			topologyIds[pointOffset + i] = id;
		}
		for (const cell of piece.cells) {
			// Validate locally: an invalid index must not accidentally refer to the next Piece.
			for (const id of cell.points) {
				count(id, 'Piece内の頂点参照', piece.points.length / 3 - 1);
			}
			budget(cell.points.length * 8);
			cells.push({ type: cell.type, points: cell.points.map(id => id + pointOffset) });
		}
		const seen = new Set<string>();
		for (const scalar of piece.scalars) {
			const key = JSON.stringify([scalar.association, scalar.name]);
			if (seen.has(key)) throw new Error('VTK: Piece内のスカラー名が重複しています');
			seen.add(key);
			let merged = scalars.get(key);
			if (!merged) {
				const length = scalar.association === 'point' ? pointCount : cellCount;
				budget(length * 8);
				merged = { ...scalar, values: new Float64Array(length).fill(NaN) };
				scalars.set(key, merged);
			}
			merged.values.set(
				scalar.values,
				scalar.association === 'point' ? pointOffset : cellOffset
			);
		}
		pointOffset += piece.points.length / 3;
		cellOffset += piece.cells.length;
	}
	return { points, cells, scalars: [...scalars.values()], topologyIds };
};
