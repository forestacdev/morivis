export {};

const workerScope = self as unknown as {
	onmessage: ((event: MessageEvent<TerrainDerivativeWorkerMessage>) => void) | null;
	postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

interface TerrainDerivativeWorkerMessage {
	band: Float32Array;
	width: number;
	height: number;
	nodata: number | null;
	ewres: number;
	nsres: number;
}

interface DerivedBandResult {
	band: Float32Array;
	min: number;
	max: number;
}

const INVALID_VALUE = NaN;

const isValidValue = (value: number, nodata: number | null): boolean => {
	if (!Number.isFinite(value)) return false;
	if (nodata === null) return true;
	if (Number.isNaN(nodata)) return !Number.isNaN(value);
	return value !== nodata;
};

const getIndex = (x: number, y: number, width: number): number => y * width + x;

const getValueOrFallback = (
	band: Float32Array,
	x: number,
	y: number,
	width: number,
	height: number,
	nodata: number | null,
	fallback: number
): number => {
	if (x < 0 || x >= width || y < 0 || y >= height) return fallback;
	const value = band[getIndex(x, y, width)];
	return isValidValue(value, nodata) ? value : fallback;
};

const sample3x3 = (
	band: Float32Array,
	x: number,
	y: number,
	width: number,
	height: number,
	nodata: number | null
): number[][] | null => {
	const center = band[getIndex(x, y, width)];
	if (!isValidValue(center, nodata)) return null;

	return [
		[
			getValueOrFallback(band, x - 1, y - 1, width, height, nodata, center),
			getValueOrFallback(band, x, y - 1, width, height, nodata, center),
			getValueOrFallback(band, x + 1, y - 1, width, height, nodata, center)
		],
		[
			getValueOrFallback(band, x - 1, y, width, height, nodata, center),
			center,
			getValueOrFallback(band, x + 1, y, width, height, nodata, center)
		],
		[
			getValueOrFallback(band, x - 1, y + 1, width, height, nodata, center),
			getValueOrFallback(band, x, y + 1, width, height, nodata, center),
			getValueOrFallback(band, x + 1, y + 1, width, height, nodata, center)
		]
	];
};

const computeHornDx = (h: number[][], ewres: number): number => {
	return ((h[0][0] + 2 * h[1][0] + h[2][0]) - (h[0][2] + 2 * h[1][2] + h[2][2])) / (8 * ewres);
};

const computeHornDy = (h: number[][], nsres: number): number => {
	return ((h[2][0] + 2 * h[2][1] + h[2][2]) - (h[0][0] + 2 * h[0][1] + h[0][2])) / (8 * nsres);
};

const computeSlope = (h: number[][], ewres: number, nsres: number): number => {
	const dx = computeHornDx(h, ewres);
	const dy = computeHornDy(h, nsres);
	return (Math.atan(Math.sqrt(dx * dx + dy * dy)) * 180) / Math.PI;
};

const computeAspect = (h: number[][], ewres: number, nsres: number): number => {
	const dx = computeHornDx(h, ewres);
	const dy = computeHornDy(h, nsres);
	let aspect = (Math.atan2(dy, dx) * 180) / Math.PI;
	if (aspect < 0) aspect += 360;
	aspect = 90 - aspect;
	if (aspect < 0) aspect += 360;
	return aspect;
};

const computeTpi = (
	band: Float32Array,
	x: number,
	y: number,
	width: number,
	height: number,
	nodata: number | null
): number => {
	const center = band[getIndex(x, y, width)];
	if (!isValidValue(center, nodata)) return INVALID_VALUE;

	let sum = 0;
	let count = 0;

	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -1; dx <= 1; dx++) {
			if (dx === 0 && dy === 0) continue;
			const value = getValueOrFallback(band, x + dx, y + dy, width, height, nodata, center);
			if (!Number.isFinite(value)) continue;
			sum += value;
			count += 1;
		}
	}

	if (count === 0) return INVALID_VALUE;

	return center - sum / count;
};

const computeMinMax = (band: Float32Array): { min: number; max: number } => {
	let min = Infinity;
	let max = -Infinity;

	for (const value of band) {
		if (!Number.isFinite(value)) continue;
		if (value < min) min = value;
		if (value > max) max = value;
	}

	if (!Number.isFinite(min) || !Number.isFinite(max)) {
		return { min: 0, max: 1 };
	}

	return { min, max };
};

const computeTerrainDerivatives = (
	band: Float32Array,
	width: number,
	height: number,
	nodata: number | null,
	ewres: number,
	nsres: number
): {
	slope: DerivedBandResult;
	aspect: DerivedBandResult;
	tpi: DerivedBandResult;
} => {
	const pixelCount = width * height;
	const slopeBand = new Float32Array(pixelCount).fill(INVALID_VALUE);
	const aspectBand = new Float32Array(pixelCount).fill(INVALID_VALUE);
	const tpiBand = new Float32Array(pixelCount).fill(INVALID_VALUE);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const sample = sample3x3(band, x, y, width, height, nodata);
			if (!sample) continue;

			const index = getIndex(x, y, width);
			slopeBand[index] = computeSlope(sample, ewres, nsres);
			aspectBand[index] = computeAspect(sample, ewres, nsres);
			tpiBand[index] = computeTpi(band, x, y, width, height, nodata);
		}
	}

	return {
		slope: { band: slopeBand, ...computeMinMax(slopeBand) },
		aspect: { band: aspectBand, ...computeMinMax(aspectBand) },
		tpi: { band: tpiBand, ...computeMinMax(tpiBand) }
	};
};

workerScope.onmessage = (event: MessageEvent<TerrainDerivativeWorkerMessage>) => {
	try {
		const { band, width, height, nodata, ewres, nsres } = event.data;
		const result = computeTerrainDerivatives(band, width, height, nodata, ewres, nsres);

		workerScope.postMessage(
			{
				slope: result.slope,
				aspect: result.aspect,
				tpi: result.tpi
			},
			[
				result.slope.band.buffer as ArrayBuffer,
				result.aspect.band.buffer as ArrayBuffer,
				result.tpi.band.buffer as ArrayBuffer
			]
		);
	} catch (error) {
		workerScope.postMessage({
			error: error instanceof Error ? error.message : String(error)
		});
	}
};
