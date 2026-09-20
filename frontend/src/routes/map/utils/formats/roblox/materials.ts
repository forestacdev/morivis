import { legacyMaterialMaps, materialNames, modernMaterialMaps } from './material-catalog';
import type { RobloxInstance, RobloxVector } from './world';

export interface RobloxMaterial {
	colorMap?: string;
	normalMap?: string;
	roughnessMap?: string;
	metalnessMap?: string;
	/** undefinedはメッシュ固有UV。タイル材質はstud単位。 */
	studsPerTile?: number;
	metallic: number;
	roughness: number;
	unlit?: boolean;
	/** Overlayは画像の透明部分をPart.Colorで埋める。 */
	alphaMode?: 'overlay' | 'transparency' | 'tint-mask' | 'opaque';
	tint?: RobloxVector;
}

const alphaMode = (value: number): RobloxMaterial['alphaMode'] =>
	value === 0 ? 'overlay' : value === 1 ? 'transparency' : value === 2 ? 'tint-mask' : 'opaque';

export const materialMapKeys = ['colorMap', 'normalMap', 'roughnessMap', 'metalnessMap'] as const;

export const createMaterialResolver = (
	roots: RobloxInstance[],
	warn: (message: string) => void
) => {
	const service = roots.find(node => node.className === 'MaterialService');
	const variants = new Map<string, RobloxInstance>();
	const stack = [...(service?.children ?? [])];
	while (stack.length) {
		const node = stack.pop()!;
		stack.push(...node.children);
		if (node.className === 'MaterialVariant' && node.name) {
			variants.set(`${node.material ?? 256}:${node.name}`, node);
		}
	}
	return (part: RobloxInstance): RobloxMaterial | undefined => {
		const surface = part.meshId
			? part.children.find(child => child.className === 'SurfaceAppearance')
			: undefined;
		if (surface) {
			return {
				...Object.fromEntries(materialMapKeys.map(key => [key, surface[key]])),
				metallic: 0,
				roughness: 1,
				alphaMode: alphaMode(surface.alphaMode ?? 0),
				tint: surface.color ?? [1, 1, 1]
			};
		}
		// 従来のMeshPart.TextureIDは固有UVのカラー画像として扱う。
		if (part.meshId && part.textureId) return undefined;
		const token = part.material ?? 256;
		const name = materialNames[token];
		const variantName = part.materialVariant || service?.materialOverrides?.[`${name}Name`];
		const variant = variantName ? variants.get(`${token}:${variantName}`) : undefined;
		if (variant) {
			const tile = variant.studsPerTile ?? 4;
			if (!Number.isFinite(tile) || tile <= 0) {
				warn('不正な材質のStudsPerTile（4で代替）');
			}
			if (variant.materialPattern === 1) warn('Organic材質（通常の繰り返しで代替）');
			return {
				...Object.fromEntries(materialMapKeys.map(key => [key, variant[key]])),
				studsPerTile: Number.isFinite(tile) && tile > 0 ? tile : 4,
				metallic: 0,
				roughness: 1,
				alphaMode: alphaMode(variant.alphaMode ?? 3)
			};
		}
		// Studioは未上書きでもWoodName=Woodなどを保存する。これは欠落ではない。
		if (variantName && (part.materialVariant || variantName !== name)) {
			warn('見つからないMaterialVariant（標準材質で代替）');
		}
		if (part.material === undefined && !variantName) return undefined;
		if (!name) {
			warn('未対応の標準材質（色で代替）');
			return undefined;
		}
		const ids = (service?.use2022Materials === false ? legacyMaterialMaps[name] : undefined)
			?? modernMaterialMaps[name] ?? [];
		const asset = (index: number) => ids[index] ? `rbxassetid://${ids[index]}` : undefined;
		return {
			colorMap: asset(0),
			normalMap: asset(1),
			metalnessMap: asset(2),
			roughnessMap: asset(3),
			// Roblox固有の材質シェーダーは公開画像とglTF PBRで近似する。
			studsPerTile: 8,
			metallic: ['Metal', 'DiamondPlate', 'Foil'].includes(name) ? 1 : 0,
			roughness: name === 'Glass' || name === 'Ice'
				? 0.1
				: name === 'SmoothPlastic'
				? 0.3
				: name === 'Plastic'
				? 0.5
				: 1,
			unlit: name === 'Neon',
			alphaMode: 'opaque'
		};
	};
};
