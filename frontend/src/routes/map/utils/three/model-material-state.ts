import type { Material } from 'three';

/** MCAとFBXの復元材質は、モデル由来の透過・切り抜きをスタイル適用後も保持する。 */
export const modelMaterialState = (source: Material, opacity: number) => {
	const enabled = source.userData.morivisMinecraftMaterial === true
		|| source.userData.morivisFbxPackageMaterial === true;
	return {
		enabled,
		sourceOpacity: enabled ? source.opacity : 1,
		alphaTest: enabled ? source.alphaTest : 0,
		transparent: enabled ? source.transparent || opacity < 1 : true,
		depthWrite: enabled ? !source.transparent && opacity >= 1 : true
	};
};
