/**
 * LandXML TIN → DEM ラスタライズ Worker
 *
 * TIN（三角形メッシュ）の各三角形を走査し、
 * バリセントリック補間で各ピクセルの標高値を計算する。
 */

interface TinData {
	/** 3D座標 [x, y, z][] */
	points: [number, number, number][];
	/** 三角形頂点インデックス [i, j, k][] (1-based) */
	faces: [number, number, number][];
	/** 出力ラスターの解像度 (ピクセル) */
	resolution: number;
}

interface RasterResult {
	data: Float32Array;
	width: number;
	height: number;
	bbox: [number, number, number, number]; // [minX, minY, maxX, maxY]
}

/**
 * バリセントリック座標を計算
 * 点(px,py)が三角形(x0,y0)-(x1,y1)-(x2,y2)内にあるかと、補間の重みを返す
 */
const barycentric = (
	px: number,
	py: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
): [number, number, number] | null => {
	const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
	if (Math.abs(denom) < 1e-12) return null;

	const w0 = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / denom;
	const w1 = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / denom;
	const w2 = 1 - w0 - w1;

	if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) return null;
	return [w0, w1, w2];
};

self.onmessage = (e: MessageEvent<TinData>) => {
	const { points, faces, resolution } = e.data;

	// bboxを計算
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;

	for (const [x, y] of points) {
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}

	// ラスターサイズの計算（アスペクト比を維持）
	const rangeX = maxX - minX;
	const rangeY = maxY - minY;

	let width: number, height: number;
	if (rangeX >= rangeY) {
		width = resolution;
		height = Math.max(1, Math.round(resolution * (rangeY / rangeX)));
	} else {
		height = resolution;
		width = Math.max(1, Math.round(resolution * (rangeX / rangeY)));
	}

	const cellW = rangeX / width;
	const cellH = rangeY / height;

	// nodata = -9999
	const data = new Float32Array(width * height).fill(-9999);

	// 各三角形をラスタライズ
	for (const [fi, fj, fk] of faces) {
		// 1-based → 0-based
		const p0 = points[fi - 1];
		const p1 = points[fj - 1];
		const p2 = points[fk - 1];

		if (!p0 || !p1 || !p2) continue;

		const [x0, y0, z0] = p0;
		const [x1, y1, z1] = p1;
		const [x2, y2, z2] = p2;

		// 三角形のbboxをピクセル範囲に変換
		const triMinX = Math.min(x0, x1, x2);
		const triMaxX = Math.max(x0, x1, x2);
		const triMinY = Math.min(y0, y1, y2);
		const triMaxY = Math.max(y0, y1, y2);

		const colStart = Math.max(0, Math.floor((triMinX - minX) / cellW));
		const colEnd = Math.min(width - 1, Math.ceil((triMaxX - minX) / cellW));
		const rowStart = Math.max(0, Math.floor((triMinY - minY) / cellH));
		const rowEnd = Math.min(height - 1, Math.ceil((triMaxY - minY) / cellH));

		for (let row = rowStart; row <= rowEnd; row++) {
			for (let col = colStart; col <= colEnd; col++) {
				const px = minX + (col + 0.5) * cellW;
				const py = minY + (row + 0.5) * cellH;

				const weights = barycentric(px, py, x0, y0, x1, y1, x2, y2);
				if (!weights) continue;

				const [w0, w1, w2] = weights;
				const z = w0 * z0 + w1 * z1 + w2 * z2;

				// ラスターは上から下（row 0 = maxY側）
				const rasterRow = height - 1 - row;
				data[rasterRow * width + col] = z;
			}
		}
	}

	const result: RasterResult = {
		data,
		width,
		height,
		bbox: [minX, minY, maxX, maxY]
	};

	self.postMessage(result, { transfer: [result.data.buffer] });
};
