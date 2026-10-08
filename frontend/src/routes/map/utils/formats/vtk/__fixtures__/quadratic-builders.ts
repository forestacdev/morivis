import type { VtkData } from '../types';

/** 原点付近の架空セル。角点と辺を手で定義し、中点を生成する。 */
export const quadraticVolume = (type: number): VtkData => {
	const cube = [[0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0], [0, 0, 2], [2, 0, 2], [2, 2, 2], [
		0,
		2,
		2
	]];
	const layouts: Record<number, { points: number[][]; edges: number[][]; }> = {
		24: {
			points: [cube[0], cube[1], cube[3], cube[4]],
			edges: [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]]
		},
		25: {
			points: cube,
			edges: [
				[0, 1],
				[1, 2],
				[2, 3],
				[3, 0],
				[4, 5],
				[5, 6],
				[6, 7],
				[7, 4],
				[0, 4],
				[1, 5],
				[2, 6],
				[3, 7]
			]
		},
		26: {
			points: [cube[0], cube[1], cube[3], cube[4], cube[5], cube[7]],
			edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]]
		},
		27: {
			points: [...cube.slice(0, 4), [1, 1, 2]],
			edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4]]
		}
	};
	const layout = layouts[type === 29 ? 25 : type];
	const points = [
		...layout.points,
		...layout.edges.map(([a, b]) =>
			layout.points[a].map((value, axis) => (value + layout.points[b][axis]) / 2)
		)
	];
	if (type === 29) {
		points.push([0, 1, 1], [2, 1, 1], [1, 0, 1], [1, 2, 1], [1, 1, 0], [1, 1, 2], [1, 1, 1]);
	}
	return {
		points: Float64Array.from(points.flat()),
		cells: [{ type, points: points.map((_, i) => i) }],
		scalars: []
	};
};
