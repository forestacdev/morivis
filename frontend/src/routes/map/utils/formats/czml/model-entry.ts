import { createGlbEntry } from '$routes/map/data/entries/model';
import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import { applyModelNodeTransforms } from '$routes/map/utils/three/model-node-transforms';
import { Group, Matrix4, Mesh, type Object3D, Texture } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { type GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { CzmlResult } from '.';
import { czmlModelLimits, formatCzml } from './definition';
import { createCzmlAssetResolver } from './model-assets';
import { czmlModelMatrix } from './model-placement';

const dispose = (roots: Object3D[]) => {
	const resources = new Set<{ dispose: () => void; }>();
	for (const root of roots) {
		root.traverse(object => {
			if (!(object instanceof Mesh)) return;
			resources.add(object.geometry);
			for (
				const material of Array.isArray(object.material)
					? object.material
					: [object.material]
			) {
				resources.add(material);
				for (const value of Object.values(material)) {
					if (value instanceof Texture) resources.add(value);
				}
			}
		});
	}
	resources.forEach(resource => resource.dispose());
};

export const createCzmlModelEntry = async (
	result: CzmlResult,
	document: File,
	files: File[],
	name: string,
	inputSignal: AbortSignal
): Promise<MeshEntry<MeshStyle>> => {
	const signal = AbortSignal.any([inputSignal, AbortSignal.timeout(formatCzml.limits.timeoutMs)]);
	signal.throwIfAborted();
	const first = result.models[0]?.frames[0];
	if (!first) throw new Error('CZMLに表示できるモデルがありません');
	const origin: [number, number] = [first.position[0], first.position[1]];
	const resolver = createCzmlAssetResolver(document, files, signal);
	const urls = new Set<string>();
	const assets = new Map<string, GLTF>();
	const group = new Group();
	const draco = new DRACOLoader().setDecoderPath(resolveStaticAssetPath('/draco/gltf/'));
	const entry = createGlbEntry(name, '', { lng: origin[0], lat: origin[1], altitude: 0 });
	entry.metaData.attribution = 'CZML';
	entry.metaData.description =
		'CZMLで位置・向き・縮尺を指定した3Dモデルのデータ。時刻ごとの配置を地図上で確認する際に利用できる。';
	entry.style.transformOptions = {
		georeference: false,
		rotation: false,
		scale: false,
		heightOffset: false
	};
	entry.properties = { nodeTransforms: [] };
	if (result.timestamps.length) {
		entry.properties.temporal = { dimension: { type: 'time', values: result.timestamps } };
		entry.state = { dimension: { currentIndex: 0 } };
	}
	let vertices = 0;
	const bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
	try {
		for (const model of result.models) {
			signal.throwIfAborted();
			const source = resolver.resolve(model.uri);
			let asset = assets.get(source);
			if (!asset) {
				if (assets.size >= czmlModelLimits.maxAssets) {
					throw new Error('CZMLのモデルファイルが32種類を超えています');
				}
				const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(
					MeshoptDecoder
				);
				loader.register(parser => ({
					name: 'MORIVIS_CZML_resources',
					beforeRoot: async () => {
						// JSON glTFとGLB内の外部バッファ・画像を同じルールで解決する。
						for (
							const item of [
								...(parser.json.buffers ?? []),
								...(parser.json.images ?? [])
							]
						) {
							if (typeof item.uri !== 'string') continue;
							const data = await resolver.read(resolver.resolve(item.uri, source));
							signal.throwIfAborted();
							const url = URL.createObjectURL(new Blob([data]));
							urls.add(url);
							item.uri = url;
						}
					}
				}));
				asset = await loader.parseAsync(await resolver.read(source), '');
				assets.set(source, asset);
				signal.throwIfAborted();
			}
			asset.scene.traverse(object => {
				if (object instanceof Mesh) {
					vertices += object.geometry.getAttribute('position')?.count ?? 0;
				}
			});
			if (vertices > czmlModelLimits.maxVertices) {
				throw new Error('CZMLのモデル頂点数が100万点を超えています');
			}
			const node = new Group();
			node.name = `morivis_czml_${crypto.randomUUID().replaceAll('-', '_')}`;
			node.userData = { entity_id: model.id, name: model.name };
			node.add(clone(asset.scene));
			const frames: (number[] | null)[] = Array.from({
				length: result.timestamps.length || 1
			}, () => null);
			for (const frame of model.frames) {
				frames[frame.timeIndex] = czmlModelMatrix(frame, origin);
				bounds[0] = Math.min(bounds[0], frame.position[0]);
				bounds[1] = Math.min(bounds[1], frame.position[1]);
				bounds[2] = Math.max(bounds[2], frame.position[0]);
				bounds[3] = Math.max(bounds[3], frame.position[1]);
			}
			// 後の時刻にしか現れないノードもGLBへ含める。
			new Matrix4().fromArray(
				frames[model.frames.find(frame => frame.scale > 0)?.timeIndex ?? -1]
					?? new Matrix4().toArray()
			).decompose(
				node.position,
				node.quaternion,
				node.scale
			);
			group.add(node);
			entry.properties.nodeTransforms!.push({ nodeName: node.name, frames });
		}
		if (!vertices) throw new Error('CZMLのモデルに表示できるメッシュがありません');
		const data = await new GLTFExporter().parseAsync(group, {
			binary: true,
			onlyVisible: false
		});
		signal.throwIfAborted();
		if (!(data instanceof ArrayBuffer) || data.byteLength > czmlModelLimits.maxBytes) {
			throw new Error('CZMLモデルの変換結果が128 MiBを超えています');
		}
		entry.metaData.bounds = [
			bounds[0] - 0.001,
			bounds[1] - 0.001,
			bounds[2] + 0.001,
			bounds[3] + 0.001
		];
		applyModelNodeTransforms(group, entry);
		entry.format.url = URL.createObjectURL(new Blob([data], { type: 'model/gltf-binary' }));
		return entry;
	} finally {
		urls.forEach(url => URL.revokeObjectURL(url));
		dispose([group, ...[...assets.values()].map(asset => asset.scene)]);
		draco.dispose();
	}
};
