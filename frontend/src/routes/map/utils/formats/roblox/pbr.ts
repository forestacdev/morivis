import type { RobloxImage, RobloxResources } from './resources';
import type { RobloxPart, RobloxVector, RobloxWorld } from './world';

export interface PreparedRobloxMaterial {
	color?: RobloxImage;
	normal?: RobloxImage;
	metallicRoughness?: RobloxImage;
	colorFactor: RobloxVector;
	metallic: number;
	roughness: number;
	transparent: boolean;
}

/** glTFのG=roughness/B=metallic。データ画像なのでsRGBの線形化を行わない。 */
export const packMetallicRoughness = (
	length: number,
	roughness?: Uint8ClampedArray,
	metalness?: Uint8ClampedArray,
	defaultRoughness = 1,
	defaultMetalness = 0
) => {
	const result = new Uint8ClampedArray(length);
	for (let i = 0; i < length; i += 4) {
		result[i] = 255;
		result[i + 1] = roughness?.[i] ?? Math.round(defaultRoughness * 255);
		result[i + 2] = metalness?.[i] ?? Math.round(defaultMetalness * 255);
		result[i + 3] = 255;
	}
	return result;
};

export const materialForPart = (
	part: RobloxPart,
	resources: RobloxResources
): PreparedRobloxMaterial => {
	const prepared = resources.materials?.get(part);
	if (prepared) return prepared;
	const material = part.material;
	const color = resources.images.get(material ? material.colorMap ?? '' : part.textureId ?? '');
	return {
		color,
		normal: resources.images.get(material?.normalMap ?? ''),
		colorFactor: material?.tint && color ? material.tint : part.color,
		metallic: material?.metallic ?? 0,
		roughness: material?.roughness ?? 1,
		transparent: material
			? material.alphaMode === 'transparency'
			: color?.mimeType === 'image/png'
	};
};

export const prepareRobloxMaterials = async (world: RobloxWorld, resources: RobloxResources) => {
	const decoded = new Map<RobloxImage, ImageBitmap>();
	const packed = new Map<string, RobloxImage>();
	const overlays = new Map<string, RobloxImage>();
	const ids = new Map<RobloxImage, number>();
	const id = (image?: RobloxImage) => {
		if (!image) return -1;
		if (!ids.has(image)) ids.set(image, ids.size);
		return ids.get(image)!;
	};
	const bitmap = async (image: RobloxImage) => {
		let value = decoded.get(image);
		if (!value) {
			value = await createImageBitmap(new Blob([image.bytes], { type: image.mimeType }), {
				colorSpaceConversion: 'none'
			});
			decoded.set(image, value);
		}
		return value;
	};
	const encode = async (canvas: OffscreenCanvas): Promise<RobloxImage> => ({
		bytes: new Uint8Array(
			await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer()
		),
		mimeType: 'image/png'
	});
	resources.materials = new Map();
	try {
		for (const part of world.parts) {
			if (!part.material) continue;
			const material = part.material;
			const prepared = materialForPart(part, resources);
			resources.materials.set(part, prepared);
			const roughness = resources.images.get(material.roughnessMap ?? '');
			const metalness = resources.images.get(material.metalnessMap ?? '');
			if (roughness || metalness) {
				const key = `${id(roughness)}:${
					id(metalness)
				}:${material.roughness}:${material.metallic}`;
				let image = packed.get(key);
				if (!image) {
					const r = roughness ? await bitmap(roughness) : undefined;
					const m = metalness ? await bitmap(metalness) : undefined;
					const w = Math.max(r?.width ?? 1, m?.width ?? 1),
						h = Math.max(r?.height ?? 1, m?.height ?? 1);
					const canvas = new OffscreenCanvas(w, h), context = canvas.getContext('2d')!;
					const read = (source?: ImageBitmap) => {
						if (!source) return undefined;
						context.clearRect(0, 0, w, h);
						context.drawImage(source, 0, 0, w, h);
						return context.getImageData(0, 0, w, h).data;
					};
					context.putImageData(
						new ImageData(
							packMetallicRoughness(
								w * h * 4,
								read(r),
								read(m),
								material.roughness,
								material.metallic
							),
							w,
							h
						),
						0,
						0
					);
					image = await encode(canvas);
					packed.set(key, image);
				}
				prepared.metallicRoughness = image;
				prepared.metallic = 1;
				prepared.roughness = 1;
			}
			if (
				prepared.color
				&& (material.alphaMode === 'overlay' || material.alphaMode === 'tint-mask')
			) {
				const tint = material.tint
					?? (material.alphaMode === 'tint-mask' ? part.color : [1, 1, 1]);
				const key = JSON.stringify([
					id(prepared.color),
					part.color,
					tint,
					material.alphaMode
				]);
				let image = overlays.get(key);
				if (!image) {
					const source = await bitmap(prepared.color);
					const canvas = new OffscreenCanvas(source.width, source.height),
						context = canvas.getContext('2d')!;
					context.drawImage(source, 0, 0);
					const pixels = context.getImageData(0, 0, source.width, source.height);
					for (let i = 0; i < pixels.data.length; i += 4) {
						const alpha = pixels.data[i + 3] / 255;
						for (let c = 0; c < 3; c++) {
							pixels.data[i + c] = material.alphaMode === 'tint-mask'
								? pixels.data[i + c] * (tint[c] * alpha + 1 - alpha)
								: pixels.data[i + c] * tint[c] * alpha
									+ part.color[c] * 255 * (1 - alpha);
						}
						pixels.data[i + 3] = 255;
					}
					context.putImageData(pixels, 0, 0);
					image = await encode(canvas);
					overlays.set(key, image);
				}
				prepared.color = image;
				prepared.colorFactor = [1, 1, 1];
			}
		}
	} finally {
		decoded.forEach(image => image.close());
	}
};
