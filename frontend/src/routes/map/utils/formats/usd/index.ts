import { TextureLoader } from 'three';
import type * as THREE from 'three';
import { unzipSync } from 'three/addons/libs/fflate.module.js';

interface TinyUsdScene {
	getDefaultRootNode: () => unknown;
	getTexture?: (textureId: number) => { textureImageId: number; } | undefined;
	getImage?: (imageId: number) => { uri?: string; } | undefined;
	delete?: () => void;
}

interface TinyUsdLoader {
	native_: unknown;
	parse: (
		binary: Uint8Array,
		filePath: string,
		onLoad: (scene: unknown) => void,
		onError?: (error: unknown) => void
	) => void;
}

interface TinyUsdLoaderUtils {
	createDefaultMaterial: () => THREE.Material;
	getTextureFromUSD: (...args: unknown[]) => Promise<THREE.Texture>;
	buildThreeNode: (
		rootNode: unknown,
		defaultMaterial: THREE.Material,
		scene: unknown,
		options: { overrideMaterial: boolean; }
	) => THREE.Object3D;
}

interface TinyUsdModules {
	TinyUSDZLoader: new() => TinyUsdLoader;
	TinyUSDZLoaderUtils: TinyUsdLoaderUtils;
	initTinyUsdNative: (options: { wasmBinary: Uint8Array; }) => Promise<unknown>;
	wasmUrl: string;
}

interface UsdParseOptions {
	loadMaterials?: boolean;
}

let tinyUsdModulesPromise: Promise<TinyUsdModules> | null = null;
let tinyUsdWasmBinaryPromise: Promise<Uint8Array> | null = null;
let tinyUsdBuildQueue: Promise<void> = Promise.resolve();

const IMAGE_MIME_TYPES: Record<string, string> = {
	bmp: 'image/bmp',
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp'
};

const loadTinyUsdModules = (): Promise<TinyUsdModules> => {
	if (tinyUsdModulesPromise) return tinyUsdModulesPromise;

	const modules = Promise.all([
		import('tinyusdz/TinyUSDZLoader.js'),
		import('tinyusdz/TinyUSDZLoaderUtils.js'),
		import('tinyusdz/tinyusdz.js'),
		import('tinyusdz/tinyusdz.wasm?url')
	]).then(([loaderModule, utilsModule, nativeModule, wasmModule]) => ({
		TinyUSDZLoader: loaderModule.TinyUSDZLoader,
		TinyUSDZLoaderUtils: utilsModule.TinyUSDZLoaderUtils,
		initTinyUsdNative: nativeModule.default,
		wasmUrl: wasmModule.default
	}));
	tinyUsdModulesPromise = modules;
	return modules;
};

const loadTinyUsdWasmBinary = async () => {
	if (!tinyUsdWasmBinaryPromise) {
		tinyUsdWasmBinaryPromise = loadTinyUsdModules().then(async ({ wasmUrl }) => {
			const response = await fetch(wasmUrl);
			if (!response.ok) {
				throw new Error(`TinyUSDZ WASMを取得できません: ${response.status}`);
			}
			return new Uint8Array(await response.arrayBuffer());
		});
	}
	return tinyUsdWasmBinaryPromise;
};

const getTinyUsdScene = async (buffer: ArrayBuffer, sourceName: string) => {
	const { TinyUSDZLoader, initTinyUsdNative } = await loadTinyUsdModules();
	const loader = new TinyUSDZLoader();
	// ライブラリ既定の相対パス探索ではなく、Vite が出力した WASM を明示して本番の base path に追従させる。
	loader.native_ = await initTinyUsdNative({
		wasmBinary: await loadTinyUsdWasmBinary()
	});

	return new Promise<TinyUsdScene>((resolve, reject) => {
		loader.parse(
			new Uint8Array(buffer),
			sourceName,
			(scene) => resolve(scene as TinyUsdScene),
			(error) => reject(error instanceof Error ? error : new Error(String(error)))
		);
	});
};

const enqueueTinyUsdBuild = <T>(build: () => Promise<T>) => {
	const task = tinyUsdBuildQueue.then(build);
	tinyUsdBuildQueue = task.then(
		() => undefined,
		() => undefined
	);
	return task;
};

const applyLocalMatrices = (object: THREE.Object3D) => {
	object.traverse((child) => {
		if (!child.matrixAutoUpdate) return;
		child.matrix.decompose(child.position, child.quaternion, child.scale);
	});
	return object;
};

