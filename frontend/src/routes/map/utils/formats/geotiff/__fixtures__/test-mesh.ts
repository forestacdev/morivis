import type { Triangle } from '../triangulation';

// 描画時と同じ三角形内の線形補間で、任意の画面位置のソース座標を求める。
export const sampleTestMesh = (triangles: Triangle[], x: number, y: number): [number, number] => {
	for (const { target: [a, b, c], source } of triangles) {
		const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
		const wa = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
		const wb = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
		const wc = 1 - wa - wb;
		if (Math.min(wa, wb, wc) >= -1e-9) {
			return [
				wa * source[0][0] + wb * source[1][0] + wc * source[2][0],
				wa * source[0][1] + wb * source[1][1] + wc * source[2][1]
			];
		}
	}
	throw new Error('Test point is outside the mesh');
};
