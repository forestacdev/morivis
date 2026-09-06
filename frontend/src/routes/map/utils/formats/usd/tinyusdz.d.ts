declare module 'tinyusdz/TinyUSDZLoader.js' {
	export class TinyUSDZLoader {
		native_: unknown;
		parse(
			binary: Uint8Array,
			filePath: string,
			onLoad: (scene: unknown) => void,
			onError?: (error: unknown) => void
		): void;
	}
}

declare module 'tinyusdz/tinyusdz.js' {
	const initTinyUsdNative: (options: { wasmBinary: Uint8Array; }) => Promise<unknown>;
	export default initTinyUsdNative;
}

declare module 'tinyusdz/tinyusdz.wasm?url' {
	const wasmUrl: string;
	export default wasmUrl;
}

declare module 'tinyusdz/TinyUSDZLoaderUtils.js' {
	import type * as THREE from 'three';

	export class TinyUSDZLoaderUtils {
		static createDefaultMaterial(): THREE.Material;
		static getTextureFromUSD(...args: unknown[]): Promise<THREE.Texture>;
		static buildThreeNode(
			rootNode: unknown,
			defaultMaterial: THREE.Material,
			scene: unknown,
			options: { overrideMaterial: boolean; }
		): THREE.Object3D;
	}
}
