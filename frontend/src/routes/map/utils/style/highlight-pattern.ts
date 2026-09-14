const HIGHLIGHT_FILL_PATTERN_SIZE = 64;
const HIGHLIGHT_FILL_PATTERN_SPACING = 16;
const HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH = 4;
const HIGHLIGHT_LINE_PATTERN_WIDTH = 64;
const HIGHLIGHT_LINE_PATTERN_HEIGHT = 16;
const HIGHLIGHT_LINE_PATTERN_BAND_WIDTH = 18;

const hexToRgb = (hex: string) => {
	const normalized = hex.replace('#', '');
	const value = Number.parseInt(normalized, 16);

	return {
		r: (value >> 16) & 255,
		g: (value >> 8) & 255,
		b: value & 255
	};
};

const setPixel = (
	data: Uint8Array | Uint8ClampedArray,
	index: number,
	color: { r: number; g: number; b: number; },
	alpha: number
) => {
	data[index] = color.r;
	data[index + 1] = color.g;
	data[index + 2] = color.b;
	data[index + 3] = alpha;
};

export const createStaticFillPatternImage = (colorHex: string) => {
	const color = hexToRgb(colorHex);
	const data = new Uint8Array(HIGHLIGHT_FILL_PATTERN_SIZE * HIGHLIGHT_FILL_PATTERN_SIZE * 4);

	for (let y = 0; y < HIGHLIGHT_FILL_PATTERN_SIZE; y += 1) {
		for (let x = 0; x < HIGHLIGHT_FILL_PATTERN_SIZE; x += 1) {
			const targetIndex = (y * HIGHLIGHT_FILL_PATTERN_SIZE + x) * 4;
			const diagonal =
				(((x + y) % HIGHLIGHT_FILL_PATTERN_SPACING) + HIGHLIGHT_FILL_PATTERN_SPACING)
				% HIGHLIGHT_FILL_PATTERN_SPACING;
			const distanceToStripe = Math.min(
				diagonal,
				HIGHLIGHT_FILL_PATTERN_SPACING - diagonal
			);
			const alpha = distanceToStripe <= HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH ? 196 : 88;
			setPixel(data, targetIndex, color, alpha);
		}
	}

	return {
		width: HIGHLIGHT_FILL_PATTERN_SIZE,
		height: HIGHLIGHT_FILL_PATTERN_SIZE,
		data
	};
};

export const createStaticLinePatternImage = (colorHex: string) => {
	const color = hexToRgb(colorHex);
	const data = new Uint8Array(HIGHLIGHT_LINE_PATTERN_WIDTH * HIGHLIGHT_LINE_PATTERN_HEIGHT * 4);
	const bandCenter = 0;

	for (let y = 0; y < HIGHLIGHT_LINE_PATTERN_HEIGHT; y += 1) {
		for (let x = 0; x < HIGHLIGHT_LINE_PATTERN_WIDTH; x += 1) {
			const targetIndex = (y * HIGHLIGHT_LINE_PATTERN_WIDTH + x) * 4;
			const distance = Math.abs(x - bandCenter);
			const wrappedDistance = Math.min(distance, HIGHLIGHT_LINE_PATTERN_WIDTH - distance);
			const alpha = wrappedDistance <= HIGHLIGHT_LINE_PATTERN_BAND_WIDTH
				? Math.max(144, 255 - wrappedDistance * 8)
				: 84;
			setPixel(data, targetIndex, color, alpha);
		}
	}

	return {
		width: HIGHLIGHT_LINE_PATTERN_WIDTH,
		height: HIGHLIGHT_LINE_PATTERN_HEIGHT,
		data
	};
};