const normalizeArchivePath = (path: string) =>
	decodeURIComponent(path)
		.replaceAll('\\', '/')
		.replace(/^\.\//, '')
		.toLowerCase();

const getUsdzAssets = (buffer: ArrayBuffer) => {
	const bytes = new Uint8Array(buffer);
	if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return new Map<string, Uint8Array>();

	return new Map(
		Object.entries(unzipSync(bytes)).map(([path, asset]) => [normalizeArchivePath(path), asset])
	);
};

const getImageMimeType = (uri: string) => {
	const extension = uri.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();
	return extension
		? IMAGE_MIME_TYPES[extension] ?? 'application/octet-stream'
		: 'application/octet-stream';
};

const createUsdzTextureResolver = (assets: Map<string, Uint8Array>) => {
	const textureCache = new Map<string, Promise<THREE.Texture>>();

	return (scene: unknown, textureId: unknown): Promise<THREE.Texture> | null => {
		if (
			!(scene instanceof Object)
			|| typeof textureId !== 'number'
			|| !('getTexture' in scene)
			|| !('getImage' in scene)
			|| typeof scene.getTexture !== 'function'
			|| typeof scene.getImage !== 'function'
		) {
			return null;
		}

		const usdScene = scene as TinyUsdScene;
		const imageId = usdScene.getTexture(textureId)?.textureImageId;
		const uri = imageId === undefined ? undefined : usdScene.getImage(imageId)?.uri;
		if (!uri) return null;

		const asset = assets.get(normalizeArchivePath(uri));
		if (!asset) return null;

		const cacheKey = normalizeArchivePath(uri);
		if (!textureCache.has(cacheKey)) {
			const blobUrl = URL.createObjectURL(new Blob([asset], { type: getImageMimeType(uri) }));
			const texture = new TextureLoader().loadAsync(blobUrl).finally(() =>
				URL.revokeObjectURL(blobUrl)
			);
			textureCache.set(cacheKey, texture);
		}
		return textureCache.get(cacheKey) ?? null;
	};
};

const buildThreeObject = async (
	scene: TinyUsdScene,
	options: UsdParseOptions,
	assets: Map<string, Uint8Array>
) => {
	const { TinyUSDZLoaderUtils } = await loadTinyUsdModules();
	const rootNode = scene.getDefaultRootNode();
	if (!rootNode) {
		throw new Error('USDのルートノードが見つかりません。');
	}
	const loadMaterials = options.loadMaterials ?? true;

	if (!loadMaterials) {
		// Worker の範囲解析に ImageLoader は使えないため、形状だけを生成する。
		return applyLocalMatrices(
			TinyUSDZLoaderUtils.buildThreeNode(
				rootNode,
				TinyUSDZLoaderUtils.createDefaultMaterial(),
				scene,
				{ overrideMaterial: true }
			)
		);
	}

	return enqueueTinyUsdBuild(async () => {
		const loadTexture = TinyUSDZLoaderUtils.getTextureFromUSD;
		const textureLoads: Promise<unknown>[] = [];
		const resolveUsdzTexture = createUsdzTextureResolver(assets);

		// USDZ内の相対パスはブラウザURLではなく、アーカイブから直接読み込む。
		TinyUSDZLoaderUtils.getTextureFromUSD = (...args: unknown[]) => {
			const load = resolveUsdzTexture(args[0], args[1])
				?? loadTexture.apply(TinyUSDZLoaderUtils, args);
			textureLoads.push(load.catch(() => undefined));
			return load;
		};

		try {
			const object = TinyUSDZLoaderUtils.buildThreeNode(
				rootNode,
				TinyUSDZLoaderUtils.createDefaultMaterial(),
				scene,
				{ overrideMaterial: false }
			);
			await Promise.all(textureLoads);
			return applyLocalMatrices(object);
		} finally {
			TinyUSDZLoaderUtils.getTextureFromUSD = loadTexture;
		}
	});
};

/** USDC、USDA、USDZ を TinyUSDZ の WASM パーサーで Three.js の Object3D に変換する。 */
export const parseUsdArrayBuffer = async (
	buffer: ArrayBuffer,
	sourceName = 'scene.usd',
	options: UsdParseOptions = {}
): Promise<THREE.Object3D> => {
	const scene = await getTinyUsdScene(buffer, sourceName);
	try {
		return await buildThreeObject(scene, options, getUsdzAssets(buffer));
	} finally {
		scene.delete?.();
	}
};

export const parseUsdFile = async (file: File) =>
	parseUsdArrayBuffer(await file.arrayBuffer(), file.name, { loadMaterials: false });
