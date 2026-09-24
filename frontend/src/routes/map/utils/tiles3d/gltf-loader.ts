import {
	GLTFCesiumRTCExtension,
	GLTFMeshFeaturesExtension,
	GLTFStructuralMetadataExtension
} from '3d-tiles-renderer/three/plugins';
import type { LoadingManager } from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTFParser } from 'three/addons/loaders/GLTFLoader.js';
import type { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { fetchTilesetResource } from './fetch-resource';
import { setTilesFeatureDefinitions } from './three-picking';

/** glTF外部リソースもタイル本体と同じローカル解決・プロキシ・gzip補正を通す。 */
export const prepareGltfResources = async (
	json: {
		buffers?: { uri?: string; }[];
		images?: { uri?: string; }[];
		extensions?: Record<string, { schemaUri?: string; }>;
	},
	path: string,
	signal: AbortSignal,
	urls: Set<string>
) => {
	const resources: { owner: { uri?: string; schemaUri?: string; }; key: 'uri' | 'schemaUri'; }[] =
		[
			...(json.buffers ?? []).map((owner) => ({ owner, key: 'uri' as const })),
			...(json.images ?? []).map((owner) => ({ owner, key: 'uri' as const }))
		];
	const metadata = json.extensions?.EXT_structural_metadata;
	if (metadata?.schemaUri) resources.push({ owner: metadata, key: 'schemaUri' });
	const pending = new Map<string, Promise<string>>();
	const results = await Promise.allSettled(resources.map(async ({ owner, key }) => {
		const uri = owner[key];
		if (!uri || /^(data|blob):/i.test(uri)) return;
		const url = new URL(uri, path).href;
		if (!pending.has(url)) {
			pending.set(
				url,
				(async () => {
					const response = await fetchTilesetResource(url, { signal });
					if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
					const blob = await response.blob();
					signal.throwIfAborted();
					const objectUrl = URL.createObjectURL(blob);
					urls.add(objectUrl);
					return objectUrl;
				})()
			);
		}
		owner[key] = await pending.get(url)!;
	}));
	const failure = results.find((result) => result.status === 'rejected');
	if (failure?.status === 'rejected') throw failure.reason;
};

export const createTilesGltfLoader = (
	manager: LoadingManager,
	draco: DRACOLoader,
	ktx: KTX2Loader,
	signal: AbortSignal
) => {
	const handler = new GLTFLoader(manager);
	// 各parseのURL寿命を独立させ、失敗・完了のどちらでもBlob URLを解放する。
	handler.parse = (data, path, onLoad, onError) => {
		const urls = new Set<string>();
		const release = () => {
			urls.forEach((url) => URL.revokeObjectURL(url));
			urls.clear();
		};
		const loader = new GLTFLoader(manager).setDRACOLoader(draco).setKTX2Loader(ktx)
			.setMeshoptDecoder(MeshoptDecoder);
		loader.register((parser: GLTFParser) => ({
			name: 'MORIVIS_resources',
			beforeRoot: () => prepareGltfResources(parser.json, path, signal, urls),
			afterRoot: (result) => {
				result.scene.traverse((object) => {
					const association = parser.associations.get(object) as {
						meshes?: number;
						primitives?: number;
					} | undefined;
					if (association?.meshes === undefined || association.primitives === undefined) {
						return;
					}
					const definitions = parser.json.meshes[association.meshes]
						?.primitives[association.primitives]?.extensions?.EXT_mesh_features
						?.featureIds;
					if (definitions) setTilesFeatureDefinitions(object, definitions);
				});
				return null;
			}
		}));
		loader.register(() => new GLTFCesiumRTCExtension());
		loader.register(() => new GLTFMeshFeaturesExtension());
		loader.register(() => new GLTFStructuralMetadataExtension());
		try {
			loader.parse(data, path, (result) => {
				release();
				onLoad(result);
			}, (error) => {
				release();
				onError?.(error);
			});
		} catch (error) {
			release();
			onError?.(error as ErrorEvent);
		}
	};
	return handler;
};
