import type { AlphaMode, ResourceTexture, TextureAnimation } from './types';

export const textureAlphaMode = (rgba: Uint8ClampedArray): AlphaMode => {
	let transparent = false;
	for (let i = 3; i < rgba.length; i += 4) {
		if (rgba[i] > 0 && rgba[i] < 255) return 'BLEND';
		if (rgba[i] === 0) transparent = true;
	}
	return transparent ? 'MASK' : 'OPAQUE';
};

/** アニメーション指定がある画像のみ先頭指定フレームを使う。 */
export const decodeResourceTexture = async (
	name: string,
	blob: Blob,
	animation?: TextureAnimation
): Promise<ResourceTexture> => {
	const bitmap = await createImageBitmap(blob);
	try {
		const width = animation
			? animation.width
				?? (animation.height ? bitmap.width : Math.min(bitmap.width, bitmap.height))
			: bitmap.width;
		const height = animation
			? animation.height
				?? (animation.width ? bitmap.height : Math.min(bitmap.width, bitmap.height))
			: bitmap.height;
		const first = animation?.frames?.[0] ?? 0;
		const frame = typeof first === 'number' ? first : first.index;
		if (
			![width, height].every((v) => Number.isSafeInteger(v) && v > 0)
			|| bitmap.width % width !== 0 || bitmap.height % height !== 0
			|| !Number.isSafeInteger(frame) || frame < 0
			|| frame >= (bitmap.width / width) * (bitmap.height / height)
		) throw new Error(`アニメーション画像の寸法が不正です: ${name}`);
		const canvas = new OffscreenCanvas(width, height);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('テクスチャを展開できません');
		const sourceX = (frame % (bitmap.width / width)) * width;
		const sourceY = Math.floor(frame / (bitmap.width / width)) * height;
		context.drawImage(bitmap, sourceX, sourceY, width, height, 0, 0, width, height);
		const alphaMode = textureAlphaMode(context.getImageData(0, 0, width, height).data);
		const png = !animation
			? blob
			: await canvas.convertToBlob({ type: 'image/png' });
		return { name, png: new Uint8Array(await png.arrayBuffer()), alphaMode, width, height };
	} finally {
		bitmap.close();
	}
};
