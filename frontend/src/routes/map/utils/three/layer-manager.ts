import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import { getAdjustableRangeDomain, getAdjustableRangeValue } from '$routes/map/data/types';
import {
	DEFAULT_MESH_SHADING,
	type GaussianSplatEntry,
	type GaussianSplatStyle,
	type IfcPartColorProfile,
	type MeshEntry,
	type MeshShadingStyle,
	type MeshStyle,
	type ModelLocalBounds,
	type ModelTransformStyle,
	type ThreeModelEntry
} from '$routes/map/data/types/model';
import type { ModelPartData } from '$routes/map/data/types/model';
import { parseGaussianSplatInWorker } from '$routes/map/utils/formats/gaussian-splat/gaussian-splat-parallel';
import { takeGaussianSplatData } from '$routes/map/utils/formats/gaussian-splat/cache';
import type { CustomLayerInterface, Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import { generateNumberAndColorMap } from '$routes/map/utils/style/color-mapping';
import {
	applyFbxCurveGeometricScaling,
	type FbxModelAttributes,
	parseFbxModelAttributes
} from '$routes/map/utils/three/fbx-attributes';
import { applyFbxTextureFallback } from '$routes/map/utils/three/fbx-textures';
import { configureIfcWasmPath } from '$routes/map/utils/three/ifc-wasm-path';
import {
	applyGaussianSplatStyle,
	createGaussianSplatObject
} from '$routes/map/utils/three/gaussian-splat-renderer';
import {
	getIfcAttributes,
	getModelObjectAttributes,
	type ModelAttributes
} from '$routes/map/utils/three/model-attributes';
import {
	calculateModelTransform,
	type ModelTransform
} from '$routes/map/utils/three/model-transform';
import { getModelViewAxisRotationX } from '$routes/map/utils/three/model-axis';
import {
	getInitialModelAnimationState,
	isEmbeddedModelAnimationClip,
	isVrmaModelAnimationClip,
	isVmdModelAnimationClip
} from '$routes/map/utils/three/model-animation';
import { centerObjectToLocalOrigin } from '$routes/map/utils/three/object-normalization';
import { loadPmxModel, type LoadedPmxModel } from '$routes/map/utils/three/pmx-loader';
import { finalizeRuntimeModelObject } from '$routes/map/utils/three/runtime-model-finalize';
import {
	createVrmLoader,
	getVrmFromGltf,
	loadVrmAnimationClip,
	rotateVrm0IfNeeded
} from '$routes/map/utils/three/vrm-loader';
import { buildVectorTileColorExpressions } from '$routes/map/utils/vector/tile-style';
import type { ThreeMmdAnimation } from '@yohawing/three-mmd-loader/three';
import type { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const DRACO_DECODER_PATH = resolveStaticAssetPath('/draco/gltf/');
const RHINO3DM_LIBRARY_PATH = resolveStaticAssetPath('/rhino3dm/');
const MODEL_VIEW_FPS_MOVEMENT_SPEED_DIVISOR = 5;
const MODEL_VIEW_FPS_MIN_MOVEMENT_SPEED = 1;
const MODEL_VIEW_INITIAL_CAMERA_DISTANCE_SCALE = 0.75;
const MMD_ANIMATION_FRAME_RATE = 30;
let rhino3dmLoaderModulePromise: Promise<
	typeof import('three/addons/loaders/3DMLoader.js')
> | null = null;
let ifcLoaderModulePromise: Promise<typeof import('web-ifc-three/IFCLoader.js')> | null = null;
let webIfcModulePromise: Promise<typeof import('web-ifc')> | null = null;
let tdsLoaderModulePromise: Promise<typeof import('three/addons/loaders/TDSLoader.js')> | null =
	null;
let colladaLoaderModulePromise: Promise<
	typeof import('three/addons/loaders/ColladaLoader.js')
> | null = null;
let fbxLoaderModulePromise: Promise<typeof import('three/addons/loaders/FBXLoader.js')> | null =
	null;
let threeMfLoaderModulePromise: Promise<typeof import('three/addons/loaders/3MFLoader.js')> | null =
	null;
let amfLoaderModulePromise: Promise<typeof import('three/addons/loaders/AMFLoader.js')> | null =
	null;

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
		resourceUrls[normalizedUrl] ??
		resourceUrls[relativeWithoutRoot] ??
		resourceUrls[fileName] ??
		url
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

const loadWebIfcModule = async () => {
	if (!webIfcModulePromise) {
		webIfcModulePromise = import('web-ifc');
	}
	return webIfcModulePromise;
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

interface LoadedModel {
	entry: ThreeModelEntry;
	object: THREE.Object3D;
	transform: ModelTransform;
	mixer?: THREE.AnimationMixer;
	actions?: THREE.AnimationAction[];
	lastClipIndex?: number;
	lastAnimationLoop?: boolean;
	lastAnimationPlaying?: boolean;
	mmd?: {
		model: LoadedPmxModel;
		animations: Map<number, ThreeMmdAnimation>;
		activeClipIndex?: number;
		loadingClipIndex?: number;
		elapsedSeconds: number;
		durationSeconds?: number;
		lastPlaying?: boolean;
	};
	vrm?: VRM;
	vrmAnimation?: {
		mixer: THREE.AnimationMixer;
		clips: Map<number, THREE.AnimationClip>;
		actions: Map<number, THREE.AnimationAction>;
		activeClipIndex?: number;
		activeAction?: THREE.AnimationAction;
		loadingClipIndex?: number;
		lastLoop?: boolean;
		lastPlaying?: boolean;
	};
	resolveAttributes?: (hit: THREE.Intersection<THREE.Object3D>) => Promise<ModelAttributes>;
}

const isMeshModelEntry = (entry: ThreeModelEntry): entry is MeshEntry<MeshStyle> =>
	entry.style.type === 'mesh';

const isGaussianSplatEntry = (entry: ThreeModelEntry): entry is GaussianSplatEntry =>
	entry.style.type === 'gaussian-splat';

const getMmdAnimationDurationSeconds = (animation: ThreeMmdAnimation) => {
	const maxFrame = animation.animation.kind === 'vmd' ? animation.animation.metadata.maxFrame : 0;
	return maxFrame > 0 ? maxFrame / MMD_ANIMATION_FRAME_RATE : undefined;
};

// 範囲を未保存の既存entryだけは、従来の仮ボックスと同じZ-upの形状を使う。
const DEFAULT_PLACEMENT_PREVIEW_BOUNDS: ModelLocalBounds = [-10, -10, 0, 10, 10, 12];

const getPlacementPreviewBounds = (entry: ThreeModelEntry): ModelLocalBounds =>
	entry.format.localBounds ?? DEFAULT_PLACEMENT_PREVIEW_BOUNDS;

const getPlacementPreviewBoundsKey = (bounds: ModelLocalBounds) => bounds.join(':');

const createPlacementPreviewObject = (bounds: ModelLocalBounds) => {
	const [minX, minY, minZ, maxX, maxY, maxZ] = bounds;
	const width = Math.max(maxX - minX, 0.01);
	const height = Math.max(maxY - minY, 0.01);
	const depth = Math.max(maxZ - minZ, 0.01);
	const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
	const object = new THREE.Group();
	const geometry = new THREE.BoxGeometry(width, height, depth);
	const surface = new THREE.Mesh(
		geometry,
		new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.18 })
	);
	surface.position.copy(center);
	const edges = new THREE.LineSegments(
		new THREE.EdgesGeometry(geometry),
		new THREE.LineBasicMaterial({ color: 0xfef3c7 })
	);
	edges.position.copy(center);
	object.add(surface, edges);
	return object;
};

export interface PickedModelFeature {
	entryId: string;
	objectId: string;
	objectName: string;
	propId?: string;
	attributes: ModelAttributes;
	part?: ModelPartData;
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
	movementSpeed: number;
	getTarget: () => THREE.Vector3;
	resetView: () => void;
	resize: () => void;
}

interface ActiveModelView {
	entryIds: Set<string>;
	camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
	target: THREE.Vector3;
	highlightVisibility: Map<THREE.Object3D, boolean>;
	axisWrappers: Array<{
		object: THREE.Object3D;
		parent: THREE.Object3D;
		wrapper: THREE.Group;
	}>;
	modelGroupVisible: boolean;
	previewVisible: boolean;
}

const TEXTURE_SLOT_KEYS = [
	'map',
	'alphaMap',
	'aoMap',
	'bumpMap',
	'displacementMap',
	'emissiveMap',
	'envMap',
	'lightMap',
	'metalnessMap',
	'normalMap',
	'roughnessMap',
	'specularMap'
] as const;

const CLICKABLE_MODEL_FORMATS = new Set<MeshEntry<MeshStyle>['format']['type']>([
	'fbx',
	'obj',
	'gltf',
	'vrm',
	'3ds',
	'dae',
	'3dm',
	'drc',
	'3mf',
	'amf',
	'ifc',
	'pmx'
]);
const IFC_ATTRIBUTE_BATCH_SIZE = 32;

const getIfcPartColorProfile = (entry: MeshEntry<MeshStyle>): IfcPartColorProfile | undefined =>
	entry.properties?.ifc?.extractionProfiles.find(
		(profile): profile is IfcPartColorProfile => profile.type === 'part-colors'
	);

const materialHasTextureSlots = (material: THREE.Material) => {
	return TEXTURE_SLOT_KEYS.some((key) => {
		const candidate = (material as THREE.Material & Record<string, unknown>)[key];
		return candidate instanceof THREE.Texture;
	});
};

const getTextureSlot = (material: THREE.Material, key: string) => {
	const candidate = (material as THREE.Material & Record<string, unknown>)[key];
	return candidate instanceof THREE.Texture ? candidate : null;
};

/**
 * Three.js レイヤーマネージャー
 * scene/camera/renderer は一度だけ初期化し、モデルの追加/削除のみを行う
 */
export class ThreeJsLayerManager {
	private camera: THREE.Camera | null = null;
	private scene: THREE.Scene | null = null;
	private modelGroup: THREE.Group | null = null;
	private previewModelGroup: THREE.Group | null = null;
	private renderer: THREE.WebGLRenderer | null = null;
	private overlayRenderTarget: THREE.WebGLRenderTarget | null = null;
	private overlayScene: THREE.Scene | null = null;
	private overlayCamera: THREE.OrthographicCamera | null = null;
	private map: MapLibreMap | null = null;
	private loadedModels: Map<string, LoadedModel> = new Map();
	private dracoLoader = new DRACOLoader();
	private loader = new GLTFLoader();
	private isInitialized = false;
	private colorMapManager = new ColorMapManager();
	private lastRenderTimeMs: number | null = null;
	private repaintBurstHandle: number | null = null;
	private lastMapProjectionMatrix: THREE.Matrix4 | null = null;
	private selectedModelHighlights: ModelHighlight[] = [];
	private ifcPartAttributeLoads = new Map<string, Promise<number>>();
	private activeModelView: ActiveModelView | null = null;
	private placementPreview: {
		object: THREE.Group;
		transform: ModelTransform;
		boundsKey: string;
	} | null = null;

	constructor() {
		this.dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
		this.loader.setDRACOLoader(this.dracoLoader);
	}

	private createGltfLoader = (manager?: THREE.LoadingManager) => {
		const loader = new GLTFLoader(manager);
		loader.setDRACOLoader(this.dracoLoader);
		return loader;
	};

	private resolveShading = (style: MeshStyle): Required<MeshShadingStyle> => ({
		...DEFAULT_MESH_SHADING,
		...style.shading
	});

	private getLightDirection = (shading: Required<MeshShadingStyle>) => {
		const azimuth = THREE.MathUtils.degToRad(shading.azimuthDeg);
		const elevation = THREE.MathUtils.degToRad(shading.elevationDeg);
		const cosElevation = Math.cos(elevation);

		return new THREE.Vector3(
			Math.cos(azimuth) * cosElevation,
			Math.sin(elevation),
			Math.sin(azimuth) * cosElevation
		).normalize();
	};

	private createShaderMaterial = (
		sourceMaterial: THREE.Material,
		style: MeshStyle
	): THREE.ShaderMaterial => {
		const shading = this.resolveShading(style);
		const shadingEnabled = Boolean(style.shading?.enabled);
		const baseColor = new THREE.Color(style.color);
		if ('color' in sourceMaterial && sourceMaterial.color instanceof THREE.Color) {
			baseColor.multiply(sourceMaterial.color);
		}

		const map =
			'map' in sourceMaterial && sourceMaterial.map instanceof THREE.Texture
				? sourceMaterial.map
				: null;
		const colorRamp = style.heightColorRamp;
		const [colorRampMin, colorRampMax] = getAdjustableRangeValue(
			colorRamp?.range,
			colorRamp?.min,
			colorRamp?.max,
			0,
			1
		);
		const [colorRampSourceMin, colorRampSourceMax] = getAdjustableRangeDomain(
			colorRamp?.range,
			colorRamp?.sourceMin ?? colorRamp?.min,
			colorRamp?.sourceMax ?? colorRamp?.max,
			0,
			1
		);
		const colorRampArray = colorRamp?.enabled
			? this.colorMapManager.createColorArray(colorRamp.colorMap)
			: null;
		const colorRampRgbaArray =
			colorRampArray != null
				? new Uint8Array(
						Array.from({ length: 256 * 4 }, (_, i) => {
							const colorIndex = Math.floor(i / 4);
							const channel = i % 4;
							if (channel === 3) return 255;
							return colorRampArray[colorIndex * 3 + channel] ?? 0;
						})
					)
				: null;
		const colorRampTexture =
			colorRamp?.enabled && colorRampMax > colorRampMin
				? new THREE.DataTexture(
						colorRampRgbaArray,
						1,
						256,
						THREE.RGBAFormat,
						THREE.UnsignedByteType
					)
				: null;
		const partColorTexture = this.createPartColorTexture(style);
		if (colorRampTexture) {
			colorRampTexture.colorSpace = THREE.SRGBColorSpace;
			colorRampTexture.minFilter = THREE.LinearFilter;
			colorRampTexture.magFilter = THREE.LinearFilter;
			colorRampTexture.wrapS = THREE.ClampToEdgeWrapping;
			colorRampTexture.wrapT = THREE.ClampToEdgeWrapping;
			colorRampTexture.generateMipmaps = false;
			colorRampTexture.flipY = false;
			colorRampTexture.unpackAlignment = 1;
			colorRampTexture.needsUpdate = true;
		}

		const material = new THREE.ShaderMaterial({
			uniforms: {
				uBaseColor: { value: baseColor },
				uOpacity: { value: style.opacity },
				uAmbientStrength: { value: shadingEnabled ? shading.ambientStrength : 1 },
				uShadeStrength: { value: shadingEnabled ? shading.shadeStrength : 0 },
				uLightDirection: { value: this.getLightDirection(shading) },
				uMap: { value: map },
				uUseMap: { value: Boolean(map) },
				uColorRamp: { value: colorRampTexture },
				uUseHeightColorRamp: { value: Boolean(colorRampTexture) },
				uUsePartColors: { value: Boolean(style.partColors?.show) },
				uPartColorPalette: { value: partColorTexture },
				uPartColorPaletteSize: { value: partColorTexture?.image.width ?? 1 },
				uHeightRampMin: { value: colorRampMin },
				uHeightRampMax: { value: colorRampMax },
				uHeightRampSourceMin: { value: colorRampSourceMin },
				uHeightRampSourceMax: { value: colorRampSourceMax }
			},
			vertexShader: `
				attribute float morivisPartColorIndex;
				varying vec3 vNormal;
				varying vec2 vUv;
				varying float vPartColorIndex;
				#include <skinning_pars_vertex>

				void main() {
					vec3 objectNormal = vec3(normal);
					#include <skinbase_vertex>
					#include <skinnormal_vertex>
					vNormal = normalize(normalMatrix * objectNormal);
					vec3 transformed = vec3(position);
					#include <skinning_vertex>
					vUv = uv;
					vPartColorIndex = morivisPartColorIndex;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
				}
			`,
			fragmentShader: `
				uniform vec3 uBaseColor;
				uniform float uOpacity;
				uniform float uAmbientStrength;
				uniform float uShadeStrength;
				uniform vec3 uLightDirection;
				uniform sampler2D uMap;
				uniform bool uUseMap;
				uniform sampler2D uColorRamp;
				uniform bool uUseHeightColorRamp;
				uniform bool uUsePartColors;
				uniform sampler2D uPartColorPalette;
				uniform float uPartColorPaletteSize;
				uniform float uHeightRampMin;
				uniform float uHeightRampMax;
				uniform float uHeightRampSourceMin;
				uniform float uHeightRampSourceMax;

				varying vec3 vNormal;
				varying vec2 vUv;
				varying float vPartColorIndex;

				void main() {
					vec4 texel = uUseMap ? texture2D(uMap, vUv) : vec4(1.0);
					float sourceDenominator = max(uHeightRampSourceMax - uHeightRampSourceMin, 0.000001);
					float selectedMin = clamp(
						(uHeightRampMin - uHeightRampSourceMin) / sourceDenominator,
						0.0,
						1.0
					);
					float selectedMax = clamp(
						(uHeightRampMax - uHeightRampSourceMin) / sourceDenominator,
						0.0,
						1.0
					);
					float rampDenominator = max(selectedMax - selectedMin, 0.000001);
					float rampValue = clamp((vUv.y - selectedMin) / rampDenominator, 0.0, 1.0);
					vec3 rampColor = texture2D(uColorRamp, vec2(0.5, rampValue)).rgb;
					vec3 partColor = texture2D(
						uPartColorPalette,
						vec2((vPartColorIndex + 0.5) / uPartColorPaletteSize, 0.5)
					).rgb;
					vec3 surfaceColor = uUsePartColors
						? partColor
						: (uUseHeightColorRamp ? rampColor : (uBaseColor * texel.rgb));
					vec3 normalDir = normalize(vNormal);
					float diffuse = max(dot(normalDir, normalize(uLightDirection)), 0.0);
					float shade = clamp(uAmbientStrength + diffuse * uShadeStrength, 0.0, 1.0);
					vec3 shadedColor = surfaceColor * shade;
					float alpha = texel.a * uOpacity;

					if (alpha <= 0.001) discard;

					gl_FragColor = vec4(shadedColor, alpha);
				}
			`,
			transparent: true,
			wireframe: style.wireframe,
			side: THREE.DoubleSide
		});
		material.userData.morivisShaderShading = true;
		material.userData.colorRampTexture = colorRampTexture;
		material.userData.morivisPartColorPalette = partColorTexture;
		return material;
	};

	private getPartPaletteColors = (style: MeshStyle) => {
		const expression = style.partColors?.expressions.find(
			(candidate) => candidate.key === style.partColors?.key
		);
		if (!expression) return [style.color];
		if (expression.type === 'match') {
			return [expression.noData?.value ?? style.color, ...expression.mapping.values];
		}
		if (expression.type === 'step') {
			return [style.color, ...generateNumberAndColorMap(expression.mapping).values];
		}
		return [style.color];
	};

	private createPartColorTexture = (style: MeshStyle) => {
		if (!style.partColors?.show) return null;
		const colors = this.getPartPaletteColors(style);
		const data = new Uint8Array(colors.length * 4);
		colors.forEach((color, index) => {
			const value = new THREE.Color(color);
			data.set([value.r * 255, value.g * 255, value.b * 255, 255], index * 4);
		});
		const texture = new THREE.DataTexture(data, colors.length, 1, THREE.RGBAFormat);
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.minFilter = THREE.NearestFilter;
		texture.magFilter = THREE.NearestFilter;
		texture.generateMipmaps = false;
		texture.needsUpdate = true;
		return texture;
	};

	private updatePartColorPalette = (material: THREE.Material, style: MeshStyle) => {
		if (!(material instanceof THREE.ShaderMaterial)) return false;
		const texture = material.userData.morivisPartColorPalette;
		if (!(texture instanceof THREE.DataTexture)) return false;
		const colors = this.getPartPaletteColors(style);
		if (texture.image.width !== colors.length) return false;
		const data = texture.image.data as Uint8Array;
		colors.forEach((color, index) => {
			const value = new THREE.Color(color);
			data.set([value.r * 255, value.g * 255, value.b * 255, 255], index * 4);
		});
		texture.needsUpdate = true;
		material.uniforms.uOpacity.value = style.opacity;
		material.uniforms.uUsePartColors.value = Boolean(style.partColors?.show);
		material.wireframe = style.wireframe;
		return true;
	};

	private createFlatMaterial = (
		sourceMaterial: THREE.Material,
		style: MeshStyle
	): THREE.Material => {
		const baseColor = new THREE.Color(style.color);
		if ('color' in sourceMaterial && sourceMaterial.color instanceof THREE.Color) {
			baseColor.multiply(sourceMaterial.color);
		}

		const map =
			'map' in sourceMaterial && sourceMaterial.map instanceof THREE.Texture
				? sourceMaterial.map
				: null;

		const material = new THREE.MeshBasicMaterial({
			color: baseColor,
			map,
			transparent: true,
			opacity: style.opacity,
			wireframe: style.wireframe,
			side: THREE.DoubleSide
		});
		material.transparent = true;
		material.opacity = style.opacity;
		return material;
	};

	private createFbxTexturedMaterial = (
		sourceMaterial: THREE.Material,
		style: MeshStyle
	): THREE.Material => {
		const map =
			getTextureSlot(sourceMaterial, 'map') ?? getTextureSlot(sourceMaterial, 'emissiveMap');
		const alphaMap = getTextureSlot(sourceMaterial, 'alphaMap');

		const material = new THREE.MeshBasicMaterial({
			color: new THREE.Color(style.color),
			map,
			alphaMap,
			transparent:
				style.opacity < 1 ||
				alphaMap != null ||
				('transparent' in sourceMaterial && sourceMaterial.transparent === true),
			opacity: style.opacity,
			wireframe: style.wireframe,
			side: THREE.DoubleSide
		});

		if ('alphaTest' in sourceMaterial && typeof sourceMaterial.alphaTest === 'number') {
			material.alphaTest = sourceMaterial.alphaTest;
		}

		return material;
	};

	private createStyledSourceMaterial = (
		sourceMaterial: THREE.Material,
		style: MeshStyle
	): THREE.Material => {
		if (typeof sourceMaterial.clone !== 'function') {
			return this.createFlatMaterial(new THREE.MeshBasicMaterial(), style);
		}
		const material = sourceMaterial.clone();
		if ('color' in material && material.color instanceof THREE.Color) {
			material.color = material.color.clone().multiply(new THREE.Color(style.color));
		}
		material.opacity *= style.opacity;
		material.transparent = material.transparent || material.opacity < 1;
		if ('wireframe' in material) {
			material.wireframe = style.wireframe;
		}
		return material;
	};

	private applyStyleToMesh = (
		mesh: THREE.Mesh,
		style: MeshStyle,
		formatType?: MeshEntry<MeshStyle>['format']['type']
	) => {
		const currentMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
		const originalMaterials =
			(mesh.userData.originalMaterials as THREE.Material[] | undefined) ??
			currentMaterials.map((material) =>
				typeof material.clone === 'function' ? material.clone() : new THREE.MeshBasicMaterial()
			);

		if (!mesh.userData.originalMaterials) {
			mesh.userData.originalMaterials = originalMaterials;
		}

		const useShaderMaterial =
			Boolean(style.shading?.enabled) || Boolean(style.heightColorRamp?.enabled);
		const usePartColorMaterial =
			Boolean(style.partColors?.show) &&
			mesh.geometry.getAttribute('morivisPartColorIndex') != null;
		if (
			usePartColorMaterial &&
			currentMaterials.every((material) => this.updatePartColorPalette(material, style))
		) {
			return;
		}
		const isSkinnedMesh = (mesh as THREE.SkinnedMesh).isSkinnedMesh === true;
		const hasTexturedMaterial = originalMaterials.some(materialHasTextureSlots);
		const createMaterial = (sourceMaterial: THREE.Material) => {
			if (usePartColorMaterial || useShaderMaterial) {
				return this.createShaderMaterial(sourceMaterial, style);
			}
			// スキニング済みメッシュはローダーが作った材質を保ち、ボーン変形を引き継ぐ。
			if (isSkinnedMesh) {
				return this.createStyledSourceMaterial(sourceMaterial, style);
			}
			// VRM の MToon はテクスチャ未使用でも独自の透過・輪郭設定を持つため、そのまま複製する。
			if (formatType === 'vrm') {
				return this.createStyledSourceMaterial(sourceMaterial, style);
			}
			// FBX などの既存テクスチャは UV 変換や追加スロットを持つので、元マテリアルを保持する。
			if (hasTexturedMaterial && formatType === 'fbx') {
				return this.createFbxTexturedMaterial(sourceMaterial, style);
			}
			if (hasTexturedMaterial) {
				return this.createStyledSourceMaterial(sourceMaterial, style);
			}
			return this.createFlatMaterial(sourceMaterial, style);
		};

		const nextMaterials = originalMaterials.map(createMaterial);

		mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
		currentMaterials.forEach((material) => {
			const colorRampTexture = material.userData?.colorRampTexture;
			if (colorRampTexture instanceof THREE.Texture) {
				colorRampTexture.dispose();
			}
			if (typeof material.dispose === 'function') material.dispose();
		});
	};

	private applyStyleToObject = (
		object: THREE.Object3D,
		style: MeshStyle,
		formatType?: MeshEntry<MeshStyle>['format']['type']
	) => {
		object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh && !child.userData.morivisSelectionHighlight) {
				this.applyStyleToMesh(child as THREE.Mesh, style, formatType);
			}
		});
		this.map?.triggerRepaint();
	};

	private applyIfcPartColors = async (object: THREE.Object3D, style: MeshStyle) => {
		const ifcModel = object as THREE.Object3D & {
			modelID?: number;
			ifcManager?: {
				getIfcType: (modelId: number, expressId: number) => string | Promise<string>;
			} | null;
		};
		if (ifcModel.modelID == null || !ifcModel.ifcManager) return;
		style.partColors ??= { key: 'IFC クラス', show: false, expressions: [] };
		if (!style.partColors.show) return;

		const expressIds = new Set<number>();
		object.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh) return;
			const attribute = (child as THREE.Mesh).geometry.getAttribute('expressID');
			for (let index = 0; attribute && index < attribute.count; index += 1) {
				expressIds.add(attribute.getX(index));
			}
		});
		const cachedClasses = object.userData.morivisIfcClasses as Map<number, string> | undefined;
		const classesByExpressId = cachedClasses ?? new Map<number, string>();
		if (!cachedClasses) {
			const ids = Array.from(expressIds);
			for (let offset = 0; offset < ids.length; offset += IFC_ATTRIBUTE_BATCH_SIZE) {
				const results = await Promise.allSettled(
					ids.slice(offset, offset + IFC_ATTRIBUTE_BATCH_SIZE).map(async (expressId) => {
						return {
							expressId,
							ifcType: await ifcModel.ifcManager!.getIfcType(ifcModel.modelID!, expressId)
						};
					})
				);
				results.forEach((result) => {
					if (result.status !== 'fulfilled') return;
					classesByExpressId.set(result.value.expressId, result.value.ifcType);
				});
			}
			object.userData.morivisIfcClasses = classesByExpressId;
		}
		if (style.partColors.expressions.length === 0) {
			const expressions = buildVectorTileColorExpressions({
				id: 'ifc-parts',
				fields: {},
				attributes: [
					{
						attribute: 'IFC クラス',
						values: Array.from(new Set(classesByExpressId.values()))
					}
				]
			});
			if (expressions.length > 0) {
				style.partColors.key = expressions[0].key;
				style.partColors.expressions = expressions;
			}
		}
		const partColors = style.partColors;
		if (!partColors?.show) return;

		object.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh) return;
			const mesh = child as THREE.Mesh;
			const expressIdAttribute = mesh.geometry.getAttribute('expressID');
			if (!expressIdAttribute) return;
			const expression = partColors.expressions.find(
				(candidate) => candidate.key === partColors.key
			);
			if (!expression || expression.type !== 'match') return;
			const categoryIndexes = new Map(
				expression.mapping.categories.map((category, index) => [category, index + 1])
			);
			const signature = `${expression.key}\u0000${expression.mapping.categories.join('\u0000')}`;
			if (mesh.geometry.userData.morivisPartColorSignature === signature) return;
			const colorIndexes = new Float32Array(expressIdAttribute.count);
			for (let index = 0; index < expressIdAttribute.count; index += 1) {
				const partAttributes = object.userData.morivisIfcPartAttributes as
					| Map<number, ModelAttributes>
					| undefined;
				const value =
					expression.key === 'IFC クラス'
						? classesByExpressId.get(expressIdAttribute.getX(index))
						: partAttributes?.get(expressIdAttribute.getX(index))?.[expression.key];
				colorIndexes[index] =
					categoryIndexes.get(typeof value === 'boolean' ? String(value) : (value ?? '')) ?? 0;
			}
			mesh.geometry.setAttribute(
				'morivisPartColorIndex',
				new THREE.BufferAttribute(colorIndexes, 1)
			);
			mesh.geometry.userData.morivisPartColorSignature = signature;
		});
	};

	clearModelHighlight(): void {
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
	}

	/** BCF が保持する IFC GlobalId から、読み込み済みIFCの対象部材をハイライトする。 */
	async highlightIfcGlobalId(globalId: string): Promise<string | null> {
		const entryIds = await this.highlightIfcGlobalIds([globalId]);
		return entryIds[0] ?? null;
	}

	/** BCFの選択部材をまとめてハイライトする。 */
	async highlightIfcGlobalIds(globalIds: string[]): Promise<string[]> {
		const requestedIds = new Set(globalIds.map((globalId) => globalId.trim()).filter(Boolean));
		if (requestedIds.size === 0) return [];

		const targets: { entryId: string; mesh: THREE.Mesh; expressId: number }[] = [];
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
	}

	private getIfcGlobalIdIndex = async (loaded: LoadedModel) => {
		const model = loaded.object as THREE.Object3D & {
			modelID?: number;
			ifcManager?: {
				getItemProperties: (modelId: number, expressId: number) => Promise<Record<string, unknown>>;
			} | null;
		};
		const cached = model.userData.morivisIfcGlobalIdIndex as
			| Map<string, { expressId: number; mesh: THREE.Mesh }>
			| undefined;
		if (cached) return cached;

		const index = new Map<string, { expressId: number; mesh: THREE.Mesh }>();
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
					const item = await model.ifcManager!.getItemProperties(model.modelID!, expressId);
					const globalIdValue = item.GlobalId;
					const globalId =
						globalIdValue && typeof globalIdValue === 'object' && 'value' in globalIdValue
							? globalIdValue.value
							: globalIdValue;
					const mesh = meshesByExpressId.get(expressId);
					return typeof globalId === 'string' && mesh ? { globalId, expressId, mesh } : null;
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
			if ((child as THREE.Mesh).isMesh && !child.userData.morivisSelectionHighlight) {
				partMeshes.push(child as THREE.Mesh);
			}
		});
		return partMeshes.length > 0 ? partMeshes : [mesh];
	};

	private highlightModelMeshes = (meshes: THREE.Mesh[], expressId?: number) => {
		if (
			this.selectedModelHighlights.length === meshes.length &&
			this.selectedModelHighlights.every(
				(highlight, index) => highlight.mesh === meshes[index] && highlight.expressId === expressId
			)
		) {
			return;
		}
		this.clearModelHighlight();
		meshes.forEach((mesh) => this.addModelHighlight(mesh, expressId));
		this.map?.triggerRepaint();
	};

	private addModelHighlight = (mesh: THREE.Mesh, expressId?: number) => {
		const geometry =
			expressId == null
				? mesh.geometry
				: (this.getIfcHighlightGeometry(mesh, expressId) ?? mesh.geometry);

		const fillMaterial = new THREE.MeshBasicMaterial({
			color: HIGHLIGHT_LAYER_COLOR,
			transparent: true,
			opacity: 0.38,
			side: THREE.DoubleSide,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1
		});
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
			const meshMaterial = (object as THREE.Mesh).material as THREE.Material | THREE.Material[];
			const materials = Array.isArray(meshMaterial) ? meshMaterial : [meshMaterial];
			const materialName = materials.find((material) => material.name)?.name;
			if (materialName) return materialName;
		}

		return '名称なし';
	};

	private getFbxAttributeObject = (object: THREE.Object3D) => {
		let current: THREE.Object3D | null = object;
		while (current) {
			const attributes = current.userData.morivisFbxAttributes as FbxModelAttributes | undefined;
			if (attributes) return { object: current, attributes };
			current = current.parent;
		}
		return { object, attributes: undefined };
	};

	private getIfcExpressId = (
		model: THREE.Object3D,
		hit: THREE.Intersection<THREE.Object3D>
	): number | undefined => {
		const ifcModel = model as THREE.Object3D & {
			ifcManager?: {
				getExpressId: (geometry: THREE.BufferGeometry, faceIndex: number) => number;
			} | null;
		};
		const mesh = hit.object as THREE.Mesh;
		if (!ifcModel.ifcManager || !mesh.geometry || hit.faceIndex == null) return undefined;
		return ifcModel.ifcManager.getExpressId(mesh.geometry, hit.faceIndex);
	};

	private resolveIfcAttributes = async (
		model: THREE.Object3D,
		hit: THREE.Intersection<THREE.Object3D>
	): Promise<ModelAttributes> => {
		const ifcModel = model as THREE.Object3D & {
			modelID?: number;
			ifcManager?: {
				getItemProperties: (modelId: number, expressId: number) => Promise<Record<string, unknown>>;
				getPropertySets: (
					modelId: number,
					expressId: number,
					recursive?: boolean
				) => Promise<Record<string, unknown>[]>;
				getTypeProperties: (
					modelId: number,
					expressId: number,
					recursive?: boolean
				) => Promise<Record<string, unknown>[]>;
				getIfcType: (modelId: number, expressId: number) => string | Promise<string>;
			} | null;
		};
		const expressId = this.getIfcExpressId(model, hit);
		if (ifcModel.modelID == null || expressId == null || !ifcModel.ifcManager) return {};
		const cachedAttributes = (
			model.userData.morivisIfcPartAttributes as Map<number, ModelAttributes> | undefined
		)?.get(expressId);
		const [itemResult, propertySetsResult, typePropertiesResult, ifcTypeResult] =
			await Promise.allSettled([
				ifcModel.ifcManager.getItemProperties(ifcModel.modelID, expressId),
				ifcModel.ifcManager.getPropertySets(ifcModel.modelID, expressId, true),
				ifcModel.ifcManager.getTypeProperties(ifcModel.modelID, expressId, true),
				ifcModel.ifcManager.getIfcType(ifcModel.modelID, expressId)
			]);
		const item = itemResult.status === 'fulfilled' ? itemResult.value : {};
		const propertySets = propertySetsResult.status === 'fulfilled' ? propertySetsResult.value : [];
		const typeProperties =
			typePropertiesResult.status === 'fulfilled' ? typePropertiesResult.value : [];
		const ifcType = ifcTypeResult.status === 'fulfilled' ? ifcTypeResult.value : undefined;
		if (!import.meta.env.PROD) {
			const failed = [itemResult, propertySetsResult, typePropertiesResult, ifcTypeResult].filter(
				(result) => result.status === 'rejected'
			);
			if (failed.length > 0) {
				console.warn('[IFC属性] 一部の属性取得に失敗しました', {
					expressId,
					failedCount: failed.length,
					errors: failed.map((result) => String((result as PromiseRejectedResult).reason))
				});
			}
		}
		return {
			...cachedAttributes,
			...getIfcAttributes(expressId, item, [...propertySets, ...typeProperties]),
			...(ifcType ? { 'IFC クラス': ifcType } : {})
		};
	};

	private requestRepaintBurst = (frameCount = 90) => {
		if (typeof window === 'undefined') {
			this.map?.triggerRepaint();
			return;
		}

		if (this.repaintBurstHandle != null) {
			window.cancelAnimationFrame(this.repaintBurstHandle);
			this.repaintBurstHandle = null;
		}

		let remaining = frameCount;
		const tick = () => {
			this.map?.triggerRepaint();
			remaining -= 1;
			if (remaining > 0) {
				this.repaintBurstHandle = window.requestAnimationFrame(tick);
				return;
			}
			this.repaintBurstHandle = null;
		};

		tick();
	};

	private syncAnimationState = (loaded: LoadedModel) => {
		this.syncMmdAnimationState(loaded);
		this.syncVrmAnimationState(loaded);
		if (!loaded.mixer || !loaded.actions || loaded.actions.length === 0) return;

		const animationState = loaded.entry.state?.animation;
		const clips = loaded.entry.properties?.animation?.clips;
		const selectedClip = clips?.[
			Math.min(Math.max(animationState?.currentClipIndex ?? 0, 0), Math.max(clips.length - 1, 0))
		];
		if (!isEmbeddedModelAnimationClip(selectedClip)) {
			loaded.actions.forEach((action) => action.stop());
			return;
		}
		const clipIndex = Math.min(
			Math.max(animationState?.currentClipIndex ?? 0, 0),
			loaded.actions.length - 1
		);
		const speed = Math.max(animationState?.speed ?? 1, 0);
		const playing = animationState?.playing ?? false;
		const loop = animationState?.loop ?? true;

		loaded.actions.forEach((action, index) => {
			if (index === clipIndex) {
				if (
					loaded.lastClipIndex !== clipIndex ||
					loaded.lastAnimationLoop !== loop ||
					(!loaded.lastAnimationPlaying && playing)
				) {
					action.reset();
				}
				action.enabled = true;
				action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
				action.clampWhenFinished = !loop;
				action.timeScale = speed;
				action.paused = !playing;
				action.play();
				return;
			}

			action.stop();
		});

		loaded.lastClipIndex = clipIndex;
		loaded.lastAnimationLoop = loop;
		loaded.lastAnimationPlaying = playing;
		if (playing) {
			this.map?.triggerRepaint();
		}
	};

	private syncVrmAnimationState = (loaded: LoadedModel) => {
		const vrm = loaded.vrm;
		const animationState = loaded.entry.state?.animation;
		const clips = loaded.entry.properties?.animation?.clips;
		if (!vrm || !animationState || !clips?.length) return;

		const clipIndex = Math.min(Math.max(animationState.currentClipIndex, 0), clips.length - 1);
		const clip = clips[clipIndex];
		const vrmAnimation = loaded.vrmAnimation;
		if (!clip || !isVrmaModelAnimationClip(clip)) {
			if (vrmAnimation) {
				vrmAnimation.activeAction?.stop();
				vrmAnimation.activeAction = undefined;
				vrmAnimation.activeClipIndex = undefined;
				vrmAnimation.lastPlaying = false;
			}
			return;
		}

		const runtime =
			vrmAnimation ?? {
				mixer: new THREE.AnimationMixer(vrm.scene),
				clips: new Map<number, THREE.AnimationClip>(),
				actions: new Map<number, THREE.AnimationAction>()
			};
		if (!vrmAnimation) loaded.vrmAnimation = runtime;

		const configureAction = (action: THREE.AnimationAction, reset: boolean) => {
			const loop = animationState.loop ?? true;
			if (reset) action.reset();
			action.enabled = true;
			action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
			action.clampWhenFinished = !loop;
			action.timeScale = Math.max(animationState.speed, 0);
			action.paused = !animationState.playing;
			action.play();
			runtime.activeClipIndex = clipIndex;
			runtime.activeAction = action;
			runtime.lastLoop = loop;
			runtime.lastPlaying = animationState.playing;
			if (animationState.playing) this.map?.triggerRepaint();
		};

		const cachedAction = runtime.actions.get(clipIndex);
		if (cachedAction) {
			const shouldReset =
				runtime.activeClipIndex !== clipIndex ||
				runtime.lastLoop !== animationState.loop ||
				(!runtime.lastPlaying && animationState.playing);
			if (runtime.activeAction && runtime.activeAction !== cachedAction) {
				runtime.activeAction.stop();
			}
			configureAction(cachedAction, shouldReset);
			return;
		}

		if (runtime.loadingClipIndex === clipIndex) return;
		runtime.loadingClipIndex = clipIndex;
		void loadVrmAnimationClip(clip.url, vrm)
			.then((animationClip) => {
				if (
					runtime.loadingClipIndex !== clipIndex ||
					this.loadedModels.get(loaded.entry.id) !== loaded ||
					loaded.entry.state?.animation?.currentClipIndex !== clipIndex
				) {
					return;
				}

				const action = runtime.mixer.clipAction(animationClip);
				runtime.clips.set(clipIndex, animationClip);
				runtime.actions.set(clipIndex, action);
				runtime.loadingClipIndex = undefined;
				if (runtime.activeAction && runtime.activeAction !== action) {
					runtime.activeAction.stop();
				}
				configureAction(action, true);
			})
			.catch((error) => {
				if (runtime.loadingClipIndex !== clipIndex) return;
				runtime.loadingClipIndex = undefined;
				console.error(`VRMAモーションの読み込みに失敗しました: ${clip.name}`, error);
			});
	};

	private syncMmdAnimationState = (loaded: LoadedModel) => {
		const mmd = loaded.mmd;
		const animationState = loaded.entry.state?.animation;
		const clips = loaded.entry.properties?.animation?.clips;
		if (!mmd || !animationState || !clips?.length) return;

		const clipIndex = Math.min(Math.max(animationState.currentClipIndex, 0), clips.length - 1);
		const clip = clips[clipIndex];
		if (!clip || !isVmdModelAnimationClip(clip)) return;
		if (mmd.activeClipIndex === clipIndex || mmd.loadingClipIndex === clipIndex) {
			if (!mmd.lastPlaying && animationState.playing && animationState.loop === false) {
				mmd.elapsedSeconds = 0;
			}
			mmd.lastPlaying = animationState.playing;
			return;
		}
		const cachedAnimation = mmd.animations.get(clipIndex);
		if (cachedAnimation) {
			mmd.model.model.setAnimation(cachedAnimation);
			mmd.activeClipIndex = clipIndex;
			mmd.elapsedSeconds = 0;
			mmd.durationSeconds = getMmdAnimationDurationSeconds(cachedAnimation);
			mmd.lastPlaying = animationState.playing;
			if (animationState.playing) {
				this.map?.triggerRepaint();
			}
			return;
		}

		mmd.loadingClipIndex = clipIndex;
		void mmd.model.loader
			.loadAnimation(clip.url)
			.then((animation) => {
				if (
					mmd.loadingClipIndex !== clipIndex ||
					this.loadedModels.get(loaded.entry.id) !== loaded ||
					loaded.entry.state?.animation?.currentClipIndex !== clipIndex
				) {
					return;
				}

				mmd.model.model.setAnimation(animation);
				mmd.animations.set(clipIndex, animation);
				mmd.activeClipIndex = clipIndex;
				mmd.loadingClipIndex = undefined;
				mmd.elapsedSeconds = 0;
				mmd.durationSeconds = getMmdAnimationDurationSeconds(animation);
				mmd.lastPlaying = loaded.entry.state?.animation?.playing;
				if (loaded.entry.state?.animation?.playing) {
					this.map?.triggerRepaint();
				}
			})
			.catch((error) => {
				if (mmd.loadingClipIndex !== clipIndex) return;
				mmd.loadingClipIndex = undefined;
				console.error(`MMDモーションの読み込みに失敗しました: ${clip.name}`, error);
			});
	};

	private createGlbExportMaterial = (
		material: THREE.Material,
		style: MeshStyle
	): THREE.Material => {
		if (material instanceof THREE.ShaderMaterial) {
			const baseColor =
				material.uniforms.uBaseColor?.value instanceof THREE.Color
					? material.uniforms.uBaseColor.value.clone()
					: new THREE.Color(style.color);
			const map =
				material.uniforms.uMap?.value instanceof THREE.Texture
					? material.uniforms.uMap.value
					: null;
			const opacity =
				typeof material.uniforms.uOpacity?.value === 'number'
					? material.uniforms.uOpacity.value
					: style.opacity;

			return new THREE.MeshStandardMaterial({
				color: baseColor,
				map,
				transparent: opacity < 1,
				opacity,
				side: THREE.DoubleSide
			});
		}

		const clonedMaterial = material.clone();
		clonedMaterial.side = THREE.DoubleSide;
		clonedMaterial.transparent = clonedMaterial.transparent || clonedMaterial.opacity < 1;
		if ('wireframe' in clonedMaterial) {
			clonedMaterial.wireframe = false;
		}
		return clonedMaterial;
	};

	private prepareGlbExportObject = (
		loaded: LoadedModel & { entry: MeshEntry<MeshStyle> }
	): (() => void) => {
		const originalPosition = loaded.object.position.clone();
		const originalMaterials: Array<{
			mesh: THREE.Mesh;
			material: THREE.Material | THREE.Material[];
		}> = [];
		const exportMaterials: THREE.Material[] = [];

		loaded.object.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh) return;

			const mesh = child as THREE.Mesh;
			originalMaterials.push({ mesh, material: mesh.material });
			const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
			const convertedMaterials = materials.map((material) =>
				this.createGlbExportMaterial(material, loaded.entry.style)
			);
			exportMaterials.push(...convertedMaterials);
			mesh.material = Array.isArray(mesh.material) ? convertedMaterials : convertedMaterials[0];
		});
		centerObjectToLocalOrigin(loaded.object);
		loaded.object.updateMatrixWorld(true);

		return () => {
			originalMaterials.forEach(({ mesh, material }) => {
				mesh.material = material;
			});
			exportMaterials.forEach((material) => material.dispose());
			loaded.object.position.copy(originalPosition);
			loaded.object.updateMatrixWorld(true);
		};
	};

	private setOnlyEntryVisible = (
		entryId: string,
		visible: boolean,
		targetObject?: THREE.Object3D
	) => {
		const applyVisibility = (group: THREE.Group | null) => {
			if (!group) return;
			group.traverse((child) => {
				if (child.userData.entryId) {
					child.visible = targetObject
						? child === targetObject && visible
						: child.userData.entryId === entryId && visible;
				}
			});
		};

		applyVisibility(this.modelGroup);
		applyVisibility(this.previewModelGroup);
	};

	private restoreModelDepthState = (object: THREE.Object3D) => {
		object.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh) return;

			const mesh = child as THREE.Mesh;
			const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
			materials.forEach((material) => {
				const originalDepthState = material.userData.morivisDepthState as
					| { depthTest: boolean; depthWrite: boolean }
					| undefined;
				if (!originalDepthState) return;

				material.depthTest = originalDepthState.depthTest;
				material.depthWrite = originalDepthState.depthWrite;
				delete material.userData.morivisDepthState;
			});
		});
	};

	private renderOverlayModel = (loaded: LoadedModel, mapProjectionMatrix: THREE.Matrix4) => {
		if (!this.renderer || !this.scene || !this.camera || !this.overlayRenderTarget) return;
		if (!this.overlayScene || !this.overlayCamera) return;

		const renderTargetSize = this.renderer.getDrawingBufferSize(new THREE.Vector2());
		if (
			this.overlayRenderTarget.width !== renderTargetSize.x ||
			this.overlayRenderTarget.height !== renderTargetSize.y
		) {
			this.overlayRenderTarget.setSize(renderTargetSize.x, renderTargetSize.y);
		}

		this.restoreModelDepthState(loaded.object);
		this.camera.projectionMatrix = mapProjectionMatrix.clone().multiply(loaded.transform.matrix);
		this.setOnlyEntryVisible(
			loaded.entry.id,
			loaded.entry.style.visible ?? true,
			loaded.object
		);

		this.renderer.resetState();
		this.renderer.setRenderTarget(this.overlayRenderTarget);
		this.renderer.clear();
		this.renderer.render(this.scene, this.camera);

		this.renderer.resetState();
		this.renderer.setRenderTarget(null);
		this.renderer.render(this.overlayScene, this.overlayCamera);
	};

	setPlacementPreview(entry: ThreeModelEntry, style = entry.style): void {
		if (!this.scene) return;
		const bounds = getPlacementPreviewBounds(entry);
		const boundsKey = getPlacementPreviewBoundsKey(bounds);
		if (!this.placementPreview || this.placementPreview.boundsKey !== boundsKey) {
			if (this.placementPreview) {
				this.scene.remove(this.placementPreview.object);
				this.disposePlacementPreviewObject(this.placementPreview.object);
			}
			const object = createPlacementPreviewObject(bounds);
			this.scene.add(object);
			this.placementPreview = {
				object,
				transform: calculateModelTransform(style),
				boundsKey
			};
		} else {
			this.placementPreview.transform = calculateModelTransform(style);
		}
		this.map?.triggerRepaint();
	}

	private disposePlacementPreviewObject = (object: THREE.Group) => {
		object.traverse((child) => {
			if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
			const material = (child as THREE.Mesh).material;
			if (Array.isArray(material)) material.forEach((item) => item.dispose());
			else material?.dispose();
		});
	};

	clearPlacementPreview(): void {
		if (!this.placementPreview) return;
		this.scene?.remove(this.placementPreview.object);
		this.disposePlacementPreviewObject(this.placementPreview.object);
		this.placementPreview = null;
		this.map?.triggerRepaint();
	}

	private updateAnimations = () => {
		const nowMs = performance.now();
		const deltaSeconds =
			this.lastRenderTimeMs == null ? 0 : Math.max((nowMs - this.lastRenderTimeMs) / 1000, 0);
		this.lastRenderTimeMs = nowMs;
		let hasPlayingAnimation = false;

		this.loadedModels.forEach((loaded) => {
			const animationState = loaded.entry.state?.animation;
			const clips = loaded.entry.properties?.animation?.clips;
			const selectedClip = clips?.[
				Math.min(
					Math.max(animationState?.currentClipIndex ?? 0, 0),
					Math.max((clips?.length ?? 0) - 1, 0)
				)
			];
			const isPlayingEmbeddedAnimation =
				animationState?.playing && isEmbeddedModelAnimationClip(selectedClip);

			if (isPlayingEmbeddedAnimation && loaded.mixer) {
				loaded.mixer.update(deltaSeconds);
				hasPlayingAnimation = true;
			}
			if (animationState?.playing && loaded.vrmAnimation?.activeClipIndex != null) {
				loaded.vrmAnimation.mixer.update(deltaSeconds);
				hasPlayingAnimation = true;
			}
			if (
				animationState?.playing &&
				loaded.vrm &&
				(isPlayingEmbeddedAnimation || loaded.vrmAnimation?.activeClipIndex != null)
			) {
				loaded.vrm.update(deltaSeconds);
				hasPlayingAnimation = true;
			}
			if (loaded.entry.state?.animation?.playing && loaded.mmd?.activeClipIndex != null) {
				const animation = loaded.entry.state.animation;
				const speed = Math.max(animation.speed, 0);
				const durationSeconds = loaded.mmd.durationSeconds;
				const loop = animation.loop ?? true;
				loaded.mmd.elapsedSeconds += deltaSeconds * speed;
				if (durationSeconds) {
					loaded.mmd.elapsedSeconds = loop
						? loaded.mmd.elapsedSeconds % durationSeconds
						: Math.min(loaded.mmd.elapsedSeconds, durationSeconds);
				}
				loaded.mmd.model.model.update(loaded.mmd.elapsedSeconds);
				hasPlayingAnimation = true;
			}
		});

		return hasPlayingAnimation;
	};

	private renderActiveModelView = () => {
		if (!this.scene || !this.renderer || !this.activeModelView) return;

		const setViewVisibility = (group: THREE.Group | null) => {
			if (!group) return;
			group.traverse((child) => {
				const entryId = child.userData.entryId as string | undefined;
				if (!entryId) return;
				const loaded = this.loadedModels.get(entryId);
				child.visible =
					loaded?.object === child &&
					this.activeModelView!.entryIds.has(entryId) &&
					(loaded.entry.style.visible ?? true);
			});
		};
		setViewVisibility(this.modelGroup);
		setViewVisibility(this.previewModelGroup);
		this.renderer.resetState();
		this.renderer.setRenderTarget(null);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.clear(true, true, true);
		this.renderer.render(this.scene, this.activeModelView.camera);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.resetState();
	};

	/** カスタムレイヤーを作成（初期化用） */
	createLayer(): CustomLayerInterface {
		return {
			id: '3d-model-layer',
			type: 'custom',
			renderingMode: '3d',

			onAdd: (map, gl) => {
				this.map = map;
				if (!this.isInitialized) {
					this.camera = new THREE.Camera();
					this.scene = new THREE.Scene();
					this.modelGroup = new THREE.Group();
					this.previewModelGroup = new THREE.Group();
					this.scene.add(this.modelGroup);
					this.scene.add(this.previewModelGroup);

					this.renderer = new THREE.WebGLRenderer({
						canvas: map.getCanvas(),
						context: gl,
						antialias: true
					});
					this.renderer.autoClear = false;
					this.renderer.setClearColor(0x000000, 0);
					this.renderer.outputColorSpace = THREE.SRGBColorSpace;
					this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
					this.renderer.toneMappingExposure = 1.0;
					this.overlayRenderTarget = new THREE.WebGLRenderTarget(1, 1, {
						depthBuffer: true,
						stencilBuffer: false
					});
					this.overlayScene = new THREE.Scene();
					this.overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
					const overlayMaterial = new THREE.MeshBasicMaterial({
						map: this.overlayRenderTarget.texture,
						transparent: true,
						depthTest: false,
						depthWrite: false,
						toneMapped: false
					});
					this.overlayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), overlayMaterial));

					// 全体を均一に明るくしすぎず、空と地面からの回り込みだけを薄く入れる。
					const hemiLight = new THREE.HemisphereLight(0xeef3fb, 0x5a6470, 0.45);
					this.scene.add(hemiLight);

					// 主光源は少し高い位置から当てて、地形や建物の面変化を読みやすくする。
					const keyLight = new THREE.DirectionalLight(0xfff6e8, 1.5);
					keyLight.position.set(1.4, 2.2, 1.1);
					this.scene.add(keyLight);

					// 反対側は弱い補助光だけにして、陰影を潰さない。
					const fillLight = new THREE.DirectionalLight(0xdbe7f6, 0.22);
					fillLight.position.set(-1.2, 1.1, -0.9);
					this.scene.add(fillLight);

					this.isInitialized = true;
				}
			},

			render: (_gl, args) => {
				if (!this.scene || !this.camera || !this.renderer) return;
				if (this.loadedModels.size === 0 && !this.placementPreview) return;
				if (this.placementPreview) this.placementPreview.object.visible = false;
				this.lastMapProjectionMatrix = new THREE.Matrix4().fromArray(
					args.defaultProjectionData.mainMatrix
				);
				const mapProjectionMatrix = this.lastMapProjectionMatrix;
				const hasPlayingAnimation = this.updateAnimations();
				if (this.activeModelView) {
					this.renderActiveModelView();
					if (hasPlayingAnimation) this.map?.triggerRepaint();
					return;
				}

				if (this.placementPreview) {
					this.setOnlyEntryVisible('', false);
					this.placementPreview.object.visible = true;
					this.camera.projectionMatrix = mapProjectionMatrix
						.clone()
						.multiply(this.placementPreview.transform.matrix);
					this.renderer.resetState();
					this.renderer.render(this.scene, this.camera);
				}

				this.loadedModels.forEach((loaded) => {
					if (isMeshModelEntry(loaded.entry) && loaded.entry.style.showThroughTerrain) return;
					if (isGaussianSplatEntry(loaded.entry)) {
						applyGaussianSplatStyle(
							loaded.object,
							loaded.entry.style,
							this.map?.getCanvas().clientHeight
						);
					}
					this.restoreModelDepthState(loaded.object);

					const modelMatrix = loaded.transform.matrix.clone();
					const projectionMatrix = mapProjectionMatrix.clone();
					this.camera!.projectionMatrix = projectionMatrix.multiply(modelMatrix);

					this.setOnlyEntryVisible(
						loaded.entry.id,
						loaded.entry.style.visible ?? true,
						loaded.object
					);

					this.renderer!.resetState();
					this.renderer!.render(this.scene!, this.camera!);
				});

				this.loadedModels.forEach((loaded) => {
					if (!isMeshModelEntry(loaded.entry) || !loaded.entry.style.showThroughTerrain) return;
					this.renderOverlayModel(loaded, mapProjectionMatrix);
				});

				if (hasPlayingAnimation) {
					this.map?.triggerRepaint();
				}
			},

			onRemove: () => {
				this.clearAllModels();
			}
		};
	}

	/** モデルを追加。プレビューに同じIDのモデルがあれば再利用する */
	addModel(entry: ThreeModelEntry, _type: 'main' | 'preview' = 'main'): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.modelGroup || !this.previewModelGroup) {
				reject(new Error('modelGroup not initialized'));
				return;
			}

			const transform = calculateModelTransform(entry.style);

			if (_type === 'main') {
				const existing = this.loadedModels.get(entry.id);
				if (existing && existing.object.parent === this.previewModelGroup) {
					this.previewModelGroup.remove(existing.object);
					this.modelGroup.add(existing.object);
					existing.transform = transform;
					resolve();
					return;
				}
			}

			const existing = this.loadedModels.get(entry.id);
			if (existing) {
				const isInPreview = existing.object.parent === this.previewModelGroup;
				const isInMain = existing.object.parent === this.modelGroup;
				if ((_type === 'preview' && isInPreview) || (_type === 'main' && isInMain)) {
					this.removeModel(entry.id);
				}
			}

			const onModelLoaded = async (
				model: THREE.Group | THREE.Object3D,
				animations: THREE.AnimationClip[] = [],
				resolveAttributes?: (hit: THREE.Intersection<THREE.Object3D>) => Promise<ModelAttributes>,
				mmdModel?: LoadedPmxModel,
				vrm?: VRM
			) => {
				if (isMeshModelEntry(entry)) {
					if (entry.format.type === 'ifc') {
						await this.applyIfcPartColors(model, entry.style);
					}
					this.applyStyleToObject(model, entry.style, entry.format.type);
				} else {
					applyGaussianSplatStyle(model, entry.style, this.map?.getCanvas().clientHeight);
				}

				model.visible = entry.style.visible ?? true;
				model.userData.entryId = entry.id;
				const loaded: LoadedModel = {
					entry,
					object: model,
					transform,
					...(mmdModel && {
						mmd: {
							model: mmdModel,
							animations: new Map(),
							elapsedSeconds: 0
						}
					}),
					...(vrm && { vrm }),
					resolveAttributes
				};
				if (animations.length > 0) {
					loaded.mixer = new THREE.AnimationMixer(model);
					loaded.actions = animations.map((clip) => loaded.mixer!.clipAction(clip));
				}
				if (isMeshModelEntry(entry) && !loaded.entry.state?.animation) {
					const animationState = getInitialModelAnimationState(entry.properties?.animation);
					if (animationState) {
						loaded.entry.state = {
							...loaded.entry.state,
							animation: animationState
						};
					}
				}
				this.loadedModels.set(entry.id, loaded);
				this.syncAnimationState(loaded);
				if (_type === 'preview') {
					this.previewModelGroup!.add(model);
				} else {
					this.modelGroup!.add(model);
				}
				if (
					isMeshModelEntry(entry) &&
					entry.format.type === 'ifc' &&
					entry.properties?.ifc?.extractionProfiles.length
				) {
					void this.preloadIfcProfiles(entry).catch((error) => {
						console.error('IFC事前定義属性の読み込みに失敗しました', error);
					});
				}
				this.requestRepaintBurst(
					isMeshModelEntry(entry) && (entry.format.type === 'fbx' || entry.format.type === 'pmx')
						? 180
						: 30
				);
				resolve();
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
								`3D Gaussian Splatting PLYを取得できません: ${response.status} ${response.statusText}`
							);
						}
						return await parseGaussianSplatInWorker(await response.arrayBuffer());
					})
					.then((data) => onModelLoaded(createGaussianSplatObject(data, entry.style)))
					.catch((error) => reject(error instanceof Error ? error : new Error(String(error))));
				return;
			}

			const finalizeLoadedModel = (object: THREE.Object3D) => {
				finalizeRuntimeModelObject(object, {
					formatType: entry.format.type,
					georeference: entry.format.georeference,
					normalizeToLocalOrigin: entry.format.normalizeToLocalOrigin
				});
			};

			const finalizeAndLoadModel = (
				object: THREE.Object3D,
				animations: THREE.AnimationClip[] = [],
				resolveAttributes?: (hit: THREE.Intersection<THREE.Object3D>) => Promise<ModelAttributes>,
				mmdModel?: LoadedPmxModel,
				vrm?: VRM
			) => {
				finalizeLoadedModel(object);
				vrm?.update(0);
				void onModelLoaded(object, animations, resolveAttributes, mmdModel, vrm).catch((error) =>
					reject(error instanceof Error ? error : new Error(String(error)))
				);
			};

			const createManagedLoaderContext = () => {
				const manager = new THREE.LoadingManager();
				manager.onLoad = () => {
					this.requestRepaintBurst(180);
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
							resourceUrls[normalizedUrl] ??
							resourceUrls[relativeWithoutRoot] ??
							resourceUrls[fileName] ??
							url
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
							resourceUrls[normalizedUrl] ??
							resourceUrls[relativeWithoutRoot] ??
							resourceUrls[fileName] ??
							url
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
							resourceUrls[normalizedUrl] ??
							resourceUrls[relativeWithoutRoot] ??
							resourceUrls[fileName] ??
							url
						);
					});
				}
				loadColladaLoaderModule()
					.then(({ ColladaLoader }) => {
						const colladaLoader = new ColladaLoader(manager);
						colladaLoader.load(
							entry.format.url,
							(collada) => finalizeAndLoadModel(collada.scene, collada.scene.animations),
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
							resourceUrls[normalizedUrl] ??
							resourceUrls[relativeWithoutRoot] ??
							resourceUrls[fileName] ??
							url
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
			} else if (entry.format.type === 'fbx') {
				const manager = createManagedLoaderContext();
				const resourceUrls = entry.format.resourceUrls;
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
							throw new Error(`Failed to fetch FBX: ${response.status} ${response.statusText}`);
						}

						const buffer = await response.arrayBuffer();
						const object = fbxLoader.parse(buffer, resourcePath);
						const fallbackTextureResult = applyFbxTextureFallback(object, resourceUrls);
						const attributesByModelId = parseFbxModelAttributes(buffer);
						const geometricScalingCurveCount = applyFbxCurveGeometricScaling(
							object,
							attributesByModelId
						);
						let modelIdCount = 0;
						let matchedAttributeCount = 0;
						object.traverse((child) => {
							const modelId = (child as THREE.Object3D & { ID?: number }).ID;
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
								geometricScalingCurveCount,
								fallbackTextureMaterialCount: fallbackTextureResult.mappedMaterialCount,
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
				const resourceUrls = entry.format.resourceUrls;
				if (!resourceUrls) {
					this.loader.load(
						entry.format.url,
						(gltf) => finalizeAndLoadModel(gltf.scene, gltf.animations),
						undefined,
						(error) => reject(error)
					);
				} else {
					const manager = createManagedLoaderContext();
					manager.setURLModifier((url) => resolveResourceUrl(resourceUrls, url));
					const loader = this.createGltfLoader(manager);

					fetch(entry.format.url)
						.then(async (response) => {
							if (!response.ok) {
								throw new Error(`Failed to fetch glTF: ${response.status} ${response.statusText}`);
							}

							const buffer = await response.arrayBuffer();
							const data = isBinaryGltfBuffer(buffer) ? buffer : new TextDecoder().decode(buffer);

							loader.parse(
								data,
								'',
								(gltf) => finalizeAndLoadModel(gltf.scene, gltf.animations),
								(error) => reject(error instanceof Error ? error : new Error(String(error)))
							);
						})
						.catch((error) => reject(error));
				}
			} else if (entry.format.type === 'vrm') {
				const manager = createManagedLoaderContext();
				createVrmLoader(this.dracoLoader, manager)
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
											reject(error instanceof Error ? error : new Error(String(error)))
										);
								} catch (error) {
									reject(error instanceof Error ? error : new Error(String(error)));
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
							new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffffff' }))
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
			} else if (entry.format.type === 'ifc') {
				loadIfcLoaderModule()
					.then(({ IFCLoader }) => {
						const loader = new IFCLoader();
						return configureIfcWasmPath(loader.ifcManager).then(() => {
							loader.load(
								entry.format.url,
								(object) =>
									finalizeAndLoadModel(object, [], (hit) => this.resolveIfcAttributes(object, hit)),
								undefined,
								(error) => reject(error)
							);
						});
					})
					.catch((error) => reject(error));
			} else if (entry.format.type === 'pmx') {
				loadPmxModel(entry.format.url, entry.format.resourceUrls)
					.then((mmdModel) => finalizeAndLoadModel(mmdModel.model.root, [], undefined, mmdModel))
					.catch((error) => reject(error));
			}
		});
	}

	/** 複数のモデルを追加 */
	async addModels(entries: ThreeModelEntry[]): Promise<void> {
		await Promise.all(entries.map((entry) => this.addModel(entry)));
	}

	updateTransform(entries: ThreeModelEntry[]): void {
		entries.forEach((entry) => {
			const loaded = this.loadedModels.get(entry.id);
			if (!loaded) return;

			const transform = calculateModelTransform(entry.style);
			loaded.transform = transform;
			loaded.entry = entry;
			this.syncAnimationState(loaded);
		});
	}

	/** モデルを削除 */
	removeModel(entryId: string): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		if (
			this.selectedModelHighlights.some(
				(highlight) => loaded.object.getObjectById(highlight.mesh.id) === highlight.mesh
			)
		) {
			this.clearModelHighlight();
		}

		loaded.object.parent?.remove(loaded.object);
		loaded.object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh || (child as THREE.Points).isPoints) {
				const drawable = child as THREE.Mesh | THREE.Points;
				drawable.geometry.dispose();
				const materials = Array.isArray(drawable.material)
					? drawable.material
					: [drawable.material];
				materials.forEach((mat) => mat.dispose());
				const originalMaterials = drawable.userData.originalMaterials as
					| THREE.Material[]
					| undefined;
				originalMaterials?.forEach((material) => material.dispose());
			}
		});

		this.loadedModels.delete(entryId);
	}

	/** すべてのモデルを削除 */
	clearAllModels(): void {
		this.loadedModels.forEach((_, entryId) => {
			this.removeModel(entryId);
		});
	}

	/** モデルを入れ替え（既存をすべて削除して新しいモデルを追加） */
	async replaceModels(entries: ThreeModelEntry[]): Promise<void> {
		this.clearAllModels();
		await this.addModels(entries);
	}

	/** モデルの表示/非表示を切り替え */
	setModelVisibility(entryId: string, visible: boolean): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.entry = {
			...loaded.entry,
			style: { ...loaded.entry.style, visible }
		} as ThreeModelEntry;
		loaded.object.visible = visible;
	}

	/** モデルの不透明度を変更 */
	setModelOpacity(entryId: string, opacity: MeshStyle['opacity']): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.entry = {
			...loaded.entry,
			style: { ...loaded.entry.style, opacity }
		} as ThreeModelEntry;
		if (isMeshModelEntry(loaded.entry)) {
			this.applyStyleToObject(loaded.object, loaded.entry.style, loaded.entry.format.type);
		} else {
			applyGaussianSplatStyle(
				loaded.object,
				loaded.entry.style,
				this.map?.getCanvas().clientHeight
			);
		}
		this.syncAnimationState(loaded);
	}

	setModelWireframe(entryId: string, wireframe: boolean): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded || !isMeshModelEntry(loaded.entry)) return;
		loaded.entry = { ...loaded.entry, style: { ...loaded.entry.style, wireframe } };
		this.applyStyleToObject(loaded.object, loaded.entry.style, loaded.entry.format.type);
		this.syncAnimationState(loaded);
	}

	setModelColor(entryId: string, color: string): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded || !isMeshModelEntry(loaded.entry)) return;
		loaded.entry = { ...loaded.entry, style: { ...loaded.entry.style, color } };
		this.applyStyleToObject(loaded.object, loaded.entry.style, loaded.entry.format.type);
		this.syncAnimationState(loaded);
	}

	async setModelPartColors(entry: MeshEntry<MeshStyle>): Promise<void> {
		const loaded = this.loadedModels.get(entry.id);
		if (!loaded) return;
		loaded.entry = entry;
		if (entry.format.type === 'ifc') {
			await this.applyIfcPartColors(loaded.object, entry.style);
		}
		this.applyStyleToObject(loaded.object, entry.style, entry.format.type);
	}

	async loadIfcPartColorAttributes(entry: MeshEntry<MeshStyle>): Promise<number> {
		const pending = this.ifcPartAttributeLoads.get(entry.id);
		if (pending) return pending;
		const load = this.loadIfcPartColorAttributesInternal(entry);
		this.ifcPartAttributeLoads.set(entry.id, load);
		try {
			return await load;
		} finally {
			this.ifcPartAttributeLoads.delete(entry.id);
		}
	}

	private async loadIfcPartColorAttributesInternal(entry: MeshEntry<MeshStyle>): Promise<number> {
		const loaded = this.loadedModels.get(entry.id);
		if (!loaded || entry.format.type !== 'ifc') return 0;
		entry.style.partColors ??= { key: 'IFC クラス', show: false, expressions: [] };
		const model = loaded.object as THREE.Object3D & {
			modelID?: number;
			ifcManager?: {
				getItemProperties: (modelId: number, expressId: number) => Promise<Record<string, unknown>>;
				getPropertySets: (
					modelId: number,
					expressId: number,
					recursive?: boolean
				) => Promise<Record<string, unknown>[]>;
				getTypeProperties: (
					modelId: number,
					expressId: number,
					recursive?: boolean
				) => Promise<Record<string, unknown>[]>;
				getIfcType: (modelId: number, expressId: number) => string | Promise<string>;
				getAllItemsOfType?: (modelId: number, type: number, verbose: boolean) => Promise<number[]>;
			} | null;
		};
		if (!import.meta.env.PROD) {
			console.info('[IFC属性色分け] モデル実体', {
				entryId: entry.id,
				modelId: model.modelID ?? null,
				hasIfcManager: Boolean(model.ifcManager),
				hasCachedAttributes: Boolean(model.userData.morivisIfcPartAttributes)
			});
		}
		if (model.modelID == null || !model.ifcManager) return 0;
		const cached = model.userData.morivisIfcPartAttributes as
			| Map<number, ModelAttributes>
			| undefined;
		const attributesByExpressId = cached ?? new Map<number, ModelAttributes>();
		if (!cached) {
			const profile = getIfcPartColorProfile(entry);
			const expressIds = new Set<number>();
			if (profile && model.ifcManager.getAllItemsOfType) {
				const webIfc = await loadWebIfcModule();
				const results = await Promise.allSettled(
					profile.elementTypes.map((elementType) => {
						const type = webIfc[elementType as keyof typeof webIfc];
						if (typeof type !== 'number') {
							return Promise.resolve({ elementType, expressIds: [] as number[] });
						}
						return model.ifcManager!.getAllItemsOfType!(model.modelID!, type, false).then(
							(ids) => ({ elementType, expressIds: ids })
						);
					})
				);
				results.forEach((result) => {
					if (result.status !== 'fulfilled') return;
					result.value.expressIds.forEach((expressId) => expressIds.add(expressId));
				});
				if (!import.meta.env.PROD) {
					console.info('[IFC属性色分け] 事前定義クラス取得結果', {
						entryId: entry.id,
						classes: results.map((result, index) => ({
							className: profile.elementTypes[index],
							count: result.status === 'fulfilled' ? result.value.expressIds.length : 0,
							error: result.status === 'rejected' ? String(result.reason) : undefined
						}))
					});
				}
			} else {
				model.traverse((child) => {
					if (!(child as THREE.Mesh).isMesh) return;
					const attribute = (child as THREE.Mesh).geometry.getAttribute('expressID');
					for (let index = 0; attribute && index < attribute.count; index += 1) {
						expressIds.add(attribute.getX(index));
					}
				});
			}
			const ids = Array.from(expressIds);
			if (!import.meta.env.PROD) {
				console.info('[IFC属性色分け] Express ID収集結果', {
					entryId: entry.id,
					profile: profile?.type ?? 'geometry',
					expressIdCount: ids.length,
					sampleExpressIds: ids.slice(0, 10)
				});
			}
			for (let offset = 0; offset < ids.length; offset += IFC_ATTRIBUTE_BATCH_SIZE) {
				const results = await Promise.allSettled(
					ids.slice(offset, offset + IFC_ATTRIBUTE_BATCH_SIZE).map(async (expressId) => {
						const [item, propertySets, typeProperties, ifcType] = await Promise.all([
							model.ifcManager!.getItemProperties(model.modelID!, expressId),
							model.ifcManager!.getPropertySets(model.modelID!, expressId, true),
							model.ifcManager!.getTypeProperties(model.modelID!, expressId, true),
							model.ifcManager!.getIfcType(model.modelID!, expressId)
						]);
						return [
							expressId,
							{
								...getIfcAttributes(expressId, item, [...propertySets, ...typeProperties]),
								'IFC クラス': ifcType
							}
						] as const;
					})
				);
				results.forEach((result) => {
					if (result.status !== 'fulfilled') return;
					attributesByExpressId.set(result.value[0], result.value[1]);
				});
			}
			model.userData.morivisIfcPartAttributes = attributesByExpressId;
		}
		const selectedKeys = getIfcPartColorProfile(entry)?.attributeKeys;
		const valuesByAttribute = new Map<string, Set<string | number | boolean>>();
		attributesByExpressId.forEach((attributes) => {
			Object.entries(attributes).forEach(([key, value]) => {
				if (selectedKeys && !selectedKeys.includes(key)) return;
				const values = valuesByAttribute.get(key) ?? new Set<string | number | boolean>();
				values.add(value);
				valuesByAttribute.set(key, values);
			});
		});
		const expressions = buildVectorTileColorExpressions({
			id: 'ifc-parts',
			fields: {},
			attributes: Array.from(valuesByAttribute, ([attribute, values]) => {
				const valuesArray = Array.from(values);
				const numericValues = valuesArray.filter(
					(value): value is number => typeof value === 'number' && Number.isFinite(value)
				);
				return {
					attribute,
					values: valuesArray,
					type: numericValues.length === valuesArray.length ? 'number' : 'string',
					min: numericValues.length > 0 ? Math.min(...numericValues) : undefined,
					max: numericValues.length > 0 ? Math.max(...numericValues) : undefined
				};
			})
		});
		entry.style.partColors.expressions = expressions;
		entry.style.partColors.key = expressions[0]?.key ?? entry.style.partColors.key;
		if (!import.meta.env.PROD) {
			console.info('[IFC属性色分け] 事前定義属性結果', {
				entryId: entry.id,
				attributePartCount: attributesByExpressId.size,
				expressionKeys: expressions.map((expression) => expression.key)
			});
		}
		return expressions.length;
	}

	async getIfcPartAttributes(entry: MeshEntry<MeshStyle>): Promise<ModelAttributes[]> {
		await this.loadIfcPartColorAttributes(entry);
		const loaded = this.loadedModels.get(entry.id);
		if (!loaded || entry.format.type !== 'ifc') return [];
		const attributes = loaded.object.userData.morivisIfcPartAttributes as
			| Map<number, ModelAttributes>
			| undefined;
		return attributes ? Array.from(attributes.values()) : [];
	}

	private async preloadIfcProfiles(entry: MeshEntry<MeshStyle>): Promise<void> {
		const profiles = entry.properties?.ifc?.extractionProfiles ?? [];
		if (profiles.some((profile) => profile.type === 'part-colors')) {
			await this.loadIfcPartColorAttributes(entry);
		}
	}

	async setModelStyle(entry: ThreeModelEntry): Promise<void> {
		const loaded = this.loadedModels.get(entry.id);
		if (!loaded) return;
		loaded.entry = entry;
		loaded.transform = calculateModelTransform(entry.style);
		if (isMeshModelEntry(entry)) {
			if (entry.format.type === 'ifc') {
				await this.applyIfcPartColors(loaded.object, entry.style);
			}
			this.applyStyleToObject(loaded.object, entry.style, entry.format.type);
		} else {
			applyGaussianSplatStyle(loaded.object, entry.style, this.map?.getCanvas().clientHeight);
		}
		this.syncAnimationState(loaded);
	}

	setModelTransform(entryId: string, style: ModelTransformStyle): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		const newTransform = calculateModelTransform(style);
		loaded.transform = newTransform;
		loaded.entry = { ...loaded.entry, style } as ThreeModelEntry;
		this.syncAnimationState(loaded);
	}

	setModelAnimationState(entry: MeshEntry<MeshStyle>): void {
		const loaded = this.loadedModels.get(entry.id);
		if (!loaded) return;
		loaded.entry = entry;
		this.syncAnimationState(loaded);
	}

	updateModelMeshHeights(
		entryId: string,
		heights: ArrayLike<number>,
		normalizedHeights?: ArrayLike<number>
	): boolean {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return false;

		let updated = false;
		loaded.object.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh) return;

			const mesh = child as THREE.Mesh;
			const positionAttribute = mesh.geometry.getAttribute('position');
			if (!(positionAttribute instanceof THREE.BufferAttribute)) return;
			if (positionAttribute.itemSize !== 3) return;
			if (positionAttribute.count !== heights.length) return;
			const uvAttribute = mesh.geometry.getAttribute('uv');
			const uvBufferAttribute =
				uvAttribute instanceof THREE.BufferAttribute &&
				uvAttribute.itemSize === 2 &&
				normalizedHeights != null &&
				uvAttribute.count === normalizedHeights.length
					? uvAttribute
					: null;

			for (let i = 0; i < positionAttribute.count; i++) {
				positionAttribute.setY(i, heights[i] ?? 0);
				if (uvBufferAttribute && normalizedHeights) {
					uvBufferAttribute.setY(i, normalizedHeights[i] ?? 0);
				}
			}

			positionAttribute.needsUpdate = true;
			if (uvBufferAttribute) {
				uvBufferAttribute.needsUpdate = true;
			}
			mesh.geometry.computeVertexNormals();

			const normalAttribute = mesh.geometry.getAttribute('normal');
			if (normalAttribute instanceof THREE.BufferAttribute) {
				normalAttribute.needsUpdate = true;
			}

			updated = true;
		});

		return updated;
	}

	setGroupVisibility(visible: boolean): void {
		if (!this.modelGroup) return;
		this.modelGroup.visible = visible;
	}

	/** 既存の MapLibre/Three.js 描画コンテキストで単体ビューを開始する。 */
	openModelView(
		entryIds: string[],
		initialCamera?: ModelViewCameraOptions,
		includeHighlights = false
	): ModelViewSession | null {
		if (!this.scene || !this.renderer || !this.map || !this.modelGroup || !this.previewModelGroup) {
			return null;
		}
		const canvas = this.map.getCanvas();
		const loaded = entryIds
			.map((entryId) => this.loadedModels.get(entryId))
			.filter((model): model is LoadedModel => model != null);
		if (loaded.length === 0) return null;
		const isGaussianSplatOnlyView = loaded.every((model) => isGaussianSplatEntry(model.entry));

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

		const camera: THREE.PerspectiveCamera | THREE.OrthographicCamera =
			initialCamera?.type === 'orthographic'
				? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1_000_000)
				: new THREE.PerspectiveCamera(45, 1, 0.01, 1_000_000);
		const activeModelView: ActiveModelView = {
			entryIds: new Set(loaded.map((model) => model.entry.id)),
			camera,
			target: new THREE.Vector3(),
			highlightVisibility: new Map(),
			axisWrappers,
			modelGroupVisible: this.modelGroup.visible,
			previewVisible: this.previewModelGroup.visible
		};
		this.activeModelView = activeModelView;
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
			const distance =
				(largestDimension / (2 * Math.tan(THREE.MathUtils.degToRad(45 / 2)))) *
				MODEL_VIEW_INITIAL_CAMERA_DISTANCE_SCALE;

			camera.near = Math.max(largestDimension / 10_000, 0.001);
			camera.far = Math.max(largestDimension * 100, 1_000);
			// 3DGS PLYはMapLibreの画面座標と上下が逆になるため、単体ビューだけ上方向を反転する。
			camera.up.set(0, isGaussianSplatOnlyView ? -1 : 1, 0);
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
			movementSpeed: Math.max(
				largestDimension / MODEL_VIEW_FPS_MOVEMENT_SPEED_DIVISOR,
				MODEL_VIEW_FPS_MIN_MOVEMENT_SPEED
			),
			getTarget: () => activeModelView.target.clone(),
			resetView: fitModel,
			resize: this.resizeModelView
		};
	}

	private resizeModelView = () => {
		const activeModelView = this.activeModelView;
		const canvas = this.map?.getCanvas();
		if (!activeModelView || !canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
			return;
		}

		const { camera } = activeModelView;
		const aspect = canvas.clientWidth / canvas.clientHeight;
		if (camera instanceof THREE.PerspectiveCamera) {
			camera.aspect = aspect;
		} else {
			const halfHeight = (camera.top - camera.bottom) / 2;
			camera.left = -halfHeight * aspect;
			camera.right = halfHeight * aspect;
		}
		camera.updateProjectionMatrix();
	};

	requestModelViewRepaint(): void {
		if (this.activeModelView) this.map?.triggerRepaint();
	}

	closeModelView(): void {
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
	}

	async exportModelAsGlb(entryId: string): Promise<ArrayBuffer> {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) {
			throw new Error('モデルがまだ読み込まれていません');
		}
		if (!isMeshModelEntry(loaded.entry)) {
			throw new Error('3D Gaussian Splatting はGLBに書き出せません');
		}
		const meshLoaded = loaded as LoadedModel & { entry: MeshEntry<MeshStyle> };

		const exporter = new GLTFExporter();
		const restoreExportObject = this.prepareGlbExportObject(meshLoaded);
		const animations = loaded.actions?.map((action) => action.getClip()) ?? [];
		let restored = false;
		const restore = () => {
			if (restored) return;
			restored = true;
			restoreExportObject();
		};

		return new Promise<ArrayBuffer>((resolve, reject) => {
			try {
				exporter.parse(
					loaded.object,
					(result) => {
						restore();
						if (result instanceof ArrayBuffer) {
							resolve(result);
							return;
						}

						reject(new Error('GLB の書き出し結果が binary ではありませんでした'));
					},
					(error) => {
						restore();
						reject(error instanceof Error ? error : new Error(String(error)));
					},
					{
						binary: true,
						animations
					}
				);
			} catch (error) {
				restore();
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	/** プレビューモデルをメイングループに移動（再読み込み不要） */
	promotePreviewToMain(entryId: string): boolean {
		if (!this.modelGroup || !this.previewModelGroup) return false;

		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return false;

		this.previewModelGroup.remove(loaded.object);
		this.modelGroup.add(loaded.object);
		return true;
	}

	/** プレビューモデルをクリア（確定しない場合） */
	clearPreview(entryId?: string): void {
		if (!this.previewModelGroup) return;

		if (entryId) {
			const loaded = this.loadedModels.get(entryId);
			if (loaded && loaded.object.parent === this.previewModelGroup) {
				this.removeModel(entryId);
			}
		} else {
			const previewIds: string[] = [];
			this.loadedModels.forEach((loaded, id) => {
				if (loaded.object.parent === this.previewModelGroup) {
					previewIds.push(id);
				}
			});
			previewIds.forEach((id) => this.removeModel(id));
		}
	}

	/** 完全に破棄（ページ離脱時など） */
	dispose(): void {
		this.clearModelHighlight();
		this.clearAllModels();
		this.overlayRenderTarget?.dispose();
		this.overlayScene?.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh) return;
			const mesh = child as THREE.Mesh;
			mesh.geometry.dispose();
			const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
			materials.forEach((material) => material.dispose());
		});
		if (this.renderer) {
			this.renderer.dispose();
			this.renderer = null;
		}
		this.modelGroup = null;
		this.previewModelGroup = null;
		this.overlayRenderTarget = null;
		this.overlayScene = null;
		this.overlayCamera = null;
		this.loadedModels.clear();
		this.scene = null;
		this.camera = null;
		this.map = null;
		this.isInitialized = false;
		this.lastRenderTimeMs = null;
		this.lastMapProjectionMatrix = null;
	}

	/** 初期化済みかどうか */
	get initialized(): boolean {
		return this.isInitialized;
	}

	/** ロード済みモデルのIDリスト */
	get modelIds(): string[] {
		return Array.from(this.loadedModels.keys());
	}

	private createPickedModelFeature = async (
		loaded: LoadedModel,
		hit: THREE.Intersection<THREE.Object3D>
	): Promise<PickedModelFeature> => {
		const fbxAttributeObject = this.getFbxAttributeObject(hit.object);
		const expressId =
			loaded.entry.format.type === 'ifc' ? this.getIfcExpressId(loaded.object, hit) : undefined;
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
		const attributeObject =
			loaded.entry.format.type === 'fbx' ? fbxAttributeObject.object : hit.object;
		const objectId =
			expressId ?? (attributeObject as THREE.Object3D & { ID?: number }).ID ?? attributeObject.id;
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

	async pickModelInActiveView(point: {
		clientX: number;
		clientY: number;
	}): Promise<PickedModelFeature | null> {
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
				activeModelView.entryIds.has(loaded.entry.id) &&
				isMeshModelEntry(loaded.entry) &&
				CLICKABLE_MODEL_FORMATS.has(loaded.entry.format.type) &&
				(loaded.entry.style.visible ?? true)
		);
		let closest: { loaded: LoadedModel; hit: THREE.Intersection<THREE.Object3D> } | null = null;
		for (const loaded of targetEntries) {
			const hit = raycaster
				.intersectObject(loaded.object, true)
				.find((intersection) => !intersection.object.userData.morivisSelectionHighlight);
			if (hit && (!closest || hit.distance < closest.hit.distance)) {
				closest = { loaded, hit };
			}
		}
		if (!closest) return null;

		return this.createPickedModelFeature(closest.loaded, closest.hit);
	}

	async pickModel(point: { x: number; y: number }): Promise<PickedModelFeature | null> {
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
				isMeshModelEntry(loaded.entry) &&
				CLICKABLE_MODEL_FORMATS.has(loaded.entry.format.type) &&
				loaded.entry.style.visible
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
			const hit = raycaster.intersectObject(loaded.object, true)[0];
			loaded.object.visible = wasVisible;
			if (!import.meta.env.PROD) {
				console.info('[モデル pick] 判定結果', {
					entryId: loaded.entry.id,
					rayOrigin: origin.toArray(),
					rayDirection: raycaster.ray.direction.toArray(),
					hit: hit
						? {
								distance: hit.distance,
								objectId: (hit.object as THREE.Object3D & { ID?: number }).ID,
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
		return this.createPickedModelFeature(closest.loaded, closest.hit);
	}
}

export const threeJsManager = new ThreeJsLayerManager();
