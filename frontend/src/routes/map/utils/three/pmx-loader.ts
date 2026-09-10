import type {
	ModelSource,
	TextureMap,
	ThreeMmdLoader,
	ThreeMmdModel
} from '@yohawing/three-mmd-loader/three';
import type * as THREE from 'three';

let pmxLoaderModulePromise: Promise<typeof import('@yohawing/three-mmd-loader/three')> | null =
	null;

const loadPmxLoaderModule = async () => {
	if (!pmxLoaderModulePromise) {
		pmxLoaderModulePromise = import('@yohawing/three-mmd-loader/three');
	}
	return pmxLoaderModulePromise;
};

export interface LoadedPmxModel {
	loader: ThreeMmdLoader;
	model: ThreeMmdModel;
}

/** PMX の輪郭・モーフ分割は表示コストが大きいため、通常のメッシュ表示では生成しない。 */
export const loadPmxModel = async (
	source: ModelSource,
	resourceUrls?: Record<string, string>
): Promise<LoadedPmxModel> => {
	const { ThreeMmdLoader } = await loadPmxLoaderModule();
	const loader = new ThreeMmdLoader({
		...(resourceUrls && { textureMap: resourceUrls as TextureMap })
	});
	const model = await loader.loadModel(source, {
		outline: false,
		materialRenderOrder: false,
		morphSplit: false,
		morphAttributes: false
	});
	return { loader, model };
};

export const loadPmxObject = async (
	source: ModelSource,
	resourceUrls?: Record<string, string>
): Promise<THREE.Group> => (await loadPmxModel(source, resourceUrls)).model.root;
