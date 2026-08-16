import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

import type { MeshStyle, ProjectedModelGeoreference } from '$routes/map/data/types/model';
import type { TileXYZ } from '$routes/map/data/types/raster';
import { findCenterTile } from '$routes/map/utils/map/tile';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import {
	georeferenceCornerToLocal,
	getModelUnitScaleMeters,
	resolveProjectedModelPlacementFromBox,
	type ResolvedProjectedModelPlacement
} from '$routes/map/utils/three/model-georeference';
import { normalizeObjectToLocalOrigin } from '$routes/map/utils/three/object-normalization';

export interface ComputeUploadedModelMetaParams {
	file: File;
	format: 'gltf' | 'obj' | '3ds' | 'dae' | '3dm' | 'fbx' | 'drc' | '3mf' | 'amf' | 'ifc';
	style: Pick<MeshStyle, 'transform'>;
	resourceUrls?: Record<string, string>;
	normalizeToLocalOrigin?: boolean;
	georeference?: ProjectedModelGeoreference;
	projectedModelEpsg?: string;
	terrainEnabled?: boolean;
}

export interface UploadedModelMeta {
	bounds: [number, number, number, number];
	sourceBbox?: [number, number, number, number];
	xyzImageTile: TileXYZ;
	scaleMultiplier: number;
	localMaxDimension: number;
	hasSkinnedMesh: boolean;
	animationNames: string[];
	resolvedPlacement?: ResolvedProjectedModelPlacement;
}

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const MIN_MODEL_MAX_DIMENSION_METERS = 1;
const TARGET_MODEL_MAX_DIMENSION_METERS = 5;
const EARTH_CIRCUMFERENCE = 40075016.68557849;
const DRACO_DECODER_PATH = resolveStaticAssetPath('/draco/gltf/');
const IFC_WASM_PATH = resolveStaticAssetPath('/web-ifc/');
const RHINO3DM_LIBRARY_PATH = resolveStaticAssetPath('/rhino3dm/');
const dracoLoader = new DRACOLoader();
let rhino3dmLoaderModulePromise:
	| Promise<
		typeof import('three/addons/loaders/3DMLoader.js')
	>
	| null = null;
let ifcLoaderModulePromise: Promise<typeof import('web-ifc-three/IFCLoader.js')> | null = null;
let tdsLoaderModulePromise: Promise<typeof import('three/addons/loaders/TDSLoader.js')> | null =
	null;
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

dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
gltfLoader.setDRACOLoader(dracoLoader);

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

