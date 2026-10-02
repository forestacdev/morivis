/** VTK cell types 21–29。面の並びは角頂点、辺の中点、面中心。 */
export const QUADRATIC_SIZE: Record<number, number> = {
	21: 3,
	22: 6,
	23: 8,
	24: 10,
	25: 20,
	26: 15,
	27: 13,
	28: 9,
	29: 27
};

const HEX_FACES = [
	[0, 4, 7, 3, 16, 15, 19, 11],
	[1, 2, 6, 5, 9, 18, 13, 17],
	[0, 1, 5, 4, 8, 17, 12, 16],
	[3, 7, 6, 2, 19, 14, 18, 10],
	[0, 3, 2, 1, 11, 10, 9, 8],
	[4, 5, 6, 7, 12, 13, 14, 15]
];
export const QUADRATIC_FACES: Record<number, number[][]> = {
	24: [[0, 1, 2, 4, 5, 6], [0, 3, 1, 7, 8, 4], [1, 3, 2, 8, 9, 5], [2, 3, 0, 9, 7, 6]],
	25: HEX_FACES,
	26: [[0, 2, 1, 8, 7, 6], [3, 4, 5, 9, 10, 11], [0, 1, 4, 3, 6, 13, 9, 12], [
		1,
		2,
		5,
		4,
		7,
		14,
		10,
		13
	], [2, 0, 3, 5, 8, 12, 11, 14]],
	27: [
		[0, 3, 2, 1, 8, 7, 6, 5],
		[0, 1, 4, 5, 10, 9],
		[1, 2, 4, 6, 11, 10],
		[2, 3, 4, 7, 12, 11],
		[3, 0, 4, 8, 9, 12]
	],
	29: HEX_FACES.map((face, i) => [...face, 20 + i])
};

const weightsAt = (size: number, u: number, v: number): number[] => {
	if (size === 6) {
		const w = 1 - u - v;
		return [w * (2 * w - 1), u * (2 * u - 1), v * (2 * v - 1), 4 * w * u, 4 * u * v, 4 * v * w];
	}
	const r = 2 * u - 1;
	const s = 2 * v - 1;
	if (size === 9) {
		const a = [r * (r - 1) / 2, r * (r + 1) / 2, 1 - r * r];
		const b = [s * (s - 1) / 2, s * (s + 1) / 2, 1 - s * s];
		return [
			a[0] * b[0],
			a[1] * b[0],
			a[1] * b[1],
			a[0] * b[1],
			a[2] * b[0],
			a[1] * b[2],
			a[2] * b[1],
			a[0] * b[2],
			a[2] * b[2]
		];
	}
	return [
		(1 - r) * (1 - s) * (-r - s - 1) / 4,
		(1 + r) * (1 - s) * (r - s - 1) / 4,
		(1 + r) * (1 + s) * (r + s - 1) / 4,
		(1 - r) * (1 + s) * (-r + s - 1) / 4,
		(1 - r * r) * (1 - s) / 2,
		(1 + r) * (1 - s * s) / 2,
		(1 - r * r) * (1 + s) / 2,
		(1 - r) * (1 - s * s) / 2
	];
};

/** 各辺を4分割する。全ての中間節点を通り、曲面を線形三角形で近似する。 */
const makePatch = (size: number) => {
	const weights: number[][] = [];
	const triangles: number[] = [];
	const rows: number[][] = [];
	for (let j = 0; j <= 4; j++) {
		const row: number[] = [];
		for (let i = 0; i <= (size === 6 ? 4 - j : 4); i++) {
			row.push(weights.length);
			weights.push(weightsAt(size, i / 4, j / 4));
		}
		rows.push(row);
	}
	for (let j = 0; j < 4; j++) {
		for (let i = 0; i < rows[j].length - 1; i++) {
			triangles.push(rows[j][i], rows[j][i + 1], rows[j + 1][i]);
			if (i + 1 < rows[j + 1].length) {
				triangles.push(rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]);
			}
		}
	}
	return { weights, triangles };
};

export const QUADRATIC_PATCHES = new Map([6, 8, 9].map(size => [size, makePatch(size)]));
