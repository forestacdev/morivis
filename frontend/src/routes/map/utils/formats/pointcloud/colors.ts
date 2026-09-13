/** Normalize loaders.gl RGB/RGBA attributes to the entry model's packed 8-bit RGB. */
export const normalizePointCloudColors = (
	values: ArrayLike<number>,
	components: number
): Uint8Array => {
	if ((components !== 3 && components !== 4) || values.length % components !== 0) {
		throw new Error('点群の色は RGB または RGBA で指定してください');
	}
	if (values instanceof Uint8Array && components === 3) return values;
	const scale = values instanceof Float32Array || values instanceof Float64Array
		? 255
		: values instanceof Uint16Array
		? 255 / 65535
		: 1;
	const rgb = new Uint8Array(values.length / components * 3);
	for (let point = 0; point < values.length / components; point++) {
		for (let channel = 0; channel < 3; channel++) {
			rgb[point * 3 + channel] = Math.round(
				Math.min(255, Math.max(0, values[point * components + channel] * scale))
			);
		}
	}
	return rgb;
};
