import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import type { ModelPartData } from '$routes/map/data/types/model';
import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
import type { Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { resolveFbxModelAttributes } from '$routes/map/utils/three/fbx-attributes';
import {
	getModelObjectAttributes,
	type ModelAttributes
} from '$routes/map/utils/three/model-attributes';
import { getModelViewAxisRotationX } from '$routes/map/utils/three/model-axis';
import { createModelHighlightMaterial } from '$routes/map/utils/three/model-highlight';
import { isLowerDetailLodUrl } from '$routes/map/utils/three/model-lod';
import { resolveModelViewFloorY } from '$routes/map/utils/three/model-view-floor';
import * as THREE from 'three';
import { getIfcExpressId } from './ifc-runtime-attributes';
import { ModelRenderer } from './model-renderer';
import { isGaussianSplatEntry, isMeshModelEntry, type LoadedModel } from './model-runtime-types';
const MODEL_VIEW_FPS_MOVEMENT_SPEED_DIVISOR = 5;
const MODEL_VIEW_FPS_MIN_MOVEMENT_SPEED = 1;
const MODEL_VIEW_INITIAL_CAMERA_DISTANCE_SCALE = 0.75;

export interface PickedModelFeature {
	entryId: string;
	objectId: string;
	objectName: string;
	isLowerDetailLod?: false;
	propId?: string;
	attributes: ModelAttributes;
	part?: ModelPartData;
}

export interface PickedLowerDetailLod {
	entryId: string;
	isLowerDetailLod: true;
}

interface ModelHighlight {
	mesh: THREE.Mesh;
	fill: THREE.Mesh;
	outline?: THREE.LineSegments;
	geometry: THREE.BufferGeometry;
	expressId?: number;
}

export interface ModelViewCameraOptions {
	type: 'orthographic' | 'perspective';
	position: [number, number, number];
	direction: [number, number, number];
	up: [number, number, number];
	viewToWorldScale?: number;
	fieldOfView?: number;
}

export interface ModelViewSession {
	camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
	canvas: HTMLCanvasElement;
	container: HTMLElement;
	movementSpeed: number;
	getTarget: () => THREE.Vector3;
	resetView: () => void;
	resize: () => void;
}

interface ActiveModelView {
	entryIds: Set<string>;
	camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
	target: THREE.Vector3;
	floorGrid: THREE.GridHelper;
	highlightVisibility: Map<THREE.Object3D, boolean>;
	axisWrappers: Array<{
		object: THREE.Object3D;
		parent: THREE.Object3D;
		wrapper: THREE.Group;
	}>;
	modelGroupVisible: boolean;
	previewVisible: boolean;
}

const CLICKABLE_MODEL_FORMATS = new Set<MeshEntry<MeshStyle>['format']['type']>([
	'fbx',
	'vrml',
	'obj',
	'gltf',
	'vrm',
	'3ds',
	'dae',
	'3dm',
	'drc',
	'3mf',
	'amf',
	'stl',
	'ifc',
	'pmx',
	'usd'
]);

/** モデル選択と単体ビュー。読み込みや登録は行わない。 */
export class ModelInteractionController {
	constructor(
		private readonly modelRenderer: ModelRenderer,
		private readonly loadedModels: ReadonlyMap<string, LoadedModel>
	) {}
	private map: MapLibreMap | null = null;
	private selectedModelHighlights: ModelHighlight[] = [];
	private activeModelView: ActiveModelView | null = null;
	private lastMapProjectionMatrix: THREE.Matrix4 | null = null;
	private get scene() {
		return this.modelRenderer.scene;
	}
	private get renderer() {
		return this.modelRenderer.renderer;
	}
	private get modelGroup() {
		return this.modelRenderer.modelGroup;
	}
	private get previewModelGroup() {
		return this.modelRenderer.previewModelGroup;
	}
	private setOnlyEntryVisible = (
		entryId: string,
		visible: boolean,
		targetObject?: THREE.Object3D
	) => this.modelRenderer.setOnlyEntryVisible(entryId, visible, targetObject);
	get view() {
		return this.activeModelView;
	}
	attach = (map: MapLibreMap) => {
		this.map = map;
	};
	setProjection = (projection: THREE.Matrix4) => {
		this.lastMapProjectionMatrix = projection;
	};
	hasHighlightIn = (object: THREE.Object3D) =>
		this.selectedModelHighlights.some(highlight =>
			object.getObjectById(highlight.mesh.id) === highlight.mesh
		);
	detach = () => {
		this.closeModelView();
		this.clearModelHighlight();
		this.map = null;
		this.lastMapProjectionMatrix = null;
	};
	clearModelHighlight = (): void => {
		if (this.selectedModelHighlights.length === 0) return;

		this.selectedModelHighlights.forEach((highlight) => {
			highlight.fill.removeFromParent();
			(highlight.fill.material as THREE.Material).dispose();
			if (highlight.geometry !== highlight.mesh.geometry) highlight.geometry.dispose();
			if (highlight.outline) {
				highlight.outline.removeFromParent();
				highlight.outline.geometry.dispose();
				(highlight.outline.material as THREE.Material).dispose();
			}
		});
		this.selectedModelHighlights = [];
		this.map?.triggerRepaint();
	};

	highlightIfcGlobalId = async (globalId: string): Promise<string | null> => {
		const entryIds = await this.highlightIfcGlobalIds([globalId]);
		return entryIds[0] ?? null;
	};

	highlightIfcGlobalIds = async (globalIds: string[]): Promise<string[]> => {
		const requestedIds = new Set(globalIds.map((globalId) => globalId.trim()).filter(Boolean));
		if (requestedIds.size === 0) return [];

		const targets: { entryId: string; mesh: THREE.Mesh; expressId: number; }[] = [];
		for (const loaded of this.loadedModels.values()) {
			if (loaded.entry.format.type !== 'ifc') continue;
			const index = await this.getIfcGlobalIdIndex(loaded);
			requestedIds.forEach((globalId) => {
				const target = index.get(globalId);
				if (target) targets.push({ entryId: loaded.entry.id, ...target });
			});
		}

		if (targets.length === 0) return [];
		this.clearModelHighlight();
		targets.forEach((target) => this.addModelHighlight(target.mesh, target.expressId));
		this.map?.triggerRepaint();
		return Array.from(new Set(targets.map((target) => target.entryId)));
	};

	private getIfcGlobalIdIndex = async (loaded: LoadedModel) => {
		const model = loaded.object as THREE.Object3D & {
			modelID?: number;
			ifcManager?: {
				getItemProperties: (
					modelId: number,
					expressId: number
				) => Promise<Record<string, unknown>>;
			} | null;
		};
		const cached = model.userData.morivisIfcGlobalIdIndex as
			| Map<string, { expressId: number; mesh: THREE.Mesh; }>
			| undefined;
		if (cached) return cached;

		const index = new Map<string, { expressId: number; mesh: THREE.Mesh; }>();
		if (model.modelID == null || !model.ifcManager) return index;

		const meshesByExpressId = new Map<number, THREE.Mesh>();
		model.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh) return;
			const mesh = child as THREE.Mesh;
			const expressIds = mesh.geometry.getAttribute('expressID');
			for (let index = 0; expressIds && index < expressIds.count; index += 1) {
				meshesByExpressId.set(expressIds.getX(index), mesh);
			}
		});

		const expressIds = Array.from(meshesByExpressId.keys());
		for (let offset = 0; offset < expressIds.length; offset += 50) {
			const batch = expressIds.slice(offset, offset + 50);
			const results = await Promise.allSettled(
				batch.map(async (expressId) => {
					const item = await model.ifcManager!.getItemProperties(
						model.modelID!,
						expressId
					);
					const globalIdValue = item.GlobalId;
					const globalId = globalIdValue && typeof globalIdValue === 'object'
							&& 'value' in globalIdValue
						? globalIdValue.value
						: globalIdValue;
					const mesh = meshesByExpressId.get(expressId);
					return typeof globalId === 'string' && mesh
						? { globalId, expressId, mesh }
						: null;
				})
			);
			results.forEach((result) => {
				if (result.status !== 'fulfilled' || result.value == null) return;
				index.set(result.value.globalId, result.value);
			});
		}

		model.userData.morivisIfcGlobalIdIndex = index;
		return index;
	};

	private getIfcHighlightGeometry = (mesh: THREE.Mesh, expressId: number) => {
		const sourceGeometry = mesh.geometry;
		const expressIds = sourceGeometry.getAttribute('expressID');
		if (!expressIds) return null;
		const sourceIndex = sourceGeometry.getIndex();
		const vertexCount = sourceIndex?.count ?? sourceGeometry.getAttribute('position').count;
		const indices: number[] = [];
		for (let offset = 0; offset < vertexCount; offset += 3) {
			const firstVertex = sourceIndex ? sourceIndex.getX(offset) : offset;
			if (expressIds.getX(firstVertex) !== expressId) continue;
			indices.push(
				sourceIndex ? sourceIndex.getX(offset) : offset,
				sourceIndex ? sourceIndex.getX(offset + 1) : offset + 1,
				sourceIndex ? sourceIndex.getX(offset + 2) : offset + 2
			);
		}
		if (indices.length === 0) return null;
		const geometry = sourceGeometry.clone();
		geometry.clearGroups();
		geometry.setIndex(indices);
		return geometry;
	};

	private getModelPartNode = (object: THREE.Object3D) => {
		let current: THREE.Object3D | null = object;
		while (current) {
			const propId = current.userData._prop_id;
			if (typeof propId === 'string' && propId) return { id: propId, object: current };
			current = current.parent;
		}
		return undefined;
	};

	private getModelPartId = (object: THREE.Object3D) => this.getModelPartNode(object)?.id;

	private getModelPartMeshes = (mesh: THREE.Mesh) => {
		const partNode = this.getModelPartNode(mesh)?.object;
		if (!partNode) return [mesh];
		const partMeshes: THREE.Mesh[] = [];
		partNode.traverse((child) => {
			if (
				(child as THREE.Mesh).isMesh
				&& !child.userData.morivisSelectionHighlight
				&& !child.userData.morivisEdgeOverlay
			) {
				partMeshes.push(child as THREE.Mesh);
			}
		});
		return partMeshes.length > 0 ? partMeshes : [mesh];
	};

	private highlightModelMeshes = (meshes: THREE.Mesh[], expressId?: number) => {
		if (
			this.selectedModelHighlights.length === meshes.length
			&& this.selectedModelHighlights.every(
				(highlight, index) =>
					highlight.mesh === meshes[index] && highlight.expressId === expressId
			)
		) {
			return;
		}
		this.clearModelHighlight();
		meshes.forEach((mesh) => this.addModelHighlight(mesh, expressId));
		this.map?.triggerRepaint();
	};

	private addModelHighlight = (mesh: THREE.Mesh, expressId?: number) => {
		const geometry = expressId == null
			? mesh.geometry
			: (this.getIfcHighlightGeometry(mesh, expressId) ?? mesh.geometry);

		const fillMaterial = createModelHighlightMaterial();
		const sourceSkinnedMesh = mesh as THREE.SkinnedMesh;
		let fill: THREE.Mesh;
		if (sourceSkinnedMesh.isSkinnedMesh) {
			const skinnedFill = new THREE.SkinnedMesh(geometry, fillMaterial);
			skinnedFill.bindMode = sourceSkinnedMesh.bindMode;
			skinnedFill.bind(sourceSkinnedMesh.skeleton, sourceSkinnedMesh.bindMatrix);
			skinnedFill.morphTargetInfluences = sourceSkinnedMesh.morphTargetInfluences;
			skinnedFill.morphTargetDictionary = sourceSkinnedMesh.morphTargetDictionary;
			fill = skinnedFill;
		} else {
			fill = new THREE.Mesh(geometry, fillMaterial);
			fill.morphTargetInfluences = mesh.morphTargetInfluences;
			fill.morphTargetDictionary = mesh.morphTargetDictionary;
		}
		fill.name = 'morivis-fbx-highlight-fill';
		fill.userData.morivisSelectionHighlight = true;
		fill.raycast = () => undefined;

		const outline = sourceSkinnedMesh.isSkinnedMesh
			? undefined
			: new THREE.LineSegments(
				new THREE.EdgesGeometry(geometry, 20),
				new THREE.LineBasicMaterial({ color: HIGHLIGHT_LAYER_COLOR, depthWrite: false })
			);
		if (outline) {
			outline.name = 'morivis-fbx-highlight-outline';
			outline.userData.morivisSelectionHighlight = true;
			outline.raycast = () => undefined;
		}

		mesh.add(fill);
		if (outline) mesh.add(outline);
		this.selectedModelHighlights.push({ mesh, fill, outline, geometry, expressId });
	};

	private resolvePickedObjectName = (object: THREE.Object3D, root: THREE.Object3D) => {
		let current: THREE.Object3D | null = object;
		while (current && current !== root) {
			const originalName = current.userData.originalName;
			if (typeof originalName === 'string' && originalName) return originalName;
			if (current.name) return current.name;
			current = current.parent;
		}

		if ((object as THREE.Mesh).isMesh) {
			const meshMaterial = (object as THREE.Mesh).material as
				| THREE.Material
				| THREE.Material[];
			const materials = Array.isArray(meshMaterial) ? meshMaterial : [meshMaterial];
			const materialName = materials.find((material) => material.name)?.name;
			if (materialName) return materialName;
		}

		return '名称なし';
	};

	private getIfcExpressId = getIfcExpressId;

	openModelView = (
		entryIds: string[],
		initialCamera?: ModelViewCameraOptions,
		includeHighlights = false
	): ModelViewSession | null => {
		if (
			!this.scene || !this.renderer || !this.map || !this.modelGroup
			|| !this.previewModelGroup
		) {
			return null;
		}
		const canvas = this.map.getCanvas();
		const loaded = entryIds
			.map((entryId) => this.loadedModels.get(entryId))
			.filter((model): model is LoadedModel => model != null);
		if (loaded.length === 0) return null;
		const isPlySplatOnlyView = loaded.every((model) =>
			isGaussianSplatEntry(model.entry) && model.entry.format.encoding !== 'spz'
		);

		this.closeModelView();
		const axisWrappers = loaded.flatMap((model) => {
			if (!isMeshModelEntry(model.entry)) return [];
			const rotationX = getModelViewAxisRotationX(
				model.entry.format.type,
				model.entry.style.transform.baseRotationX
			);
			const parent = model.object.parent;
			if (rotationX === 0 || !parent) return [];

			const wrapper = new THREE.Group();
			wrapper.rotation.x = THREE.MathUtils.degToRad(rotationX);
			parent.add(wrapper);
			wrapper.add(model.object);
			return [{ object: model.object, parent, wrapper }];
		});
		const bounds = new THREE.Box3();
		loaded.forEach((model) => {
			model.object.updateWorldMatrix(true, true);
			bounds.expandByObject(model.object);
		});
		if (bounds.isEmpty()) {
			axisWrappers.forEach(({ object, parent, wrapper }) => {
				wrapper.remove(object);
				parent.add(object);
				wrapper.parent?.remove(wrapper);
			});
			return null;
		}
		const modelSize = bounds.getSize(new THREE.Vector3());
		const largestDimension = Math.max(modelSize.x, modelSize.y, modelSize.z, 1);
		const floorGridSize = Math.max(modelSize.x, modelSize.z, 1) * 2;
		const floorGrid = new THREE.GridHelper(floorGridSize, 20, '#64748b', '#cbd5e1');
		const floorOffset = Math.max(largestDimension * 0.0001, 0.00001);
		const modelCenter = bounds.getCenter(new THREE.Vector3());
		const floorY = resolveModelViewFloorY(
			bounds,
			loaded.map((model) => model.entry.properties?.modelView?.floorY)
		);
		floorGrid.position.set(modelCenter.x, floorY - floorOffset, modelCenter.z);
		const floorGridMaterials = Array.isArray(floorGrid.material)
			? floorGrid.material
			: [floorGrid.material];
		floorGridMaterials.forEach((material) => {
			material.transparent = true;
			material.opacity = 0.55;
			material.depthWrite = false;
		});

		const camera: THREE.PerspectiveCamera | THREE.OrthographicCamera =
			initialCamera?.type === 'orthographic'
				? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1_000_000)
				: new THREE.PerspectiveCamera(45, 1, 0.01, 1_000_000);
		const activeModelView: ActiveModelView = {
			entryIds: new Set(loaded.map((model) => model.entry.id)),
			camera,
			target: new THREE.Vector3(),
			floorGrid,
			highlightVisibility: new Map(),
			axisWrappers,
			modelGroupVisible: this.modelGroup.visible,
			previewVisible: this.previewModelGroup.visible
		};
		this.activeModelView = activeModelView;
		this.scene.add(floorGrid);
		this.modelGroup.visible = true;
		this.previewModelGroup.visible = false;
		loaded.forEach((model) => {
			model.object.traverse((child) => {
				if (!child.userData.morivisSelectionHighlight) return;
				activeModelView.highlightVisibility.set(child, child.visible);
				child.visible = includeHighlights;
			});
		});

		const fitModel = () => {
			const center = bounds.getCenter(new THREE.Vector3());
			const distance = (largestDimension / (2 * Math.tan(THREE.MathUtils.degToRad(45 / 2))))
				* MODEL_VIEW_INITIAL_CAMERA_DISTANCE_SCALE;

			camera.near = Math.max(largestDimension / 10_000, 0.001);
			camera.far = Math.max(largestDimension * 100, 1_000);
			// 3DGS PLYはMapLibreの画面座標と上下が逆になるため、単体ビューだけ上方向を反転する。
			camera.up.set(0, isPlySplatOnlyView ? -1 : 1, 0);
			camera.position.copy(center).add(new THREE.Vector3(distance, distance * 0.7, distance));
			camera.lookAt(center);
			if (camera instanceof THREE.PerspectiveCamera) {
				camera.fov = 45;
			} else {
				const halfSize = largestDimension * 0.65;
				camera.top = halfSize;
				camera.bottom = -halfSize;
			}
			activeModelView.target.copy(center);
			this.resizeModelView();
		};

		fitModel();
		if (initialCamera) {
			camera.position.set(...initialCamera.position);
			camera.up.set(...initialCamera.up);
			activeModelView.target
				.set(...initialCamera.position)
				.add(new THREE.Vector3(...initialCamera.direction));
			if (camera instanceof THREE.PerspectiveCamera && initialCamera.fieldOfView) {
				camera.fov = initialCamera.fieldOfView;
			}
			if (camera instanceof THREE.OrthographicCamera && initialCamera.viewToWorldScale) {
				const halfScale = initialCamera.viewToWorldScale / 2;
				camera.top = halfScale;
				camera.bottom = -halfScale;
			}
			this.resizeModelView();
		}
		this.map.triggerRepaint();

		return {
			camera,
			canvas,
			container: this.map.getContainer(),
			movementSpeed: Math.max(
				largestDimension / MODEL_VIEW_FPS_MOVEMENT_SPEED_DIVISOR,
				MODEL_VIEW_FPS_MIN_MOVEMENT_SPEED
			),
			getTarget: () => activeModelView.target.clone(),
			resetView: fitModel,
			resize: this.resizeModelView
		};
	};

	private resizeModelView = () => {
		const activeModelView = this.activeModelView;
		const map = this.map;
		if (!activeModelView || !map) return;

		const container = map.getContainer();
		if (container.clientWidth === 0 || container.clientHeight === 0) {
			return;
		}

		// WebGLキャンバスはMapLibreと共有しているため、描画バッファのサイズ変更もMapLibreに任せる。
		map.resize();

		const { camera } = activeModelView;
		const aspect = container.clientWidth / container.clientHeight;
		if (camera instanceof THREE.PerspectiveCamera) {
			camera.aspect = aspect;
		} else {
			const halfHeight = (camera.top - camera.bottom) / 2;
			camera.left = -halfHeight * aspect;
			camera.right = halfHeight * aspect;
		}
		camera.updateProjectionMatrix();
		map.triggerRepaint();
	};

	requestModelViewRepaint = (): void => {
		if (this.activeModelView) this.map?.triggerRepaint();
	};

	closeModelView = (): void => {
		const activeModelView = this.activeModelView;
		if (!activeModelView) return;

		activeModelView.highlightVisibility.forEach((visible, highlight) => {
			highlight.visible = visible;
		});
		activeModelView.axisWrappers.forEach(({ object, parent, wrapper }) => {
			wrapper.remove(object);
			parent.add(object);
			wrapper.parent?.remove(wrapper);
		});
		this.scene?.remove(activeModelView.floorGrid);
		activeModelView.floorGrid.dispose();
		if (this.modelGroup) {
			this.modelGroup.visible = activeModelView.modelGroupVisible;
		}
		if (this.previewModelGroup) {
			this.previewModelGroup.visible = activeModelView.previewVisible;
		}
		this.setOnlyEntryVisible('', false);
		this.loadedModels.forEach((loaded) => {
			loaded.object.visible = loaded.entry.style.visible ?? true;
		});
		this.activeModelView = null;
		this.map?.triggerRepaint();
	};

	private createPickedModelFeature = async (
		loaded: LoadedModel,
		hit: THREE.Intersection<THREE.Object3D>
	): Promise<PickedModelFeature> => {
		const fbxAttributeObject = resolveFbxModelAttributes(hit.object, loaded.object);
		const expressId = loaded.entry.format.type === 'ifc'
			? this.getIfcExpressId(loaded.object, hit)
			: undefined;
		let formatAttributes: ModelAttributes = Object.fromEntries(
			Object.entries(fbxAttributeObject.attributes ?? {}).map(([key, value]) => [
				key,
				Array.isArray(value) ? value.join(', ') : value
			])
		);
		if (loaded.resolveAttributes) {
			try {
				formatAttributes = {
					...formatAttributes,
					...(await loaded.resolveAttributes(hit))
				};
			} catch (error) {
				console.warn('[モデル属性] 形式固有属性の取得に失敗しました', error);
			}
		}
		const attributeObject = loaded.entry.format.type === 'fbx'
			? fbxAttributeObject.object
			: hit.object;
		const objectId = expressId ?? (attributeObject as THREE.Object3D & { ID?: number; }).ID
			?? attributeObject.id;
		const hitMesh = hit.object as THREE.Mesh;
		const propId = this.getModelPartId(hit.object);
		const part = propId ? loaded.entry.properties?.detailsById?.[propId] : undefined;
		this.highlightModelMeshes(
			expressId == null ? this.getModelPartMeshes(hitMesh) : [hitMesh],
			expressId
		);
		const attributes = {
			...getModelObjectAttributes(hit.object),
			...formatAttributes,
			...part?.attributes
		};
		delete attributes._prop_id;
		return {
			entryId: loaded.entry.id,
			objectId: String(objectId),
			objectName: this.resolvePickedObjectName(attributeObject, loaded.object),
			propId,
			attributes,
			part
		};
	};

	private isSelectedModelIntersection = (
		loaded: LoadedModel,
		intersection: THREE.Intersection<THREE.Object3D>
	) => {
		const selectedHighlights = this.selectedModelHighlights.filter(
			(highlight) => highlight.mesh === intersection.object
		);
		if (selectedHighlights.length === 0) return false;
		if (loaded.entry.format.type !== 'ifc') return true;

		// IFC は複数部材が同じ Mesh を共有するため、選択済みの Express ID だけを除外する。
		const expressId = this.getIfcExpressId(loaded.object, intersection);
		return selectedHighlights.some((highlight) => highlight.expressId === expressId);
	};

	pickModelInActiveView = async (point: {
		clientX: number;
		clientY: number;
	}): Promise<PickedModelFeature | null> => {
		const activeModelView = this.activeModelView;
		const canvas = this.map?.getCanvas();
		if (!activeModelView || !canvas) return null;

		const rect = canvas.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return null;
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(
			new THREE.Vector2(
				((point.clientX - rect.left) / rect.width) * 2 - 1,
				1 - ((point.clientY - rect.top) / rect.height) * 2
			),
			activeModelView.camera
		);
		const targetEntries = Array.from(this.loadedModels.values()).filter(
			(loaded) =>
				activeModelView.entryIds.has(loaded.entry.id)
				&& isMeshModelEntry(loaded.entry)
				&& CLICKABLE_MODEL_FORMATS.has(loaded.entry.format.type)
				&& (loaded.entry.style.visible ?? true)
		);
		let closest: { loaded: LoadedModel; hit: THREE.Intersection<THREE.Object3D>; } | null =
			null;
		for (const loaded of targetEntries) {
			const hit = raycaster
				.intersectObject(loaded.object, true)
				.find(
					(intersection) =>
						!intersection.object.userData.morivisSelectionHighlight
						&& !this.isSelectedModelIntersection(loaded, intersection)
				);
			if (hit && (!closest || hit.distance < closest.hit.distance)) {
				closest = { loaded, hit };
			}
		}
		if (!closest) return null;

		return this.createPickedModelFeature(closest.loaded, closest.hit);
	};

	pickModel = async (
		point: { x: number; y: number; }
	): Promise<PickedModelFeature | PickedLowerDetailLod | null> => {
		if (!import.meta.env.PROD) console.info('[モデル pick] 開始', { point });
		if (!this.map || !this.lastMapProjectionMatrix) {
			if (!import.meta.env.PROD) {
				console.info('[モデル pick] 未初期化', {
					hasMap: Boolean(this.map),
					hasProjectionMatrix: Boolean(this.lastMapProjectionMatrix)
				});
			}
			return null;
		}
		const mapProjectionMatrix = this.lastMapProjectionMatrix;
		const canvas = this.map.getCanvas();
		if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
			if (!import.meta.env.PROD) console.info('[モデル pick] canvas サイズが不正です');
			return null;
		}
		const raycaster = new THREE.Raycaster();
		const ndc = new THREE.Vector2(
			(point.x / canvas.clientWidth) * 2 - 1,
			1 - (point.y / canvas.clientHeight) * 2
		);
		const targetEntries = Array.from(this.loadedModels.values()).filter(
			(loaded) =>
				isMeshModelEntry(loaded.entry)
				&& CLICKABLE_MODEL_FORMATS.has(loaded.entry.format.type)
				&& loaded.entry.style.visible
		);
		if (!import.meta.env.PROD) {
			console.info('[モデル pick] 開始', {
				point,
				ndc: ndc.toArray(),
				canvas: [canvas.clientWidth, canvas.clientHeight],
				targetEntryIds: targetEntries.map((loaded) => loaded.entry.id)
			});
		}
		if (targetEntries.length === 0) {
			if (!import.meta.env.PROD) {
				console.info('[モデル pick] null: クリック対象のモデルがありません', {
					loadedModels: Array.from(this.loadedModels.values()).map((loaded) => ({
						id: loaded.entry.id,
						format: loaded.entry.format.type,
						clickable: loaded.entry.interaction.clickable,
						visible: loaded.entry.style.visible
					}))
				});
			}
			return null;
		}
		let closest: {
			distance: number;
			loaded: LoadedModel;
			hit: THREE.Intersection<THREE.Object3D>;
		} | null = null;
		for (const loaded of targetEntries) {
			const inverse = mapProjectionMatrix.clone().multiply(loaded.transform.matrix).invert();
			const origin = new THREE.Vector3(ndc.x, ndc.y, -1).applyMatrix4(inverse);
			const target = new THREE.Vector3(ndc.x, ndc.y, 1).applyMatrix4(inverse);
			raycaster.ray.set(origin, target.sub(origin).normalize());
			const wasVisible = loaded.object.visible;
			loaded.object.visible = true;
			const hit = raycaster
				.intersectObject(loaded.object, true)
				.find(
					(intersection) =>
						this.isLowerDetailLod(loaded)
						|| !this.isSelectedModelIntersection(loaded, intersection)
				);
			loaded.object.visible = wasVisible;
			if (!import.meta.env.PROD) {
				console.info('[モデル pick] 判定結果', {
					entryId: loaded.entry.id,
					rayOrigin: origin.toArray(),
					rayDirection: raycaster.ray.direction.toArray(),
					hit: hit
						? {
							distance: hit.distance,
							objectId: (hit.object as THREE.Object3D & { ID?: number; }).ID,
							objectName: hit.object.userData.originalName ?? hit.object.name,
							hasAttributes: Boolean(hit.object.userData.morivisFbxAttributes)
						}
						: null
				});
			}
			if (hit && (!closest || hit.distance < closest.distance)) {
				closest = { distance: hit.distance, loaded, hit };
			}
		}
		if (!closest) {
			if (!import.meta.env.PROD) {
				console.info('[モデル pick] null: レイがメッシュに命中しませんでした');
			}
			return null;
		}
		if (this.isLowerDetailLod(closest.loaded)) {
			return { entryId: closest.loaded.entry.id, isLowerDetailLod: true };
		}
		return this.createPickedModelFeature(closest.loaded, closest.hit);
	};

	private isLowerDetailLod = (loaded: LoadedModel) => {
		if (
			!isMeshModelEntry(loaded.entry)
			|| loaded.entry.format.type !== 'gltf'
			|| !loaded.entry.format.lods?.length
		) {
			return false;
		}

		return isLowerDetailLodUrl(loaded.lod?.activeUrl, loaded.entry.format.url);
	};
}
