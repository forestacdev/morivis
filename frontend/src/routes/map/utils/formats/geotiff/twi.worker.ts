export {};

const workerScope = self as unknown as {
	onmessage: ((event: MessageEvent<TWIWorkerMessage>) => void) | null;
	postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

// SAGA の one-step TWI と同じ考え方で、
// 傾斜角 β と上流集水量 a から ln(a / tanβ) を求める。
// ここではブラウザ内で扱いやすい D8 ベースの近似実装にしている。
const NEIGHBOR_OFFSETS = [
	{ dx: -1, dy: -1, distance: Math.SQRT2 },
	{ dx: 0, dy: -1, distance: 1 },
	{ dx: 1, dy: -1, distance: Math.SQRT2 },
	{ dx: -1, dy: 0, distance: 1 },
	{ dx: 1, dy: 0, distance: 1 },
	{ dx: -1, dy: 1, distance: Math.SQRT2 },
	{ dx: 0, dy: 1, distance: 1 },
	{ dx: 1, dy: 1, distance: Math.SQRT2 }
] as const;

const MIN_TAN_BETA = 1e-3;

interface TWIWorkerMessage {
	band: Float32Array;
	width: number;
	height: number;
	nodata: number | null;
}

const isValidValue = (value: number, nodata: number | null): boolean => {
	if (!Number.isFinite(value)) return false;
	if (nodata === null) return true;
	if (Number.isNaN(nodata)) return !Number.isNaN(value);
	return value !== nodata;
};

const getIndex = (x: number, y: number, width: number): number => {
	return y * width + x;
};

const getSafeValue = (
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

const computeSlopeRadians = (
	band: Float32Array,
	x: number,
	y: number,
	width: number,
	height: number,
	nodata: number | null
): number => {
	const center = band[getIndex(x, y, width)];
	const z1 = getSafeValue(band, x - 1, y - 1, width, height, nodata, center);
	const z2 = getSafeValue(band, x, y - 1, width, height, nodata, center);
	const z3 = getSafeValue(band, x + 1, y - 1, width, height, nodata, center);
	const z4 = getSafeValue(band, x - 1, y, width, height, nodata, center);
	const z6 = getSafeValue(band, x + 1, y, width, height, nodata, center);
	const z7 = getSafeValue(band, x - 1, y + 1, width, height, nodata, center);
	const z8 = getSafeValue(band, x, y + 1, width, height, nodata, center);
	const z9 = getSafeValue(band, x + 1, y + 1, width, height, nodata, center);

	const dzdx = (z3 + 2 * z6 + z9 - (z1 + 2 * z4 + z7)) / 8;
	const dzdy = (z7 + 2 * z8 + z9 - (z1 + 2 * z2 + z3)) / 8;

	return Math.atan(Math.hypot(dzdx, dzdy));
};

const computeTwi = (
	band: Float32Array,
	width: number,
	height: number,
	nodata: number | null
): { band: Float32Array; min: number; max: number; } => {
	const pixelCount = width * height;
	const valid = new Uint8Array(pixelCount);
	const slopes = new Float32Array(pixelCount);
	const receivers = new Int32Array(pixelCount).fill(-1);
	const indegrees = new Uint32Array(pixelCount);
	const accumulations = new Float32Array(pixelCount);
	const result = new Float32Array(pixelCount).fill(NaN);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = getIndex(x, y, width);
			const elevation = band[index];
			if (!isValidValue(elevation, nodata)) continue;

			valid[index] = 1;
			accumulations[index] = 1;
			slopes[index] = computeSlopeRadians(band, x, y, width, height, nodata);

			let bestReceiver = -1;
			let bestGradient = 0;

			for (const neighbor of NEIGHBOR_OFFSETS) {
				const nx = x + neighbor.dx;
				const ny = y + neighbor.dy;
				if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

				const neighborIndex = getIndex(nx, ny, width);
				const neighborElevation = band[neighborIndex];
				if (!isValidValue(neighborElevation, nodata) || neighborElevation >= elevation) {
					continue;
				}

				const gradient = (elevation - neighborElevation) / neighbor.distance;
				if (gradient > bestGradient) {
					bestGradient = gradient;
					bestReceiver = neighborIndex;
				}
			}

			receivers[index] = bestReceiver;
			if (bestReceiver >= 0) {
				indegrees[bestReceiver] += 1;
			}
		}
	}

	const queue = new Uint32Array(pixelCount);
	let queueStart = 0;
	let queueEnd = 0;

	for (let index = 0; index < pixelCount; index++) {
		if (valid[index] === 1 && indegrees[index] === 0) {
			queue[queueEnd++] = index;
		}
	}

	while (queueStart < queueEnd) {
		const index = queue[queueStart++];
		const receiver = receivers[index];
		if (receiver < 0) continue;

		accumulations[receiver] += accumulations[index];
		indegrees[receiver] -= 1;
		if (indegrees[receiver] === 0) {
			queue[queueEnd++] = receiver;
		}
	}

	let min = Infinity;
	let max = -Infinity;

	for (let index = 0; index < pixelCount; index++) {
		if (valid[index] !== 1) continue;

		const sca = Math.max(accumulations[index], 1e-6);
		const tanBeta = Math.max(Math.tan(slopes[index]), MIN_TAN_BETA);
		const twi = Math.log(sca / tanBeta);

		result[index] = twi;
		if (twi < min) min = twi;
		if (twi > max) max = twi;
	}

	if (!Number.isFinite(min) || !Number.isFinite(max)) {
		min = 0;
		max = 1;
	}

	return { band: result, min, max };
};

workerScope.onmessage = (event: MessageEvent<TWIWorkerMessage>) => {
	try {
		const { band, width, height, nodata } = event.data;
		const result = computeTwi(band, width, height, nodata);

		workerScope.postMessage(
			{
				band: result.band,
				min: result.min,
				max: result.max
			},
			[result.band.buffer as ArrayBuffer]
		);
	} catch (error) {
		workerScope.postMessage({
			error: error instanceof Error ? error.message : String(error)
		});
	}
};
