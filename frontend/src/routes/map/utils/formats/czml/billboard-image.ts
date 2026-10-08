import type { FeatureProp } from '$routes/map/types/properties';
import { czmlBillboardLimits } from './definition';

/** Cesiumの画面座標: xは右、yは下。回転は反時計回り、原点の移動は回転しない。 */
export const czmlBillboardLayout = (
	properties: FeatureProp,
	imageWidth: number,
	imageHeight: number
) => {
	const scale = Number(properties.billboard_scale);
	const width = Number(properties.billboard_width ?? imageWidth) * scale;
	const height = Number(properties.billboard_height ?? imageHeight) * scale;
	const rotation = -Number(properties.billboard_rotation);
	const x = Number(properties.billboard_offset_x)
		+ Number(properties.billboard_origin_x) * width / 2;
	const vertical = Number(properties.billboard_origin_y);
	const y = Number(properties.billboard_offset_y) - (vertical === 2 ? 1 : vertical) * height / 2;
	const extentX = Math.abs(Math.cos(rotation)) * width / 2
		+ Math.abs(Math.sin(rotation)) * height / 2;
	const extentY = Math.abs(Math.sin(rotation)) * width / 2
		+ Math.abs(Math.cos(rotation)) * height / 2;
	// 中心を位置座標に合わせた透明余白を持たせ、アイコン描画側で同じ原点を使う。
	const canvasWidth = Math.max(1, Math.ceil((Math.abs(x) + extentX) * 2));
	const canvasHeight = Math.max(1, Math.ceil((Math.abs(y) + extentY) * 2));
	if (
		![width, height, rotation, x, y, canvasWidth, canvasHeight].every(Number.isFinite)
		|| width <= 0 || height <= 0
		|| canvasWidth > czmlBillboardLimits.maxDimension
		|| canvasHeight > czmlBillboardLimits.maxDimension
	) {
		throw new Error(
			'CZML画像マーカーは回転・オフセットを含めて2048×2048ピクセル以下にしてください'
		);
	}
	return { width, height, rotation, x, y, canvasWidth, canvasHeight };
};

export const renderCzmlBillboard = async (
	image: ImageBitmap,
	properties: FeatureProp,
	layout: ReturnType<typeof czmlBillboardLayout>
): Promise<string> => {
	const canvas = new OffscreenCanvas(layout.canvasWidth, layout.canvasHeight);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('CZML画像マーカーの描画を開始できません');
	context.translate(canvas.width / 2 + layout.x, canvas.height / 2 + layout.y);
	context.rotate(layout.rotation);
	context.drawImage(image, -layout.width / 2, -layout.height / 2, layout.width, layout.height);
	const color = ['red', 'green', 'blue', 'alpha'].map(key =>
		Number(properties[`billboard_${key}`])
	);
	if (color.some(value => value !== 1)) {
		const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
		for (let i = 0; i < pixels.data.length; i++) pixels.data[i] *= color[i % 4];
		context.putImageData(pixels, 0, 0);
	}
	const bytes = new Uint8Array(
		await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer()
	);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 8192) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
	}
	return `data:image/png;base64,${btoa(binary)}`;
};
