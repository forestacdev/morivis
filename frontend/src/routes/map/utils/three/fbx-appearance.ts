import * as THREE from 'three';
import { type FbxAppearanceData, parseFbxAppearanceData } from './fbx-appearance-data';
import { type FbxPackageImage, readFbxPackage, resolveFbxAssetImage } from './fbx-package';

/** 単一画像を実寸UVで貼る地形だけを正規化し、タイリング用UVは保持する。 */
export const normalizeFbxImageUv = (geometry: THREE.BufferGeometry, aspect: number) => {
	const uv = geometry.getAttribute('uv');
	if (!uv || !uv.count || !Number.isFinite(aspect) || aspect <= 0) return false;
	let uMin = Infinity;
	let uMax = -Infinity;
	let vMin = Infinity;
	let vMax = -Infinity;
	for (let index = 0; index < uv.count; index += 1) {
		uMin = Math.min(uMin, uv.getX(index));
		uMax = Math.max(uMax, uv.getX(index));
		vMin = Math.min(vMin, uv.getY(index));
		vMax = Math.max(vMax, uv.getY(index));
	}
	const uSpan = uMax - uMin;
	const vSpan = vMax - vMin;
	const ratio = uSpan / vSpan;
	if (!Number.isFinite(ratio) || uSpan <= 0 || vSpan <= 0) return false;
	if (
		Math.abs(ratio - aspect) / aspect >= 0.05 && Math.abs(1 / ratio - aspect) / aspect >= 0.05
	) return false;
	if (uMin >= -0.001 && uMax <= 1.001 && vMin >= -0.001 && vMax <= 1.001) return false;
	const next = new Float32Array(uv.count * 2);
	for (let index = 0; index < uv.count; index += 1) {
		next[index * 2] = (uv.getX(index) - uMin) / uSpan;
		next[index * 2 + 1] = (uv.getY(index) - vMin) / vSpan;
	}
	geometry.setAttribute('uv', new THREE.BufferAttribute(next, 2));
	return true;
};

export const applyFbxCurveColors = (root: THREE.Object3D, data: FbxAppearanceData) => {
	const replaced = new Set<THREE.Material>();
	let count = 0;
	root.traverse((child) => {
		const line = child as THREE.Line;
		if (!line.isLine) return;
		const id = (child as THREE.Object3D & { ID?: number; }).ID;
		const rgb = id == null ? undefined : data.colorsByModel.get(String(id));
		if (!rgb) return;
		const materials = Array.isArray(line.material) ? line.material : [line.material];
		const next = materials.map((source) => {
			const material = source.clone() as THREE.LineBasicMaterial;
			material.color = new THREE.Color().setRGB(...rgb, THREE.SRGBColorSpace);
			replaced.add(source);
			return material;
		});
		line.material = Array.isArray(line.material) ? next : next[0];
		count += 1;
	});
	// 他の線やメッシュがまだ共有している材質は解放しない。
	root.traverse((child) => {
		const material = (child as THREE.Mesh).material;
		if (material) {
			(Array.isArray(material) ? material : [material]).forEach((value) =>
				replaced.delete(value)
			);
		}
	});
	replaced.forEach((material) => material.dispose());
	return count;
};

const loadImage = async (blob: Blob) => {
	const url = URL.createObjectURL(blob);
	try {
		return await new THREE.ImageLoader().loadAsync(url);
	} finally {
		URL.revokeObjectURL(url);
	}
};

const createPackageTexture = async (image: FbxPackageImage) => {
	const color = await loadImage(image.blob);
	let source: HTMLImageElement | HTMLCanvasElement = color;
	if (image.cutout) {
		const mask = await loadImage(image.cutout);
		const canvas = document.createElement('canvas');
		canvas.width = color.width;
		canvas.height = color.height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('FBX cutout canvas is unavailable');
		context.drawImage(mask, 0, 0, canvas.width, canvas.height);
		const alpha = context.getImageData(0, 0, canvas.width, canvas.height).data;
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(color, 0, 0);
		const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
		for (let offset = 0; offset < pixels.data.length; offset += 4) {
			pixels.data[offset + 3] = Math.round(pixels.data[offset + 3] * alpha[offset] / 255);
		}
		context.putImageData(pixels, 0, 0);
		source = canvas;
	}
	// HTML画像/Canvasを使い、Three.jsのflipYを有効にする（ImageBitmapでは無効）。
	const texture = new THREE.Texture(source);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	texture.userData.morivisFbxPackageTexture = true;
	texture.needsUpdate = true;
	return texture;
};

export const restoreFbxAppearance = async (root: THREE.Object3D, buffer: ArrayBuffer) => {
	const data = parseFbxAppearanceData(buffer);
	const coloredCurveCount = applyFbxCurveColors(root, data);
	let texturedMeshCount = 0;
	if (!data.assetsByModel.size) return { coloredCurveCount, texturedMeshCount };
	const pkg = await readFbxPackage(buffer);
	const textures = new Map<string, THREE.Texture | null>();
	const meshes: THREE.Mesh[] = [];
	root.traverse((child) => {
		if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
	});
	const replaced = new Set<THREE.Material>();
	const resolved = new Map<string, FbxPackageImage | undefined>();
	const replacedGeometries = new Set<THREE.BufferGeometry>();
	for (const mesh of meshes) {
		const id = (mesh as THREE.Mesh & { ID?: number; }).ID;
		const asset = id == null ? undefined : data.assetsByModel.get(String(id));
		if (!asset || !mesh.geometry.getAttribute('uv')) continue;
		if (!resolved.has(asset)) resolved.set(asset, resolveFbxAssetImage(pkg, asset));
		const image = resolved.get(asset);
		if (!image) continue;
		const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
		if (!materials.some((material) => 'map' in material && !material.map)) continue;
		if (!textures.has(image.id)) {
			textures.set(image.id, await createPackageTexture(image).catch(() => null));
		}
		const texture = textures.get(image.id);
		if (!texture) continue;
		// 同じGeometry/Materialを共有する別モデルへ補正を波及させない。
		const geometry = mesh.geometry.clone();
		if (normalizeFbxImageUv(geometry, texture.image.width / texture.image.height)) {
			replacedGeometries.add(mesh.geometry);
			mesh.geometry = geometry;
		} else {
			geometry.dispose();
		}
		const next = materials.map((source) => {
			if (!('map' in source) || source.map) return source;
			const material = source.clone() as THREE.MeshPhongMaterial;
			material.map = texture;
			material.color.set(0xffffff);
			material.vertexColors = false;
			material.userData.morivisFbxPackageMaterial = true;
			if (image.cutout || image.blob.type === 'image/png') material.alphaTest = 0.5;
			material.needsUpdate = true;
			replaced.add(source);
			return material;
		});
		mesh.material = Array.isArray(mesh.material) ? next : next[0];
		texturedMeshCount += 1;
	}
	root.traverse((child) => {
		replacedGeometries.delete((child as THREE.Mesh).geometry);
		const material = (child as THREE.Mesh).material;
		if (material) {
			(Array.isArray(material) ? material : [material]).forEach((value) =>
				replaced.delete(value)
			);
		}
	});
	replaced.forEach((material) => material.dispose());
	replacedGeometries.forEach((geometry) => geometry.dispose());
	return { coloredCurveCount, texturedMeshCount };
};
