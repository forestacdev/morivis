export type GeoRefCorners = [
	[number, number],
	[number, number],
	[number, number],
	[number, number]
];

export interface HomographyMatrix {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
	g: number;
	h: number;
}

const solveLinearSystem = (matrix: number[][], values: number[]): number[] => {
	const size = values.length;
	const augmented = matrix.map((row, rowIndex) => [...row, values[rowIndex]]);

	for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
		let maxRowIndex = pivotIndex;
		for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex += 1) {
			if (Math.abs(augmented[rowIndex][pivotIndex]) > Math.abs(augmented[maxRowIndex][pivotIndex])) {
				maxRowIndex = rowIndex;
			}
		}

		if (Math.abs(augmented[maxRowIndex][pivotIndex]) < Number.EPSILON) {
			throw new Error('GeoRef変換行列を解けませんでした');
		}

		if (maxRowIndex !== pivotIndex) {
			[augmented[pivotIndex], augmented[maxRowIndex]] = [
				augmented[maxRowIndex],
				augmented[pivotIndex]
			];
		}

		const pivot = augmented[pivotIndex][pivotIndex];
		for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
			augmented[pivotIndex][columnIndex] /= pivot;
		}

		for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
			if (rowIndex === pivotIndex) continue;
			const factor = augmented[rowIndex][pivotIndex];
			for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
				augmented[rowIndex][columnIndex] -= factor * augmented[pivotIndex][columnIndex];
			}
		}
	}

	return augmented.map((row) => row[size]);
};

export const createHomography = (
	sourceCorners: GeoRefCorners,
	targetCorners: GeoRefCorners
): HomographyMatrix => {
	const matrix: number[][] = [];
	const values: number[] = [];

	for (let index = 0; index < 4; index += 1) {
		const [sourceX, sourceY] = sourceCorners[index];
		const [targetX, targetY] = targetCorners[index];

		matrix.push([sourceX, sourceY, 1, 0, 0, 0, -sourceX * targetX, -sourceY * targetX]);
		values.push(targetX);
		matrix.push([0, 0, 0, sourceX, sourceY, 1, -sourceX * targetY, -sourceY * targetY]);
		values.push(targetY);
	}

	const [a, b, c, d, e, f, g, h] = solveLinearSystem(matrix, values);
	return { a, b, c, d, e, f, g, h };
};

export const applyHomography = (
	point: [number, number],
	homography: HomographyMatrix
): [number, number] => {
	const [x, y] = point;
	const denominator = homography.g * x + homography.h * y + 1;

	if (Math.abs(denominator) < Number.EPSILON) {
		throw new Error('GeoRef変換で不正な座標が生成されました');
	}

	return [
		(homography.a * x + homography.b * y + homography.c) / denominator,
		(homography.d * x + homography.e * y + homography.f) / denominator
	];
};
