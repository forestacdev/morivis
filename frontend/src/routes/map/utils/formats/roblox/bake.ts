import { materialForPart } from './pbr';
import type { RobloxImage, RobloxResources } from './resources';
import type { RobloxTexture, RobloxWorld } from './world';

/** 下地と表面画像を一枚へ合成し、同一平面を重ねる際の深度のちらつきを避ける。 */
export const bakeRobloxSurfaces = async (world: RobloxWorld, resources: RobloxResources) => {
	const decoded = new Map<RobloxImage, ImageBitmap>();
	const baked = new Map<string, RobloxImage>();
	const imageIds = new Map<RobloxImage, number>();
	const bitmap = async (image: RobloxImage) => {
		let result = decoded.get(image);
		if (!result) {
			result = await createImageBitmap(new Blob([image.bytes], { type: image.mimeType }));
			decoded.set(image, result);
		}
		return result;
	};
	const tinted = (image: ImageBitmap, texture: RobloxTexture, opaque = false) => {
		const canvas = new OffscreenCanvas(image.width, image.height);
		const context = canvas.getContext('2d')!;
		context.drawImage(image, 0, 0);
		const pixels = context.getImageData(0, 0, image.width, image.height);
		for (let i = 0; i < pixels.data.length; i += 4) {
			for (let j = 0; j < 3; j++) pixels.data[i + j] *= texture.color[j];
			pixels.data[i + 3] = (opaque ? 255 : pixels.data[i + 3]) * texture.opacity;
		}
		context.putImageData(pixels, 0, 0);
		return canvas;
	};
	try {
		for (const part of world.parts) {
			const faces = new Map<number, RobloxTexture[]>();
			for (const texture of part.textures ?? []) {
				const image = resources.images.get(texture.asset);
				if (!image) continue;
				if (!imageIds.has(image)) imageIds.set(image, imageIds.size);
				const layers = faces.get(texture.face) ?? [];
				layers.push(texture);
				faces.set(texture.face, layers);
			}
			const material = materialForPart(part, resources);
			const hasMaterialBase = !!material.color && !!part.material?.studsPerTile;
			const replacements: RobloxTexture[] = [];
			for (const [face, layers] of faces) {
				layers.sort((a, b) => a.zIndex - b.zIndex);
				if (material.color && part.material?.studsPerTile) {
					const tile = part.material.studsPerTile;
					const asset = `material-base:${resources.images.size}`;
					resources.images.set(asset, material.color);
					if (!imageIds.has(material.color)) imageIds.set(material.color, imageIds.size);
					layers.unshift({
						asset,
						face,
						color: material.colorFactor,
						opacity: 1,
						tile: [tile, tile],
						offset: [0, 0],
						zIndex: 0
					});
				}
				const axes = [[2, 1], [0, 2], [0, 1], [2, 1], [0, 2], [0, 1]][face];
				const width = part.size[axes[0]], height = part.size[axes[1]];
				const key = JSON.stringify([
					part.color,
					hasMaterialBase ? material.transparent : false,
					layers.length > 1 ? [width, height] : null,
					layers.map(
						layer => [
							imageIds.get(resources.images.get(layer.asset)!),
							layer.color,
							layer.opacity,
							layers.length > 1 ? [layer.tile, layer.offset] : null
						]
					)
				]);
				let output = baked.get(key);
				if (!output) {
					const sources: ImageBitmap[] = [];
					for (const layer of layers) {
						sources.push(await bitmap(resources.images.get(layer.asset)!));
					}
					// 単独の繰り返し画像は1タイルだけを合成し、元の解像度とUVを保つ。
					const w = layers.length === 1
						? sources[0].width
						: Math.min(
							4096,
							Math.ceil(
								Math.max(
									...sources.map((source, i) =>
										source.width
										* (layers[i].tile ? width / layers[i].tile![0] : 1)
									)
								)
							)
						);
					const h = layers.length === 1
						? sources[0].height
						: Math.min(
							4096,
							Math.ceil(
								Math.max(...sources.map((source, i) =>
									source.height
									* (layers[i].tile ? height / layers[i].tile![1] : 1)
								))
							)
						);
					const canvas = new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
					const context = canvas.getContext('2d')!;
					context.fillStyle = `rgb(${
						part.color.map(value => Math.round(value * 255)).join(',')
					})`;
					if (!hasMaterialBase || !material.transparent) {
						context.fillRect(0, 0, canvas.width, canvas.height);
					}
					layers.forEach((layer, i) => {
						const source = tinted(
							sources[i],
							layer,
							i === 0 && hasMaterialBase && !material.transparent
						);
						if (layers.length === 1 || !layer.tile) {
							context.drawImage(source, 0, 0, canvas.width, canvas.height);
						} else {
							const sx = layer.tile[0] / width * canvas.width / source.width;
							const sy = layer.tile[1] / height * canvas.height / source.height;
							const x = layer.offset[0] / width * canvas.width,
								y = layer.offset[1] / height * canvas.height;
							context.save();
							context.translate(x, y);
							context.scale(sx, sy);
							context.fillStyle = context.createPattern(source, 'repeat')!;
							context.fillRect(
								-x / sx,
								-y / sy,
								canvas.width / sx,
								canvas.height / sy
							);
							context.restore();
						}
					});
					output = {
						bytes: new Uint8Array(
							await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer()
						),
						mimeType: 'image/png'
					};
					baked.set(key, output);
				}
				const asset = `baked:${baked.size}:${replacements.length}:${resources.images.size}`;
				resources.images.set(asset, output);
				replacements.push({
					...layers[0],
					asset,
					baked: true,
					color: [1, 1, 1],
					opacity: 1,
					...(layers.length > 1
						? { tile: undefined, offset: [0, 0] as [number, number] }
						: {})
				});
			}
			if (part.textures) part.textures = replacements;
		}
	} finally {
		decoded.forEach(image => image.close());
	}
};
