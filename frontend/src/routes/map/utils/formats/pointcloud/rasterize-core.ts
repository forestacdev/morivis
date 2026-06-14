export interface RasterizePointCloudParams {
	positions: Float32Array;
	bbox: [number, number, number, number];
	longEdgePixels: number;
}

export interface RasterizePointCloudResult {
	band: Float32Array;
	width: number;
	height: number;
	nodata: number;
}

const buildInteriorMask = (
	band: Float32Array,
	width: number,
	height: number,
	nodata: number
): Uint8Array => {
	const mask = new Uint8Array(width * height);

	for (let y = 0; y < height; y++) {
		const rowOffset = y * width;
		let first = -1;
		let last = -1;

		for (let x = 0; x < width; x++) {
			if (band[rowOffset + x] === nodata) continue;
			if (first < 0) first = x;
			last = x;
		}

		if (first < 0 || last < 0) continue;

		for (let x = first; x <= last; x++) {
			mask[rowOffset + x] = 1;
		}
	}

	return mask;
};

const fillMaskedNodataByNearest = (
	band: Float32Array,
	width: number,
	height: number,
	nodata: number,
	mask: Uint8Array
) => {
	const size = width * height;
	let seedX = new Int32Array(size);
	let seedY = new Int32Array(size);
	seedX.fill(-1);
	seedY.fill(-1);

	for (let index = 0; index < size; index++) {
		if (!mask[index] || band[index] === nodata) continue;
		seedX[index] = index % width;
		seedY[index] = Math.floor(index / width);
	}

	let step = 1;
	const maxDimension = Math.max(width, height);
	while (step < maxDimension) step <<= 1;
	step >>= 1;

	const offsets = [-1, 0, 1];

	while (step >= 1) {
		const nextSeedX = new Int32Array(seedX);
		const nextSeedY = new Int32Array(seedY);

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const index = y * width + x;
				if (!mask[index]) continue;

				let bestSeedX = seedX[index];
				let bestSeedY = seedY[index];
				let bestDistance = bestSeedX >= 0
					? (bestSeedX - x) * (bestSeedX - x) + (bestSeedY - y) * (bestSeedY - y)
					: Number.POSITIVE_INFINITY;

				for (const offsetY of offsets) {
					for (const offsetX of offsets) {
						const sampleX = x + offsetX * step;
						const sampleY = y + offsetY * step;

						if (
							sampleX < 0
							|| sampleX >= width
							|| sampleY < 0
							|| sampleY >= height
						) {
							continue;
						}

						const sampleIndex = sampleY * width + sampleX;
						const candidateSeedX = seedX[sampleIndex];
						const candidateSeedY = seedY[sampleIndex];

						if (candidateSeedX < 0 || candidateSeedY < 0) continue;

						const dx = candidateSeedX - x;
						const dy = candidateSeedY - y;
						const distance = dx * dx + dy * dy;

						if (distance < bestDistance) {
							bestDistance = distance;
							bestSeedX = candidateSeedX;
							bestSeedY = candidateSeedY;
						}
					}
				}

				nextSeedX[index] = bestSeedX;
				nextSeedY[index] = bestSeedY;
			}
		}

		seedX = nextSeedX;
		seedY = nextSeedY;
		step >>= 1;
	}

	for (let index = 0; index < size; index++) {
		if (!mask[index] || band[index] !== nodata) continue;

		const nearestX = seedX[index];
		const nearestY = seedY[index];
		if (nearestX < 0 || nearestY < 0) continue;

		band[index] = band[nearestY * width + nearestX];
	}
};

const resolveRasterSize = (
	bbox: [number, number, number, number],
	longEdgePixels: number
): { width: number; height: number } => {
	const spanX = Math.max(Math.abs(bbox[2] - bbox[0]), 1e-9);
	const spanY = Math.max(Math.abs(bbox[3] - bbox[1]), 1e-9);

	if (spanX >= spanY) {
		return {
			width: Math.max(1, Math.round(longEdgePixels)),
			height: Math.max(1, Math.round((longEdgePixels * spanY) / spanX))
		};
	}

	return {
		width: Math.max(1, Math.round((longEdgePixels * spanX) / spanY)),
		height: Math.max(1, Math.round(longEdgePixels))
	};
};

export const rasterizePointCloudToDem = ({
	positions,
	bbox,
	longEdgePixels
}: RasterizePointCloudParams): RasterizePointCloudResult => {
	const { width, height } = resolveRasterSize(bbox, longEdgePixels);
	const nodata = -9999;
	const band = new Float32Array(width * height);
	band.fill(nodata);

	const minX = bbox[0];
	const minY = bbox[1];
	const maxX = bbox[2];
	const maxY = bbox[3];
	const spanX = Math.max(maxX - minX, 1e-9);
	const spanY = Math.max(maxY - minY, 1e-9);

	for (let i = 0; i < positions.length; i += 3) {
		const x = positions[i];
		const y = positions[i + 1];
		const z = positions[i + 2];

		if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

		const normalizedX = (x - minX) / spanX;
		const normalizedY = (maxY - y) / spanY;
		const pixelX = Math.min(width - 1, Math.max(0, Math.floor(normalizedX * width)));
		const pixelY = Math.min(height - 1, Math.max(0, Math.floor(normalizedY * height)));
		const index = pixelY * width + pixelX;
		const current = band[index];

		if (current === nodata || z > current) {
			band[index] = z;
		}
	}

	// TODO: GDAL gdal_grid の invdistnn 風補間に寄せるなら、500万点級でも耐えられるよう
	// spatial hash などの空間インデックス前提で worker 内実装に置き換える。
	// 現状は nearest 系に寄せて、点が落ちなかった内部セルを最近傍値で埋めている。
	const interiorMask = buildInteriorMask(band, width, height, nodata);
	fillMaskedNodataByNearest(band, width, height, nodata, interiorMask);

	return {
		band,
		width,
		height,
		nodata
	};
};
