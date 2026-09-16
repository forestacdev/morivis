import type { AnyTiles3DEntry } from '$routes/map/data/types/model';
import type { FeatureProp } from '$routes/map/types/properties';
import type { PickingInfo } from '@deck.gl/core';
import type { MapboxOverlay } from '@deck.gl/mapbox';
import { Box3, Matrix4, Quaternion, Ray, Vector3 } from 'three';
import {
	type MetadataGltf,
	type MetadataTileContent,
	readTileFeatureProperties
} from './feature-metadata';
import {
	getScenegraphFeatureAttributes,
	type GltfPrimitiveLike,
	type ScenegraphGltfLike
} from './sanitize-scenegraph-gltf';

interface Mesh {
	primitives?: GltfPrimitiveLike[];
}
interface Node {
	mesh?: Mesh;
	children?: Node[];
	matrix?: number[];
	translation?: number[];
	rotation?: number[];
	scale?: number[];
	skin?: unknown;
}
type PickingGltf = ScenegraphGltfLike & MetadataGltf & {
	scene?: { nodes?: Node[]; };
	scenes?: { nodes?: Node[]; }[];
};
interface PickingTile {
	id?: string;
	content?: MetadataTileContent & { gltf?: PickingGltf; instances?: unknown; };
}
interface FeatureIds {
	attribute?: number;
	propertyTable?: number;
	nullFeatureId?: number;
	featureCount: number;
	texture?: unknown;
}
interface PrimitiveInstance {
	primitive: GltfPrimitiveLike;
	transform: Matrix4;
}
export interface PickedTiles3DFeature {
	entryId: string;
	featureId: string;
	properties: FeatureProp;
}
const instancesCache = new WeakMap<PickingGltf, PrimitiveInstance[]>();

const getPrimitiveInstances = (gltf: PickingGltf): PrimitiveInstance[] => {
	const cached = instancesCache.get(gltf);
	if (cached) return cached;
	const instances: PrimitiveInstance[] = [];
	const visit = (node: Node, parent: Matrix4, ancestors: Set<Node>) => {
		if (ancestors.has(node) || node.skin) return;
		const transform = node.matrix?.length === 16
			? new Matrix4().fromArray(node.matrix)
			: new Matrix4().compose(
				new Vector3().fromArray(node.translation ?? [0, 0, 0]),
				new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
				new Vector3().fromArray(node.scale ?? [1, 1, 1])
			);
		transform.premultiply(parent);
		for (const primitive of node.mesh?.primitives ?? []) {
			instances.push({ primitive, transform });
		}
		const path = new Set(ancestors).add(node);
		for (const child of node.children ?? []) visit(child, transform, path);
	};
	for (const node of (gltf.scene ?? gltf.scenes?.[0])?.nodes ?? []) {
		visit(node, new Matrix4(), new Set());
	}
	instancesCache.set(gltf, instances);
	return instances;
};

const numericArray = (value: unknown): value is ArrayLike<number> =>
	Array.isArray(value) || (ArrayBuffer.isView(value) && !(value instanceof DataView)
		&& !(value instanceof BigInt64Array) && !(value instanceof BigUint64Array));

const getFeatureId = (primitive: GltfPrimitiveLike, vertex: number) => {
	const extension = primitive.extensions?.EXT_mesh_features as
		| { featureIds?: FeatureIds[]; }
		| undefined;
	const feature =
		extension?.featureIds?.find((item) => !item.texture && item.propertyTable !== undefined)
			?? extension?.featureIds?.find((item) => !item.texture);
	const attributes = getScenegraphFeatureAttributes(primitive);
	if (feature) {
		const values = feature.attribute === undefined
			? undefined
			: attributes[`_FEATURE_ID_${feature.attribute}`]?.value;
		const id = feature.attribute === undefined
			? vertex
			: numericArray(values)
			? values[vertex]
			: undefined;
		if (
			id === undefined || id === feature.nullFeatureId || !Number.isSafeInteger(id) || id < 0
		) return null;
		return { id, propertyTable: feature.propertyTable };
	}
	const batchIds = (attributes._BATCHID ?? attributes.BATCHID)?.value;
	const id = numericArray(batchIds) ? batchIds[vertex] : undefined;
	return id !== undefined && Number.isSafeInteger(id) && id >= 0
		? { id, propertyTable: undefined }
		: null;
};

