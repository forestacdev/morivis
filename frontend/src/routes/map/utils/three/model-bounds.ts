import { asset } from '$app/paths';
import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

import type { TileXYZ } from '$routes/map/data/types/raster';
import { findCenterTile } from '$routes/map/utils/map/tile';
import type { MeshStyle } from '$routes/map/data/types/model';
import { createMercatorModelMatrix } from '$routes/map/utils/three/model-transform';
import { normalizeObjectToLocalOrigin } from '$routes/map/utils/three/object-normalization';

interface ComputeUploadedModelMetaParams {
	file: File;
	format: 'gltf' | 'obj' | '3ds' | 'dae' | '3dm' | 'fbx' | 'drc' | '3mf' | 'amf' | 'ifc';
	style: Pick<MeshStyle, 'transform'>;
	resourceUrls?: Record<string, string>;
	normalizeToLocalOrigin?: boolean;
}

interface UploadedModelMeta {
	bounds: [number, number, number, number];
	xyzImageTile: TileXYZ;
	scaleMultiplier: number;
	localMaxDimension: number;
	hasSkinnedMesh: boolean;
	animationNames: string[];
}

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const MIN_MODEL_MAX_DIMENSION_METERS = 1;
const TARGET_MODEL_MAX_DIMENSION_METERS = 5;
const DRACO_DECODER_PATH = asset('/draco/gltf/');
const IFC_WASM_PATH = asset('/web-ifc/');
const RHINO3DM_LIBRARY_PATH = asset('/rhino3dm/');
const dracoLoader = new DRACOLoader();
let rhino3dmLoaderModulePromise: Promise<typeof import('three/addons/loaders/3DMLoader.js')> | null =
	null;
let ifcLoaderModulePromise: Promise<typeof import('web-ifc-three/IFCLoader.js')> | null = null;
let tdsLoaderModulePromise: Promise<typeof import('three/addons/loaders/TDSLoader.js')> | null = null;
let colladaLoaderModulePromise:
	| Promise<typeof import('three/addons/loaders/ColladaLoader.js')>
	| null = null;
let fbxLoaderModulePromise: Promise<typeof import('three/addons/loaders/FBXLoader.js')> | null = null;
let threeMfLoaderModulePromise:
	| Promise<typeof import('three/addons/loaders/3MFLoader.js')>
	| null = null;
let amfLoaderModulePromise: Promise<typeof import('three/addons/loaders/AMFLoader.js')> | null = null;

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

interface UploadedModelObject {
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
				resourceUrls[normalizedUrl] ??
				resourceUrls[relativeWithoutRoot] ??
				resourceUrls[fileName] ??
				url
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
				resourceUrls[normalizedUrl] ??
				resourceUrls[relativeWithoutRoot] ??
				resourceUrls[fileName] ??
				url
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
				resourceUrls[normalizedUrl] ??
				resourceUrls[relativeWithoutRoot] ??
				resourceUrls[fileName] ??
				url
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
	const { FBXLoader } = await loadFbxLoaderModule();
	const manager = new THREE.LoadingManager();
	if (resourceUrls) {
		manager.setURLModifier((url) => {
			const normalizedUrl = url.replace(/\\/g, '/').toLowerCase();
			const relativeWithoutRoot = normalizedUrl.split('/').slice(1).join('/');
			const fileName = normalizedUrl.split('/').pop() ?? '';
			return (
				resourceUrls[normalizedUrl] ??
				resourceUrls[relativeWithoutRoot] ??
				resourceUrls[fileName] ??
				url
			);
		});
	}

	const loader = new FBXLoader(manager);
	const url = URL.createObjectURL(file);
	if (!resourceUrls) {
		try {
			loader.setResourcePath(new URL('./', url).href);
		} catch {
			// blob URL などは基底パスを組めないので、そのまま読む。
		}
	}
	try {
		const object = await loader.loadAsync(url);
		if (normalizeToLocalOrigin) {
			normalizeObjectToLocalOrigin(object);
		}
		const animations = (object as THREE.Group & { animations?: THREE.AnimationClip[] }).animations ?? [];
		return {
			object,
			animationNames: animations.map((clip, index) => clip.name || `Animation ${index + 1}`)
		};
	} finally {
		URL.revokeObjectURL(url);
	}
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

const getUploadedModelObject = async (
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

export const computeUploadedModelMeta = async ({
	file,
	format,
	style,
	resourceUrls,
	normalizeToLocalOrigin
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
	let hasSkinnedMesh = false;
	object.traverse((child) => {
		if ((child as THREE.SkinnedMesh).isSkinnedMesh === true) {
			hasSkinnedMesh = true;
		}
	});
	const size = box.getSize(new THREE.Vector3());
	const localMaxDimension = Math.max(size.x, size.y, size.z);
	const scaleMultiplier =
		localMaxDimension > 1e-6 && localMaxDimension < MIN_MODEL_MAX_DIMENSION_METERS
			? TARGET_MODEL_MAX_DIMENSION_METERS / localMaxDimension
			: 1;

	const modelMatrix = createMercatorModelMatrix({
		type: 'mesh',
		opacity: 1,
		wireframe: false,
		color: '#ffffff',
		transform: {
			...style.transform,
			baseScale: (style.transform.baseScale ?? 1) * scaleMultiplier
		}
	});
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
		const world = corner.clone().applyMatrix4(modelMatrix);
		const lng = mercatorXToLng(world.x);
		const lat = mercatorYToLat(world.y);
		west = Math.min(west, lng);
		south = Math.min(south, lat);
		east = Math.max(east, lng);
		north = Math.max(north, lat);
	});

	const bounds: [number, number, number, number] = [west, south, east, north];
	return {
		bounds,
		xyzImageTile: findCenterTile(bounds),
		scaleMultiplier,
		localMaxDimension,
		hasSkinnedMesh,
		animationNames
	};
};