const loadTdsLoaderModule = async () => {
	if (!tdsLoaderModulePromise) {
		tdsLoaderModulePromise = import('three/addons/loaders/TDSLoader.js');
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

const ensureFbxLoaderWindowShim = () => {
	type ShimEventListener = (event?: Event) => void;
	type ShimImageElement = {
		addEventListener: (type: string, listener: ShimEventListener) => void;
		removeEventListener: (type: string, listener: ShimEventListener) => void;
		crossOrigin?: string;
		src: string;
	};
	type FbxLoaderDocumentShim = {
		createElementNS: (namespace: string, name: string) => unknown;
		createElement: (name: string) => unknown;
	};
	type FbxLoaderWindowShim = Window &
		typeof globalThis & {
			innerWidth?: number;
			innerHeight?: number;
			document?: FbxLoaderDocumentShim;
			URL?: typeof URL;
		};
	const globalScope = globalThis as typeof globalThis & {
		window?: FbxLoaderWindowShim;
		document?: FbxLoaderDocumentShim;
	};

	const createShimImageElement = (): ShimImageElement => {
		const listeners = new Map<string, Set<ShimEventListener>>();
		let currentSrc = '';
		const dispatch = (type: string) => {
			const handlers = listeners.get(type);
			if (!handlers) return;
			handlers.forEach((listener) => {
				listener.call(imageElement);
			});
		};
		const imageElement = {
			addEventListener: (type: string, listener: ShimEventListener) => {
				if (!listeners.has(type)) {
					listeners.set(type, new Set());
				}
				listeners.get(type)?.add(listener);
			},
			removeEventListener: (type: string, listener: ShimEventListener) => {
				listeners.get(type)?.delete(listener);
			},
			get src() {
				return currentSrc;
			},
			set src(value: string) {
				currentSrc = value;
				queueMicrotask(() => {
					dispatch('load');
				});
			}
		} satisfies ShimImageElement;
		return imageElement;
	};

	const existingWindow = globalScope.window;
	const existingDocument = globalScope.document ?? existingWindow?.document;
	const documentShim =
		existingDocument
		?? {
			createElementNS: (_namespace: string, name: string) => {
				if (name === 'img') {
					return createShimImageElement();
				}
				if (name === 'canvas') {
					return new OffscreenCanvas(1, 1);
				}
				return {};
			},
			createElement: (name: string) => {
				if (name === 'img') {
					return createShimImageElement();
				}
				if (name === 'canvas') {
					return new OffscreenCanvas(1, 1);
				}
				return {};
			}
		};

	const windowShim =
		existingWindow
		?? ({
			innerWidth: 1,
			innerHeight: 1,
			document: documentShim
		} as FbxLoaderWindowShim);

	if (windowShim.innerWidth == null) {
		try {
			windowShim.innerWidth = 1;
		} catch {
			// ブラウザ実体の readonly window には触れない。
		}
	}
	if (windowShim.innerHeight == null) {
		try {
			windowShim.innerHeight = 1;
		} catch {
			// ブラウザ実体の readonly window には触れない。
		}
	}
	if (!windowShim.document) {
		try {
			windowShim.document = documentShim;
		} catch {
			// getter-only な document を持つ実体 window では代入しない。
		}
	}
	if (!windowShim.URL && typeof URL !== 'undefined') {
		try {
			windowShim.URL = URL;
		} catch {
			// getter-only な window には代入しない。
		}
	}

	if (!existingDocument) {
		Object.defineProperty(globalScope, 'document', {
			value: documentShim,
			configurable: true,
			writable: true
		});
	}

	if (!existingWindow) {
		Object.defineProperty(globalScope, 'window', {
			value: windowShim,
			configurable: true,
			writable: true
		});
	}
};

export interface UploadedModelObject {
	object: THREE.Object3D;
	animationNames: string[];
}

const parseGltfObject = async (file: File): Promise<UploadedModelObject> => {
	const buffer = await file.arrayBuffer();

	return new Promise<UploadedModelObject>((resolve, reject) => {
		gltfLoader.parse(
			buffer,
			'',
			(gltf) => {
				resolve({
					object: gltf.scene,
					animationNames: gltf.animations.map(
						(clip, index) => clip.name || `Animation ${index + 1}`
					)
				});
			},
			(error) => {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		);
	});
};

const parseObjObject = async (file: File): Promise<UploadedModelObject> => {
	const text = await file.text();
	return {
		object: objLoader.parse(text),
		animationNames: []
	};
};

const parseTdsObject = async (
	file: File,
	resourceUrls?: Record<string, string>
): Promise<UploadedModelObject> => {
	const { TDSLoader } = await loadTdsLoaderModule();
	const manager = new THREE.LoadingManager();
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

	const loader = new TDSLoader(manager);
	const url = URL.createObjectURL(file);
	try {
		const object = await loader.loadAsync(url);
		return {
			object,
			animationNames: []
		};
	} finally {
		URL.revokeObjectURL(url);
	}
};

const parseDaeObject = async (
	file: File,
	resourceUrls?: Record<string, string>
): Promise<UploadedModelObject> => {
	const { ColladaLoader } = await loadColladaLoaderModule();
	const manager = new THREE.LoadingManager();
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

	const loader = new ColladaLoader(manager);
	const text = await file.text();
	const collada = loader.parse(text, '');
	return {
		object: collada.scene,
		animationNames: collada.scene.animations.map(
			(clip: THREE.AnimationClip, index: number) => clip.name || `Animation ${index + 1}`
		)
	};
};

const parse3dmObject = async (
	file: File,
	resourceUrls?: Record<string, string>
): Promise<UploadedModelObject> => {
	const { Rhino3dmLoader } = await loadRhino3dmLoaderModule();
	const manager = new THREE.LoadingManager();
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

	const loader = new Rhino3dmLoader(manager);
	loader.setLibraryPath(RHINO3DM_LIBRARY_PATH);
	const url = URL.createObjectURL(file);
	try {
		const object = await loader.loadAsync(url);
		return {
			object,
			animationNames: []
		};
	} finally {
		URL.revokeObjectURL(url);
	}
};

const parseFbxObject = async (
	file: File,
	resourceUrls?: Record<string, string>,
	normalizeToLocalOrigin = false
): Promise<UploadedModelObject> => {
	ensureFbxLoaderWindowShim();
	const { FBXLoader } = await loadFbxLoaderModule();
	const manager = new THREE.LoadingManager();
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

	const loader = new FBXLoader(manager);
	const buffer = await file.arrayBuffer();
	const object = loader.parse(buffer, '');
	if (normalizeToLocalOrigin) {
		normalizeObjectToLocalOrigin(object);
	}
	const animations =
		(object as THREE.Group & { animations?: THREE.AnimationClip[]; }).animations ?? [];
	return {
		object,
		animationNames: animations.map((clip, index) => clip.name || `Animation ${index + 1}`)
	};
};

const parseDrcObject = async (file: File): Promise<UploadedModelObject> => {
	const url = URL.createObjectURL(file);
	try {
		const geometry = await dracoLoader.loadAsync(url);
		if (!geometry.getAttribute('normal')) {
			geometry.computeVertexNormals();
		}
		return {
			object: new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffffff' })),
			animationNames: []
		};
	} finally {
		URL.revokeObjectURL(url);
	}
};

const parse3mfObject = async (file: File): Promise<UploadedModelObject> => {
	const { ThreeMFLoader } = await loadThreeMfLoaderModule();
	const loader = new ThreeMFLoader();
	const url = URL.createObjectURL(file);
	try {
		const object = await loader.loadAsync(url);
		return {
			object,
			animationNames: []
		};
	} finally {
		URL.revokeObjectURL(url);
	}
};

const parseAmfObject = async (file: File): Promise<UploadedModelObject> => {
	const { AMFLoader } = await loadAmfLoaderModule();
	const loader = new AMFLoader();
	const url = URL.createObjectURL(file);
	try {
		const object = await loader.loadAsync(url);
		return {
			object,
			animationNames: []
		};
	} finally {
		URL.revokeObjectURL(url);
	}
};

const parseIfcObject = async (
	file: File,
	normalizeToLocalOrigin = false
): Promise<UploadedModelObject> => {
	const { IFCLoader } = await loadIfcLoaderModule();
	const loader = new IFCLoader();
	await loader.ifcManager.setWasmPath(IFC_WASM_PATH);
	const url = URL.createObjectURL(file);
	try {
		const object = (await loader.loadAsync(url)) as THREE.Object3D;
		if (normalizeToLocalOrigin) {
			normalizeObjectToLocalOrigin(object);
		}
		return {
			object,
			animationNames: []
		};
	} finally {
		URL.revokeObjectURL(url);
	}
};

export const getUploadedModelObject = async (
	file: File,
	format: 'gltf' | 'obj' | '3ds' | 'dae' | '3dm' | 'fbx' | 'drc' | '3mf' | 'amf' | 'ifc',
	resourceUrls?: Record<string, string>,
	normalizeToLocalOrigin = false
) => {
	if (format === 'obj') {
		return parseObjObject(file);
	}

	if (format === '3ds') {
		return parseTdsObject(file, resourceUrls);
	}

	if (format === 'dae') {
		return parseDaeObject(file, resourceUrls);
	}

	if (format === '3dm') {
		return parse3dmObject(file, resourceUrls);
	}

	if (format === 'fbx') {
		return parseFbxObject(file, resourceUrls, normalizeToLocalOrigin);
	}

	if (format === 'drc') {
		return parseDrcObject(file);
	}

	if (format === '3mf') {
		return parse3mfObject(file);
	}

	if (format === 'amf') {
		return parseAmfObject(file);
	}

	if (format === 'ifc') {
		return parseIfcObject(file, normalizeToLocalOrigin);
	}

	return parseGltfObject(file);
};

const mercatorXToLng = (x: number) => x * 360 - 180;

const mercatorYToLat = (y: number) => {
	const n = Math.PI * (1 - 2 * y);
	return THREE.MathUtils.radToDeg(Math.atan(Math.sinh(n)));
};

const lngToMercatorX = (lng: number) => (lng + 180) / 360;

const latToMercatorY = (lat: number) =>
	(180
		- (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + THREE.MathUtils.degToRad(lat) / 2)))
	/ 360;

const meterInMercatorCoordinateUnits = (lat: number) =>
	1 / (EARTH_CIRCUMFERENCE * Math.cos(THREE.MathUtils.degToRad(lat)));

const createUploadedModelMercatorMatrix = (
	style: Pick<MeshStyle, 'transform'>,
	terrainEnabled = false
): THREE.Matrix4 => {
	const {
		lng,
		lat,
		altitude,
		heightOffset,
		heightScale,
		baseScale,
		baseRotationX,
		baseRotationY,
		baseRotationZ,
		scale,
		rotationX,
		rotationY,
		rotationZ
	} = style.transform;

	const effectiveAltitude = (terrainEnabled ? altitude : 0) + (heightOffset ?? 0);
	const mercatorScale = meterInMercatorCoordinateUnits(lat);
	const mercatorX = lngToMercatorX(lng);
	const mercatorY = latToMercatorY(lat);
	const mercatorZ = effectiveAltitude * mercatorScale;

	const rotationXMatrix = new THREE.Matrix4().makeRotationAxis(
		new THREE.Vector3(1, 0, 0),
		((baseRotationX ?? 0) + rotationX) * (Math.PI / 180)
	);
	const rotationYMatrix = new THREE.Matrix4().makeRotationAxis(
		new THREE.Vector3(0, 1, 0),
		((baseRotationY ?? 0) + rotationY) * (Math.PI / 180)
	);
	const rotationZMatrix = new THREE.Matrix4().makeRotationAxis(
		new THREE.Vector3(0, 0, 1),
		((baseRotationZ ?? 0) + rotationZ) * (Math.PI / 180)
	);
	const scaleMatrix = new THREE.Matrix4().makeScale(
		mercatorScale * (baseScale ?? 1) * scale,
		-mercatorScale * (baseScale ?? 1) * scale * (heightScale ?? 1),
		-mercatorScale * (baseScale ?? 1) * scale
	);

	return new THREE.Matrix4()
		.makeTranslation(mercatorX, mercatorY, mercatorZ)
		.multiply(rotationXMatrix)
		.multiply(rotationYMatrix)
		.multiply(rotationZMatrix)
		.multiply(scaleMatrix);
};

export const computeUploadedModelMeta = async ({
	file,
	format,
	style,
	resourceUrls,
	normalizeToLocalOrigin,
	georeference,
	projectedModelEpsg,
	terrainEnabled = false
}: ComputeUploadedModelMetaParams): Promise<UploadedModelMeta> => {
	const { object, animationNames } = await getUploadedModelObject(
		file,
		format,
		resourceUrls,
		normalizeToLocalOrigin
	);
	object.updateMatrixWorld(true);

	const box = new THREE.Box3().setFromObject(object);
	if (box.isEmpty()) {
		throw new Error('3Dモデルの範囲を取得できませんでした');
	}

	const formatUnitScaleMeters =
		format === 'fbx'
			? getModelUnitScaleMeters(
				Number(
					(object.userData as {
						unitScaleFactor?: number;
					}).unitScaleFactor
				)
			)
			: 1;
	const resolvedPlacement = projectedModelEpsg
		? resolveProjectedModelPlacementFromBox(
			box,
			projectedModelEpsg,
			formatUnitScaleMeters
		)
		: undefined;
	const resolvedGeoreference = georeference ?? resolvedPlacement?.georeference;

	let hasSkinnedMesh = false;
	object.traverse((child) => {
		if ((child as THREE.SkinnedMesh).isSkinnedMesh === true) {
			hasSkinnedMesh = true;
		}
	});
	const size = box.getSize(new THREE.Vector3());
	const unitScaleMeters = resolvedGeoreference?.unitScaleMeters ?? formatUnitScaleMeters;
	const localMaxDimension = Math.max(size.x, size.y, size.z) * unitScaleMeters;
	const scaleMultiplier =
		localMaxDimension > 1e-6 && localMaxDimension < MIN_MODEL_MAX_DIMENSION_METERS
			? TARGET_MODEL_MAX_DIMENSION_METERS / localMaxDimension
			: 1;
	const localRenderUnitScale = resolvedGeoreference ? 1 : formatUnitScaleMeters;

	const modelMatrix = createUploadedModelMercatorMatrix(
		{
			transform: {
				...style.transform,
				...(resolvedPlacement && {
					lng: resolvedPlacement.lng,
					lat: resolvedPlacement.lat,
					altitude: resolvedPlacement.altitude
				}),
				baseScale: (style.transform.baseScale ?? 1) * scaleMultiplier * localRenderUnitScale
			}
		},
		terrainEnabled
	);
	const corners = [
		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
		new THREE.Vector3(box.min.x, box.min.y, box.max.z),
		new THREE.Vector3(box.min.x, box.max.y, box.min.z),
		new THREE.Vector3(box.min.x, box.max.y, box.max.z),
		new THREE.Vector3(box.max.x, box.min.y, box.min.z),
		new THREE.Vector3(box.max.x, box.min.y, box.max.z),
		new THREE.Vector3(box.max.x, box.max.y, box.min.z),
		new THREE.Vector3(box.max.x, box.max.y, box.max.z)
	];

	let west = Number.POSITIVE_INFINITY;
	let south = Number.POSITIVE_INFINITY;
	let east = Number.NEGATIVE_INFINITY;
	let north = Number.NEGATIVE_INFINITY;

	corners.forEach((corner) => {
		const localCorner = resolvedGeoreference
			? georeferenceCornerToLocal(corner, resolvedGeoreference)
			: corner;
		const world = localCorner.applyMatrix4(modelMatrix);
		const lng = mercatorXToLng(world.x);
		const lat = mercatorYToLat(world.y);
		west = Math.min(west, lng);
		south = Math.min(south, lat);
		east = Math.max(east, lng);
		north = Math.max(north, lat);
	});

	const bounds: [number, number, number, number] = [west, south, east, north];
	const sourceBbox: [number, number, number, number] = [
		box.min.x * formatUnitScaleMeters,
		box.min.y * formatUnitScaleMeters,
		box.max.x * formatUnitScaleMeters,
		box.max.y * formatUnitScaleMeters
	];
	return {
		bounds,
		...(format === 'fbx' && { sourceBbox }),
		xyzImageTile: findCenterTile(bounds),
		scaleMultiplier,
		localMaxDimension,
		hasSkinnedMesh,
		animationNames,
		...(resolvedPlacement && { resolvedPlacement })
	};
};