/** deckの判定したタイル内だけを探索する。頂点とクリックのレイを同じ共通座標へ変換する。 */
export const findTileFeatureAtPoint = (
	gltf: PickingGltf,
	point: { x: number; y: number; },
	projectToCommon: (position: number[]) => number[],
	unproject: (position: number[]) => number[] = (position) => position
) => {
	const near = new Vector3().fromArray(unproject([point.x, point.y, -1]));
	const far = new Vector3().fromArray(unproject([point.x, point.y, 1]));
	const ray = new Ray(near, far.clone().sub(near).normalize());
	let closestDistance = near.distanceToSquared(far);
	let closest: { primitive: GltfPrimitiveLike; vertex: number; } | null = null;
	const position = new Vector3();
	const a = new Vector3(), b = new Vector3(), c = new Vector3(), hit = new Vector3();
	for (const { primitive, transform } of getPrimitiveInstances(gltf)) {
		const values = primitive.attributes?.POSITION?.value;
		const indices = primitive.indices?.value;
		const mode = primitive.mode ?? 4;
		if (!numericArray(values) || ![4, 5, 6].includes(mode)) continue;
		const vertexCount = Math.floor(values.length / 3);
		const positions = new Float64Array(vertexCount * 3);
		const bounds = new Box3();
		positions.fill(NaN);
		for (let i = 0; i < vertexCount; i++) {
			position.set(values[i * 3], values[i * 3 + 1], values[i * 3 + 2]).applyMatrix4(
				transform
			);
			if (![position.x, position.y, position.z].every(Number.isFinite)) continue;
			position.fromArray(projectToCommon(position.toArray()));
			if (![position.x, position.y, position.z].every(Number.isFinite)) continue;
			position.toArray(positions, i * 3);
			bounds.expandByPoint(position);
		}
		if (bounds.isEmpty() || !ray.intersectsBox(bounds)) continue;
		const index = (i: number) => numericArray(indices) ? indices[i] : i;
		const count = numericArray(indices) ? indices.length : vertexCount;
		for (let i = 0; i + 2 < count; i += mode === 4 ? 3 : 1) {
			const ia = index(mode === 6 ? 0 : i), ib = index(i + 1), ic = index(i + 2);
			if ([ia, ib, ic].some((n) => !Number.isInteger(n) || n < 0 || n >= vertexCount)) {
				continue;
			}
			a.fromArray(positions, ia * 3);
			b.fromArray(positions, ib * 3);
			c.fromArray(positions, ic * 3);
			if (!ray.intersectTriangle(a, b, c, false, hit)) continue;
			const distance = near.distanceToSquared(hit);
			if (!Number.isFinite(distance) || distance >= closestDistance) continue;
			closestDistance = distance;
			// EXT_mesh_featuresでは面内の点に最も近い頂点のIDを使う。
			const distances = [
				hit.distanceToSquared(a),
				hit.distanceToSquared(b),
				hit.distanceToSquared(c)
			];
			const vertex = [ia, ib, ic][distances.indexOf(Math.min(...distances))];
			closest = { primitive, vertex };
		}
	}
	return closest ? getFeatureId(closest.primitive, closest.vertex) : null;
};

export const resolvePickedTiles3DFeature = (
	info: PickingInfo,
	entryId: string
): PickedTiles3DFeature | null => {
	const tile = info.object as PickingTile | undefined;
	if (!info.picked || !tile?.content) return null;
	const content = tile.content;
	const gltf = content.gltf;
	const sourceLayer = info.sourceLayer;
	const inverseProjection = info.viewport?.pixelUnprojectionMatrix
		? new Matrix4().fromArray(info.viewport.pixelUnprojectionMatrix)
		: null;
	const unproject = (position: number[]) =>
		inverseProjection
			? new Vector3().fromArray(position).applyMatrix4(inverseProjection).toArray()
			: position;
	// i3dmのインスタンス属性、テクスチャに格納されたID、点群は別方式の判定が必要。
	const feature = gltf && sourceLayer && !content.instances
		? findTileFeatureAtPoint(
			gltf,
			{ x: info.x, y: info.y },
			(position) => sourceLayer.projectPosition(position, { autoOffset: false }),
			unproject
		)
		: null;
	const properties = feature
		? readTileFeatureProperties(content, feature.id, feature.propertyTable)
		: {};
	return {
		entryId,
		featureId: `${tile.id ?? 'tile'}:${feature?.propertyTable ?? 'batch'}:${
			feature?.id ?? 'unknown'
		}`,
		properties: {
			...(feature ? { 地物ID: feature.id } : {}),
			...(Object.keys(properties).length ? {} : {
				属性情報: feature
					? 'この地物には読み取り可能な属性がありません'
					: 'このタイルの地物IDを取得できません（IDなし、または未対応の形式）'
			}),
			...properties
		}
	};
};

export const pickTiles3DFeature = (
	overlay: Pick<MapboxOverlay, 'pickObject'> | null,
	point: { x: number; y: number; },
	entries: Iterable<AnyTiles3DEntry>
): PickedTiles3DFeature | null => {
	if (!overlay) return null;
	const entryByLayer = new Map(
		Array.from(entries)
			.filter((entry) =>
				entry.style.type === '3d-tiles-mesh' && entry.interaction.clickable
				&& entry.style.visible !== false
			)
			.map((entry) => [`3d-tiles-layer-${entry.id}`, entry.id])
	);
	if (!entryByLayer.size) return null;
	const info = overlay.pickObject({
		x: point.x,
		y: point.y,
		radius: 0,
		layerIds: [...entryByLayer.keys()]
	});
	const entryId = info?.layer && entryByLayer.get(info.layer.id);
	return info && entryId ? resolvePickedTiles3DFeature(info, entryId) : null;
};
