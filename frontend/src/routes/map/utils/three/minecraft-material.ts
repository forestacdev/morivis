import type { Material } from 'three';

/** MCAのGLB材質に限って、モデル由来の透過・切り抜きをスタイル適用後も保持する。 */
export const minecraftMaterialState = (source: Material, opacity: number) => {
	const enabled = source.userData.morivisMinecraftMaterial === true;
	return {
		enabled,
		sourceOpacity: enabled ? source.opacity : 1,
		alphaTest: enabled ? source.alphaTest : 0,
		transparent: enabled ? source.transparent || opacity < 1 : true,
		depthWrite: enabled ? !source.transparent && opacity >= 1 : true
	};
};
