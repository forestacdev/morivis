import * as THREE from 'three';

const normalize = (value: string) => value.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/g, '');

const removeTrailingNumber = (value: string) => value.replace(/\d+$/, '');

const MATERIAL_ALIASES: Record<string, string[]> = {
	hairshadow: ['hs']
};

export interface FbxTextureFallbackResult {
	mappedMaterialCount: number;
	mappings: Array<{ materialName: string; textureFileName: string }>;
}

export const configureFbxFallbackTexture = (texture: THREE.Texture) => {
	// Blender が出力した FBX の UV 値は、追加画像をそのまま参照する。
	texture.flipY = false;
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.needsUpdate = true;
};

/** FBX 内にテクスチャ接続がない場合だけ、同梱画像名からマテリアル用画像を推定する。 */
export const resolveFbxTextureFile = (materialName: string, textureFiles: string[]) => {
	const material = normalize(materialName);
	const materialBase = removeTrailingNumber(material);
	const aliases = MATERIAL_ALIASES[material] ?? [];
	const candidates = textureFiles
		.map((fileName) => {
			const texture = normalize(fileName);
			const textureBase = removeTrailingNumber(texture);
			let score = 0;
			if (texture === material) score = 1000;
			else if (material.startsWith(texture)) score = 800 + texture.length;
			else if (texture.startsWith(material)) score = 700 + material.length;
			else if (materialBase && texture.includes(materialBase)) score = 500 + materialBase.length;
			if (aliases.includes(texture)) score = Math.max(score, 900 + texture.length);
			return { fileName, score };
		})
		.filter((candidate) => candidate.score > 0)
		.sort((a, b) => b.score - a.score);

	if (candidates.length === 0) return undefined;
	if (candidates.length > 1 && candidates[0].score === candidates[1].score) return undefined;
	return candidates[0].fileName;
};

export const applyFbxTextureFallback = (
	object: THREE.Object3D,
	resourceUrls: Record<string, string> | undefined
): FbxTextureFallbackResult => {
	if (!resourceUrls) return { mappedMaterialCount: 0, mappings: [] };
	const textureFiles = Object.keys(resourceUrls).filter((path) => !path.includes('/'));
	if (textureFiles.length === 0) return { mappedMaterialCount: 0, mappings: [] };

	const textureLoader = new THREE.TextureLoader();
	const textures = new Map<string, THREE.Texture>();
	let mappedMaterialCount = 0;
	const mappings: FbxTextureFallbackResult['mappings'] = [];
	object.traverse((child) => {
		if (!(child as THREE.Mesh).isMesh) return;
		const mesh = child as THREE.Mesh;
		const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
		materials.forEach((material) => {
			if (!('map' in material) || material.map || !material.name) return;
			const fileName = resolveFbxTextureFile(material.name, textureFiles);
			const url = fileName && resourceUrls[fileName];
			if (!fileName || !url) return;
			const texture = textures.get(fileName) ?? textureLoader.load(url);
			configureFbxFallbackTexture(texture);
			textures.set(fileName, texture);
			material.map = texture;
			material.needsUpdate = true;
			mappedMaterialCount += 1;
			mappings.push({ materialName: material.name, textureFileName: fileName });
		});
	});

	return { mappedMaterialCount, mappings };
};
