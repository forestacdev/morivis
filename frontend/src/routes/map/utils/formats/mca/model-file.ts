import type { UploadedModelFile } from '$routes/map/utils/three/model-source-unit';
import { validateMcaFileSet } from './batch';

export const createMcaModelFile = (
	glb: ArrayBuffer,
	sourceFileName: string | string[]
): UploadedModelFile => {
	const names = typeof sourceFileName === 'string' ? [sourceFileName] : sourceFileName;
	const regions = validateMcaFileSet(names.map(name => ({ name })));
	const name = names.length === 1
		? names[0].replace(/\.mca$/i, '.glb')
		: `Minecraft_${names.length}_regions.glb`;
	const file: UploadedModelFile = new File([glb], name, {
		type: 'model/gltf-binary'
	});
	file.morivisModelSourceUnit = 'minecraft-block';
	// 地図上の配置は未確定。専用ジオリファレンスメニューで決定する。
	file.morivisMinecraftRegion = regions[0];
	file.morivisMinecraftRegions = regions;
	return file;
};
