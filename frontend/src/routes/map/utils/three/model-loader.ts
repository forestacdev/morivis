import type { ThreeModelEntry } from '$routes/map/data/types/model';
import { takeGaussianSplatData } from '$routes/map/utils/formats/gaussian-splat/cache';
import { parseGaussianSplatInWorker } from '$routes/map/utils/formats/gaussian-splat/gaussian-splat-parallel';
import { parseUsdArrayBuffer } from '$routes/map/utils/formats/usd';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import {
	applyFbxCurveGeometricTransform,
	parseFbxModelAttributes
} from '$routes/map/utils/three/fbx-attributes';
import { createFbxTextMeshes } from '$routes/map/utils/three/fbx-text';
import { applyFbxTextureFallback } from '$routes/map/utils/three/fbx-textures';
import { createGaussianSplatObject } from '$routes/map/utils/three/gaussian-splat-renderer';
import { configureIfcWasmPath } from '$routes/map/utils/three/ifc-wasm-path';
import type { ModelAttributes } from '$routes/map/utils/three/model-attributes';
import { type LoadedPmxModel, loadPmxModel } from '$routes/map/utils/three/pmx-loader';
import { finalizeRuntimeModelObject } from '$routes/map/utils/three/runtime-model-finalize';
import {
	createVrmLoader,
	getVrmFromGltf,
	rotateVrm0IfNeeded
} from '$routes/map/utils/three/vrm-loader';
import type { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { resolveIfcAttributes } from './ifc-runtime-attributes';
import { isGaussianSplatEntry } from './model-runtime-types';

const DRACO_DECODER_PATH = resolveStaticAssetPath('/draco/gltf/');
const KTX2_TRANSCODER_PATH = resolveStaticAssetPath('/basis/');
const RHINO3DM_LIBRARY_PATH = resolveStaticAssetPath('/rhino3dm/');

let rhino3dmLoaderModulePromise:
	| Promise<
		typeof import('three/addons/loaders/3DMLoader.js')
	>
	| null = null;
let ifcLoaderModulePromise: Promise<typeof import('web-ifc-three/IFCLoader.js')> | null = null;
let webIfcModulePromise: Promise<typeof import('web-ifc')> | null = null;
let tdsLoaderModulePromise: Promise<typeof import('./tds-loader')> | null = null;
let colladaLoaderModulePromise:
	| Promise<
		typeof import('three/addons/loaders/ColladaLoader.js')
	>
	| null = null;
let fbxLoaderModulePromise: Promise<typeof import('three/addons/loaders/FBXLoader.js')> | null =
	null;
let threeMfLoaderModulePromise: Promise<typeof import('three/addons/loaders/3MFLoader.js')> | null =
	null;
let amfLoaderModulePromise: Promise<typeof import('three/addons/loaders/AMFLoader.js')> | null =
	null;
let stlFormatModulePromise: Promise<typeof import('$routes/map/utils/formats/stl')> | null = null;

const isBinaryGltfBuffer = (buffer: ArrayBuffer) => {
	if (buffer.byteLength < 4) return false;
	const magic = new Uint8Array(buffer, 0, 4);
	return magic[0] === 0x67 && magic[1] === 0x6c && magic[2] === 0x54 && magic[3] === 0x46;
};

const resolveResourceUrl = (resourceUrls: Record<string, string>, url: string) => {
	const normalizedUrl = url.replace(/\\/g, '/').toLowerCase();
	const relativeWithoutRoot = normalizedUrl.split('/').slice(1).join('/');
	const fileName = normalizedUrl.split('/').pop() ?? '';
	return (
		resourceUrls[normalizedUrl]
			?? resourceUrls[relativeWithoutRoot]
			?? resourceUrls[fileName]
			?? url
	);
};

const loadRhino3dmLoaderModule = async () => {
	if (!rhino3dmLoaderModulePromise) {
		rhino3dmLoaderModulePromise = import('three/addons/loaders/3DMLoader.js');
	}
	return rhino3dmLoaderModulePromise;
};

const loadIfcLoaderModule = async () => {
	if (!ifcLoaderModulePromise) {
		ifcLoaderModulePromise = import('web-ifc-three/IFCLoader.js');
	}
	return ifcLoaderModulePromise;
};

export const loadWebIfcModule = async () => {
	if (!webIfcModulePromise) {
		webIfcModulePromise = import('web-ifc');
	}
	return webIfcModulePromise;
};

const loadTdsLoaderModule = async () => {
	if (!tdsLoaderModulePromise) {
		tdsLoaderModulePromise = import('./tds-loader');
	}
	return tdsLoaderModulePromise;
};

const loadColladaLoaderModule = async () => {
	if (!colladaLoaderModulePromise) {
		colladaLoaderModulePromise = import('three/addons/loaders/ColladaLoader.js');
	}
	return colladaLoaderModulePromise;
};

const loadFbxLoaderModule = async () => {
	if (!fbxLoaderModulePromise) {
		fbxLoaderModulePromise = import('three/addons/loaders/FBXLoader.js');
	}
	return fbxLoaderModulePromise;
};

const loadThreeMfLoaderModule = async () => {
	if (!threeMfLoaderModulePromise) {
		threeMfLoaderModulePromise = import('three/addons/loaders/3MFLoader.js');
	}
	return threeMfLoaderModulePromise;
};

const loadAmfLoaderModule = async () => {
	if (!amfLoaderModulePromise) {
		amfLoaderModulePromise = import('three/addons/loaders/AMFLoader.js');
	}
	return amfLoaderModulePromise;
};

const loadStlFormatModule = async () => {
	if (!stlFormatModulePromise) {
		stlFormatModulePromise = import('$routes/map/utils/formats/stl');
	}
	return stlFormatModulePromise;
};

export interface LoadedModelAsset {
	object: THREE.Object3D;
	animations: THREE.AnimationClip[];
	resolveAttributes?: (hit: THREE.Intersection<THREE.Object3D>) => Promise<ModelAttributes>;
	mmdModel?: LoadedPmxModel;
	vrm?: VRM;
	lodUrl?: string;
}
export interface ModelLoadOptions {
	lodUrl?: string;
	onResourcesLoaded?: () => void;
}
export class ModelLoader {
	private dracoLoader = new DRACOLoader();
	private ktx2Loader = new KTX2Loader();
	private loader = new GLTFLoader();
	constructor() {
		this.dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
		this.ktx2Loader.setTranscoderPath(KTX2_TRANSCODER_PATH);
		this.loader.setDRACOLoader(this.dracoLoader);
		this.loader.setKTX2Loader(this.ktx2Loader);
	}
	private createGltfLoader = (manager?: THREE.LoadingManager) => {
		const loader = new GLTFLoader(manager);
		loader.setDRACOLoader(this.dracoLoader);
		loader.setKTX2Loader(this.ktx2Loader);
		return loader;
	};
	private loadGltf = (url: string) => {
		return new Promise<{ animations: THREE.AnimationClip[]; scene: THREE.Group; }>(
			(resolve, reject) => {
				this.loader.load(
					url,
					(gltf) => resolve({ animations: gltf.animations, scene: gltf.scene }),
					undefined,
					(error) => reject(error instanceof Error ? error : new Error(String(error)))
				);
			}
		);
	};
	detectSupport = (renderer: THREE.WebGLRenderer) => {
		this.ktx2Loader.detectSupport(renderer);
	};
	dispose = () => {
		this.dracoLoader.dispose();
		this.ktx2Loader.dispose();
	};
	load = (entry: ThreeModelEntry, options: ModelLoadOptions = {}): Promise<LoadedModelAsset> => {
		return new Promise((resolve, reject) => {
			const onModelLoaded = async (
				object: THREE.Object3D,
				animations: THREE.AnimationClip[] = [],
				resolveAttributes?: LoadedModelAsset['resolveAttributes'],
				mmdModel?: LoadedPmxModel,
				vrm?: VRM,
				lodUrl?: string
			) => {
				resolve({ object, animations, resolveAttributes, mmdModel, vrm, lodUrl });
			};
			if (isGaussianSplatEntry(entry)) {
				const cachedData = takeGaussianSplatData(entry.id);
				if (cachedData) {
					void onModelLoaded(createGaussianSplatObject(cachedData, entry.style));
					return;
				}
				fetch(entry.format.url)
					.then(async (response) => {
						if (!response.ok) {
							throw new Error(
								`3D Gaussian Splattingを取得できません: ${response.status} ${response.statusText}`
							);
						}
						return await parseGaussianSplatInWorker(
							await response.arrayBuffer(),
							entry.format.encoding
						);
					})
					.then((data) => onModelLoaded(createGaussianSplatObject(data, entry.style)))
					.catch((error) =>
						reject(error instanceof Error ? error : new Error(String(error)))
					);
				return;
			}

			const finalizeLoadedModel = (object: THREE.Object3D) => {
				finalizeRuntimeModelObject(object, {
					formatType: entry.format.type,
					georeference: entry.format.georeference,
					normalizeToLocalOrigin: entry.format.normalizeToLocalOrigin,
					upAxis: entry.format.upAxis
				});
			};

			const finalizeAndLoadModel = (
				object: THREE.Object3D,
				animations: THREE.AnimationClip[] = [],
				resolveAttributes?: (
					hit: THREE.Intersection<THREE.Object3D>
				) => Promise<ModelAttributes>,
				mmdModel?: LoadedPmxModel,
				vrm?: VRM,
				lodUrl?: string
			) => {
				finalizeLoadedModel(object);
				vrm?.update(0);
				void onModelLoaded(object, animations, resolveAttributes, mmdModel, vrm, lodUrl)
					.catch((
						error
					) => reject(error instanceof Error ? error : new Error(String(error))));
			};

			const createManagedLoaderContext = () => {
				const manager = new THREE.LoadingManager();
				manager.onLoad = () => {
					options.onResourcesLoaded?.();
				};
				return manager;
			};

			if (entry.format.type === 'obj') {
				const manager = createManagedLoaderContext();
				const resourceUrls = entry.format.resourceUrls;
				if (resourceUrls) {
					manager.setURLModifier((url) => {
						const normalizedUrl = url.replace(/\\/g, '/').toLowerCase();
						const relativeWithoutRoot = normalizedUrl.split('/').slice(1).join('/');
						const fileName = normalizedUrl.split('/').pop() ?? '';
						return (
							resourceUrls[normalizedUrl]
								?? resourceUrls[relativeWithoutRoot]
								?? resourceUrls[fileName]
								?? url
						);
					});
				}
				const objLoader = new OBJLoader(manager);
				const loadObj = () => {
					objLoader.load(
						entry.format.url,
						(obj) => finalizeAndLoadModel(obj),
						undefined,
						(error) => reject(error)
					);
				};

				if (entry.format.mtlUrl) {
					const mtlLoader = new MTLLoader(manager);
					mtlLoader.setMaterialOptions({ side: THREE.DoubleSide });
					mtlLoader.setResourcePath('');
					mtlLoader.load(
						entry.format.mtlUrl,
						(materials) => {
							materials.preload();
							objLoader.setMaterials(materials);
							loadObj();
						},
						undefined,
						() => loadObj()
					);
				} else {
					loadObj();
				}
			} else if (entry.format.type === '3ds') {
				const manager = createManagedLoaderContext();
				const resourceUrls = entry.format.resourceUrls;
				if (resourceUrls) {
					manager.setURLModifier((url) => {
						const normalizedUrl = url.replace(/\\/g, '/').toLowerCase();
						const relativeWithoutRoot = normalizedUrl.split('/').slice(1).join('/');
						const fileName = normalizedUrl.split('/').pop() ?? '';
						return (
							resourceUrls[normalizedUrl]
								?? resourceUrls[relativeWithoutRoot]
								?? resourceUrls[fileName]
								?? url
						);
					});
				}
				loadTdsLoaderModule()
					.then(({ TDSLoader }) => {
						const tdsLoader = new TDSLoader(manager);
						if (!resourceUrls) {
							try {
								tdsLoader.setResourcePath(new URL('./', entry.format.url).href);
							} catch {
								// blob URL などは URL 基底を組めないので、そのままロードする。
							}
						}
						tdsLoader.load(
							entry.format.url,
							(object) => finalizeAndLoadModel(object),
							undefined,
							(error) => reject(error)
						);
					})
					.catch((error) => reject(error));
			} else if (entry.format.type === 'dae') {
				const manager = createManagedLoaderContext();
				const resourceUrls = entry.format.resourceUrls;
				if (resourceUrls) {
					manager.setURLModifier((url) => {
						const normalizedUrl = url.replace(/\\/g, '/').toLowerCase();
						const relativeWithoutRoot = normalizedUrl.split('/').slice(1).join('/');
						const fileName = normalizedUrl.split('/').pop() ?? '';
						return (
							resourceUrls[normalizedUrl]
								?? resourceUrls[relativeWithoutRoot]
								?? resourceUrls[fileName]
								?? url
						);
					});
				}
				loadColladaLoaderModule()
					.then(({ ColladaLoader }) => {
						const colladaLoader = new ColladaLoader(manager);
						colladaLoader.load(
							entry.format.url,
							(collada) =>
								finalizeAndLoadModel(collada.scene, collada.scene.animations),
							undefined,
							(error) => reject(error)
						);
					})
					.catch((error) => reject(error));
			} else if (entry.format.type === '3dm') {
				const manager = createManagedLoaderContext();
				const resourceUrls = entry.format.resourceUrls;
				if (resourceUrls) {
					manager.setURLModifier((url) => {
						const normalizedUrl = url.replace(/\\/g, '/').toLowerCase();
						const relativeWithoutRoot = normalizedUrl.split('/').slice(1).join('/');
						const fileName = normalizedUrl.split('/').pop() ?? '';
						return (
							resourceUrls[normalizedUrl]
								?? resourceUrls[relativeWithoutRoot]
								?? resourceUrls[fileName]
								?? url
						);
					});
				}
				loadRhino3dmLoaderModule()
					.then(({ Rhino3dmLoader }) => {
						const rhinoLoader = new Rhino3dmLoader(manager);
						rhinoLoader.setLibraryPath(RHINO3DM_LIBRARY_PATH);
						rhinoLoader.load(
							entry.format.url,
							(object) => finalizeAndLoadModel(object),
							undefined,
							(error) => reject(error)
						);
					})
					.catch((error) => reject(error));
			} else if (entry.format.type === 'vrml') {
				const manager = createManagedLoaderContext();
				void fetch(entry.format.url)
					.then(async (response) => {
						if (!response.ok) {
							throw new Error(`VRMLファイルを取得できません: ${response.status}`);
						}
						const { parseVrmlText } = await import('$routes/map/utils/formats/vrml');
						const resourcePath = /^https?:/i.test(entry.format.url)
							? new URL('./', entry.format.url).href
							: '';
						return parseVrmlText(await response.text(), {
							manager,
							resourceUrls: entry.format.resourceUrls,
							resourcePath: entry.format.resourceUrls ? '' : resourcePath
						});
					})
					.then((object) => finalizeAndLoadModel(object))
					.catch((error) => reject(error));
			} else if (entry.format.type === 'fbx') {
				const manager = createManagedLoaderContext();
				const resourceUrls = entry.format.resourceUrls;
				if (resourceUrls) {
					manager.setURLModifier((url) => {
						const normalizedUrl = url.replace(/\\/g, '/').toLowerCase();
						const relativeWithoutRoot = normalizedUrl.split('/').slice(1).join('/');
						const fileName = normalizedUrl.split('/').pop() ?? '';
						return (
							resourceUrls[normalizedUrl]
								?? resourceUrls[relativeWithoutRoot]
								?? resourceUrls[fileName]
								?? url
						);
					});
				}
				loadFbxLoaderModule()
					.then(async ({ FBXLoader }) => {
						const fbxLoader = new FBXLoader(manager);
						let resourcePath = '';
						if (!resourceUrls) {
							try {
								resourcePath = new URL('./', entry.format.url).href;
							} catch {
								// blob URL などは URL 基底を組めないので、そのまま解析する。
							}
						}

						const response = await fetch(entry.format.url);
						if (!response.ok) {
							throw new Error(
								`Failed to fetch FBX: ${response.status} ${response.statusText}`
							);
						}

						const buffer = await response.arrayBuffer();
						const object = fbxLoader.parse(buffer, resourcePath);
						const fallbackTextureResult = applyFbxTextureFallback(object, resourceUrls);
						const attributesByModelId = parseFbxModelAttributes(buffer);
						const geometricTransformCurveCount = applyFbxCurveGeometricTransform(
							object,
							attributesByModelId
						);
						const generatedTextCount = createFbxTextMeshes(object, attributesByModelId);
						let modelIdCount = 0;
						let matchedAttributeCount = 0;
						object.traverse((child) => {
							const modelId = (child as THREE.Object3D & { ID?: number; }).ID;
							if (modelId == null) return;
							modelIdCount += 1;
							const attributes = attributesByModelId[String(modelId)];
							if (attributes) {
								child.userData.morivisFbxAttributes = attributes;
								matchedAttributeCount += 1;
							}
						});
						if (!import.meta.env.PROD) {
							console.info('[FBX属性] 読み込み結果', {
								attributeModelCount: Object.keys(attributesByModelId).length,
								modelIdCount,
								matchedAttributeCount,
								geometricTransformCurveCount,
								generatedTextCount,
								fallbackTextureMaterialCount:
									fallbackTextureResult.mappedMaterialCount,
								fallbackTextureMappings: fallbackTextureResult.mappings,
								resourceTextureFiles: Object.keys(resourceUrls ?? {}).filter(
									(path) => !path.includes('/')
								)
							});
						}
						finalizeAndLoadModel(
							object,
							(
								object as THREE.Group & {
									animations?: THREE.AnimationClip[];
								}
							).animations ?? []
						);
					})
					.catch((error) => reject(error));
			} else if (entry.format.type === 'gltf') {
				const gltfUrl = options.lodUrl ?? entry.format.url;
				const resourceUrls = entry.format.resourceUrls;
				if (!resourceUrls) {
					this.loader.load(
						gltfUrl,
						(gltf) =>
							finalizeAndLoadModel(
								gltf.scene,
								gltf.animations,
								undefined,
								undefined,
								undefined,
								gltfUrl
							),
						undefined,
						(error) => reject(error)
					);
				} else {
					const manager = createManagedLoaderContext();
					manager.setURLModifier((url) => resolveResourceUrl(resourceUrls, url));
					const loader = this.createGltfLoader(manager);

					fetch(gltfUrl)
						.then(async (response) => {
							if (!response.ok) {
								throw new Error(
									`Failed to fetch glTF: ${response.status} ${response.statusText}`
								);
							}

							const buffer = await response.arrayBuffer();
							const data = isBinaryGltfBuffer(buffer)
								? buffer
								: new TextDecoder().decode(buffer);

							loader.parse(
								data,
								'',
								(gltf) =>
									finalizeAndLoadModel(
										gltf.scene,
										gltf.animations,
										undefined,
										undefined,
										undefined,
										gltfUrl
									),
								(error) =>
									reject(
										error instanceof Error ? error : new Error(String(error))
									)
							);
						})
						.catch((error) => reject(error));
				}
			} else if (entry.format.type === 'vrm') {
				const manager = createManagedLoaderContext();
				createVrmLoader(this.dracoLoader, manager, this.ktx2Loader)
					.then((loader) => {
						loader.load(
							entry.format.url,
							(gltf) => {
								try {
									const vrm = getVrmFromGltf(gltf);
									void rotateVrm0IfNeeded(vrm)
										.then(() =>
											finalizeAndLoadModel(
												vrm.scene,
												gltf.animations,
												undefined,
												undefined,
												vrm
											)
										)
										.catch((error) =>
											reject(
												error instanceof Error
													? error
													: new Error(String(error))
											)
										);
								} catch (error) {
									reject(
										error instanceof Error ? error : new Error(String(error))
									);
								}
							},
							undefined,
							(error) => reject(error)
						);
					})
					.catch((error) => reject(error));
			} else if (entry.format.type === 'drc') {
				this.dracoLoader.load(
					entry.format.url,
					(geometry) => {
						if (!geometry.getAttribute('normal')) {
							geometry.computeVertexNormals();
						}
						finalizeAndLoadModel(
							new THREE.Mesh(
								geometry,
								new THREE.MeshStandardMaterial({ color: '#ffffff' })
							)
						);
					},
					undefined,
					(error) => reject(error)
				);
			} else if (entry.format.type === '3mf') {
				loadThreeMfLoaderModule()
					.then(({ ThreeMFLoader }) => {
						const loader = new ThreeMFLoader();
						loader.load(
							entry.format.url,
							(object) => finalizeAndLoadModel(object),
							undefined,
							(error) => reject(error)
						);
					})
					.catch((error) => reject(error));
			} else if (entry.format.type === 'amf') {
				loadAmfLoaderModule()
					.then(({ AMFLoader }) => {
						const loader = new AMFLoader();
						loader.load(
							entry.format.url,
							(object) => finalizeAndLoadModel(object),
							undefined,
							(error) => reject(error)
						);
					})
					.catch((error) => reject(error));
			} else if (entry.format.type === 'stl') {
				Promise.all([fetch(entry.format.url), loadStlFormatModule()])
					.then(async ([response, { parseStlArrayBuffer }]) => {
						if (!response.ok) {
							throw new Error(
								`STLを取得できません: ${response.status} ${response.statusText}`
							);
						}
						return parseStlArrayBuffer(await response.arrayBuffer());
					})
					.then((object) => finalizeAndLoadModel(object))
					.catch((error) =>
						reject(error instanceof Error ? error : new Error(String(error)))
					);
			} else if (entry.format.type === 'ifc') {
				loadIfcLoaderModule()
					.then(({ IFCLoader }) => {
						const loader = new IFCLoader();
						return configureIfcWasmPath(loader.ifcManager).then(() => {
							loader.load(
								entry.format.url,
								(object) =>
									finalizeAndLoadModel(
										object,
										[],
										(hit) => resolveIfcAttributes(object, hit)
									),
								undefined,
								(error) => reject(error)
							);
						});
					})
					.catch((error) => reject(error));
			} else if (entry.format.type === 'pmx') {
				loadPmxModel(entry.format.url, entry.format.resourceUrls)
					.then((mmdModel) =>
						finalizeAndLoadModel(mmdModel.model.root, [], undefined, mmdModel)
					)
					.catch((error) => reject(error));
			} else if (entry.format.type === 'usd') {
				fetch(entry.format.url)
					.then(async (response) => {
						if (!response.ok) {
							throw new Error(
								`USDを取得できません: ${response.status} ${response.statusText}`
							);
						}
						return parseUsdArrayBuffer(
							await response.arrayBuffer(),
							entry.format.url
						);
					})
					.then((object) => finalizeAndLoadModel(object))
					.catch((error) => reject(error));
			} else {
				reject(new Error(`未対応のモデル形式です: ${entry.format.type}`));
			}
		});
	};
}
