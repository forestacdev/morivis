import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import { getAdjustableRangeDomain, getAdjustableRangeValue } from '$routes/map/data/types';
import {
	DEFAULT_MESH_SHADING,
	type MeshEntry,
	type MeshShadingStyle,
	type MeshStyle
} from '$routes/map/data/types/model';
import type { CustomLayerInterface, Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import { generateNumberAndColorMap } from '$routes/map/utils/style/color-mapping';
import { buildVectorTileColorExpressions } from '$routes/map/utils/vector/tile-style';
import {
	type FbxModelAttributes,
	parseFbxModelAttributes
} from '$routes/map/utils/three/fbx-attributes';
import { configureIfcWasmPath } from '$routes/map/utils/three/ifc-wasm-path';
import {
	getIfcAttributes,
	getModelObjectAttributes,
	type ModelAttributes
} from '$routes/map/utils/three/model-attributes';
import {
	calculateModelTransform,
	type ModelTransform
} from '$routes/map/utils/three/model-transform';
import { centerObjectToLocalOrigin } from '$routes/map/utils/three/object-normalization';
import { finalizeRuntimeModelObject } from '$routes/map/utils/three/runtime-model-finalize';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const DRACO_DECODER_PATH = resolveStaticAssetPath('/draco/gltf/');
const RHINO3DM_LIBRARY_PATH = resolveStaticAssetPath('/rhino3dm/');
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
	entry: MeshEntry<MeshStyle>;
	object: THREE.Object3D;
	transform: ModelTransform;
	mixer?: THREE.AnimationMixer;
	actions?: THREE.AnimationAction[];
	lastClipIndex?: number;
	resolveAttributes?: (hit: THREE.Intersection<THREE.Object3D>) => Promise<ModelAttributes>;
}

export interface PickedModelFeature {
	entryId: string;
	objectId: string;
	objectName: string;
	attributes: ModelAttributes;
}

interface ModelHighlight {
	mesh: THREE.Mesh;
	fill: THREE.Mesh;
	outline: THREE.LineSegments;
	geometry: THREE.BufferGeometry;
	expressId?: number;
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
	'3ds',
	'dae',
	'3dm',
	'drc',
	'3mf',
	'amf',
	'ifc'
]);

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
	private selectedModelHighlight: ModelHighlight | null = null;

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

		const map = 'map' in sourceMaterial && sourceMaterial.map instanceof THREE.Texture
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
		const colorRampRgbaArray = colorRampArray != null
			? new Uint8Array(
				Array.from({ length: 256 * 4 }, (_, i) => {
					const colorIndex = Math.floor(i / 4);
					const channel = i % 4;
					if (channel === 3) return 255;
					return colorRampArray[colorIndex * 3 + channel] ?? 0;
				})
			)
			: null;
		const colorRampTexture = colorRamp?.enabled && colorRampMax > colorRampMin
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

				void main() {
					vNormal = normalize(normalMatrix * normal);
					vUv = uv;
					vPartColorIndex = morivisPartColorIndex;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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

		const map = 'map' in sourceMaterial && sourceMaterial.map instanceof THREE.Texture
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
		const map = getTextureSlot(sourceMaterial, 'map')
			?? getTextureSlot(sourceMaterial, 'emissiveMap');
		const alphaMap = getTextureSlot(sourceMaterial, 'alphaMap');

		const material = new THREE.MeshBasicMaterial({
			color: new THREE.Color(style.color),
			map,
			alphaMap,
			transparent: style.opacity < 1
				|| alphaMap != null
				|| ('transparent' in sourceMaterial && sourceMaterial.transparent === true),
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
		const material = sourceMaterial.clone();
		if ('color' in material && material.color instanceof THREE.Color) {
			material.color = material.color.clone().multiply(new THREE.Color(style.color));
		}
		material.transparent = true;
		material.opacity = style.opacity;
		material.side = THREE.DoubleSide;
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
		const originalMaterials = (mesh.userData.originalMaterials as THREE.Material[] | undefined)
			?? currentMaterials.map((material) => material.clone());

		if (!mesh.userData.originalMaterials) {
			mesh.userData.originalMaterials = originalMaterials;
		}

		const useShaderMaterial = Boolean(style.shading?.enabled)
			|| Boolean(style.heightColorRamp?.enabled);
		const usePartColorMaterial = Boolean(style.partColors?.show)
			&& mesh.geometry.getAttribute('morivisPartColorIndex') != null;
		if (
			usePartColorMaterial
			&& currentMaterials.every((material) => this.updatePartColorPalette(material, style))
		) {
			return;
		}
		const isSkinnedMesh = (mesh as THREE.SkinnedMesh).isSkinnedMesh === true;
		const hasTexturedMaterial = originalMaterials.some(materialHasTextureSlots);

		const nextMaterials = originalMaterials.map((sourceMaterial) =>
			usePartColorMaterial
				? this.createShaderMaterial(sourceMaterial, style)
				// FBX などの既存テクスチャは UV 変換や追加スロットを持つので、元マテリアルを保持する。
				: hasTexturedMaterial && formatType === 'fbx'
				? this.createFbxTexturedMaterial(sourceMaterial, style)
				: hasTexturedMaterial
				? this.createStyledSourceMaterial(sourceMaterial, style)
				: isSkinnedMesh
				? this.createStyledSourceMaterial(sourceMaterial, style)
				: useShaderMaterial
				? this.createShaderMaterial(sourceMaterial, style)
				: this.createFlatMaterial(sourceMaterial, style)
		);

		mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
		currentMaterials.forEach((material) => {
			const colorRampTexture = material.userData?.colorRampTexture;
			if (colorRampTexture instanceof THREE.Texture) {
				colorRampTexture.dispose();
			}
			material.dispose();
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
			await Promise.all(
				Array.from(expressIds).map(async (expressId) => {
					classesByExpressId.set(
						expressId,
						await ifcModel.ifcManager!.getIfcType(ifcModel.modelID!, expressId)
					);
				})
			);
			object.userData.morivisIfcClasses = classesByExpressId;
		}
		if (!style.partColors) {
			const expressions = buildVectorTileColorExpressions({
				id: 'ifc-parts',
				fields: {},
				attributes: [{
					attribute: 'IFC クラス',
					values: Array.from(new Set(classesByExpressId.values()))
				}]
			});
			if (expressions.length > 0) {
				style.partColors = { key: expressions[0].key, show: false, expressions };
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
				const value = expression.key === 'IFC クラス'
					? classesByExpressId.get(expressIdAttribute.getX(index))
					: partAttributes?.get(expressIdAttribute.getX(index))?.[expression.key];
				colorIndexes[index] = categoryIndexes.get(
					typeof value === 'boolean' ? String(value) : (value ?? '')
				) ?? 0;
			}
			mesh.geometry.setAttribute(
				'morivisPartColorIndex',
				new THREE.BufferAttribute(colorIndexes, 1)
			);
			mesh.geometry.userData.morivisPartColorSignature = signature;
		});
	};

	clearModelHighlight(): void {
		const highlight = this.selectedModelHighlight;
		if (!highlight) return;

		this.selectedModelHighlight = null;
		highlight.fill.removeFromParent();
		highlight.outline.removeFromParent();
		(highlight.fill.material as THREE.Material).dispose();
		if (highlight.geometry !== highlight.mesh.geometry) highlight.geometry.dispose();
		highlight.outline.geometry.dispose();
		(highlight.outline.material as THREE.Material).dispose();
		this.map?.triggerRepaint();
	}

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

	private highlightModelMesh = (mesh: THREE.Mesh, expressId?: number) => {
		if (
			this.selectedModelHighlight?.mesh === mesh
			&& this.selectedModelHighlight.expressId === expressId
		) {
			return;
		}
		this.clearModelHighlight();
		const geometry = expressId == null
			? mesh.geometry
			: (this.getIfcHighlightGeometry(mesh, expressId) ?? mesh.geometry);

		const fill = new THREE.Mesh(
			geometry,
			new THREE.MeshBasicMaterial({
				color: HIGHLIGHT_LAYER_COLOR,
				transparent: true,
				opacity: 0.38,
				side: THREE.DoubleSide,
				depthWrite: false,
				polygonOffset: true,
				polygonOffsetFactor: -1,
				polygonOffsetUnits: -1
			})
		);
		fill.name = 'morivis-fbx-highlight-fill';
		fill.userData.morivisSelectionHighlight = true;
		fill.raycast = () => undefined;

		const outline = new THREE.LineSegments(
			new THREE.EdgesGeometry(geometry, 20),
			new THREE.LineBasicMaterial({ color: HIGHLIGHT_LAYER_COLOR, depthWrite: false })
		);
		outline.name = 'morivis-fbx-highlight-outline';
		outline.userData.morivisSelectionHighlight = true;
		outline.raycast = () => undefined;

		mesh.add(fill, outline);
		this.selectedModelHighlight = { mesh, fill, outline, geometry, expressId };
		this.map?.triggerRepaint();
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

	private getFbxAttributeObject = (object: THREE.Object3D) => {
		let current: THREE.Object3D | null = object;
		while (current) {
			const attributes = current.userData.morivisFbxAttributes as
				| FbxModelAttributes
				| undefined;
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
				getItemProperties: (
					modelId: number,
					expressId: number
				) => Promise<Record<string, unknown>>;
				getPropertySets: (
					modelId: number,
					expressId: number
				) => Promise<Record<string, unknown>[]>;
				getIfcType: (modelId: number, expressId: number) => string | Promise<string>;
			} | null;
		};
		const expressId = this.getIfcExpressId(model, hit);
		if (ifcModel.modelID == null || expressId == null || !ifcModel.ifcManager) return {};
		const [item, propertySets, ifcType] = await Promise.all([
			ifcModel.ifcManager.getItemProperties(ifcModel.modelID, expressId),
			ifcModel.ifcManager.getPropertySets(ifcModel.modelID, expressId),
			ifcModel.ifcManager.getIfcType(ifcModel.modelID, expressId)
		]);
		return { ...getIfcAttributes(expressId, item, propertySets), 'IFC クラス': ifcType };
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
		if (!loaded.mixer || !loaded.actions || loaded.actions.length === 0) return;

		const animationState = loaded.entry.state?.animation;
		const clipIndex = Math.min(
			Math.max(animationState?.currentClipIndex ?? 0, 0),
			loaded.actions.length - 1
		);
		const speed = Math.max(animationState?.speed ?? 1, 0);
		const playing = animationState?.playing ?? false;

		loaded.actions.forEach((action, index) => {
			if (index === clipIndex) {
				if (loaded.lastClipIndex !== clipIndex) {
					action.reset();
				}
				action.enabled = true;
				action.setLoop(THREE.LoopRepeat, Infinity);
				action.clampWhenFinished = false;
				action.timeScale = speed;
				action.paused = !playing;
				action.play();
				return;
			}

			action.stop();
		});

		loaded.lastClipIndex = clipIndex;
		if (playing) {
			this.map?.triggerRepaint();
		}
	};

	private createGlbExportMaterial = (
		material: THREE.Material,
		style: MeshStyle
	): THREE.Material => {
		if (material instanceof THREE.ShaderMaterial) {
			const baseColor = material.uniforms.uBaseColor?.value instanceof THREE.Color
				? material.uniforms.uBaseColor.value.clone()
				: new THREE.Color(style.color);
			const map = material.uniforms.uMap?.value instanceof THREE.Texture
				? material.uniforms.uMap.value
				: null;
			const opacity = typeof material.uniforms.uOpacity?.value === 'number'
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

	private prepareGlbExportObject = (loaded: LoadedModel): () => void => {
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
			mesh.material = Array.isArray(mesh.material)
				? convertedMaterials
				: convertedMaterials[0];
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

	private setOnlyEntryVisible = (entryId: string, visible: boolean) => {
		const applyVisibility = (group: THREE.Group | null) => {
			if (!group) return;
			group.traverse((child) => {
				if (child.userData.entryId) {
					child.visible = child.userData.entryId === entryId && visible;
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
					| { depthTest: boolean; depthWrite: boolean; }
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
			this.overlayRenderTarget.width !== renderTargetSize.x
			|| this.overlayRenderTarget.height !== renderTargetSize.y
		) {
			this.overlayRenderTarget.setSize(renderTargetSize.x, renderTargetSize.y);
		}

		this.restoreModelDepthState(loaded.object);
		this.camera.projectionMatrix = mapProjectionMatrix.clone().multiply(
			loaded.transform.matrix
		);
		this.setOnlyEntryVisible(loaded.entry.id, loaded.entry.style.visible ?? true);

		this.renderer.resetState();
		this.renderer.setRenderTarget(this.overlayRenderTarget);
		this.renderer.clear();
		this.renderer.render(this.scene, this.camera);

		this.renderer.resetState();
		this.renderer.setRenderTarget(null);
		this.renderer.render(this.overlayScene, this.overlayCamera);
	};

	private updateAnimations = () => {
		const nowMs = performance.now();
		const deltaSeconds = this.lastRenderTimeMs == null
			? 0
			: Math.max((nowMs - this.lastRenderTimeMs) / 1000, 0);
		this.lastRenderTimeMs = nowMs;
		let hasPlayingAnimation = false;

		this.loadedModels.forEach((loaded) => {
			if (loaded.entry.state?.animation?.playing && loaded.mixer) {
				loaded.mixer.update(deltaSeconds);
				hasPlayingAnimation = true;
			}
		});

		return hasPlayingAnimation;
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
					this.overlayScene.add(
						new THREE.Mesh(new THREE.PlaneGeometry(2, 2), overlayMaterial)
					);

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
				if (this.loadedModels.size === 0) return;
				this.lastMapProjectionMatrix = new THREE.Matrix4().fromArray(
					args.defaultProjectionData.mainMatrix
				);
				const mapProjectionMatrix = this.lastMapProjectionMatrix;
				const hasPlayingAnimation = this.updateAnimations();

				this.loadedModels.forEach((loaded) => {
					if (loaded.entry.style.showThroughTerrain) return;
					this.restoreModelDepthState(loaded.object);

					const modelMatrix = loaded.transform.matrix.clone();
					const projectionMatrix = mapProjectionMatrix.clone();
					this.camera!.projectionMatrix = projectionMatrix.multiply(modelMatrix);

					this.setOnlyEntryVisible(loaded.entry.id, loaded.entry.style.visible ?? true);

					this.renderer!.resetState();
					this.renderer!.render(this.scene!, this.camera!);
				});

				this.loadedModels.forEach((loaded) => {
					if (!loaded.entry.style.showThroughTerrain) return;
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
	addModel(entry: MeshEntry<MeshStyle>, _type: 'main' | 'preview' = 'main'): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.modelGroup || !this.previewModelGroup) {
				reject(new Error('modelGroup not initialized'));
				return;
			}

			if (entry.style.type !== 'mesh') {
				reject(new Error('Entry style type must be "mesh"'));
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
				resolveAttributes?: (
					hit: THREE.Intersection<THREE.Object3D>
				) => Promise<ModelAttributes>
			) => {
				if (entry.format.type === 'ifc') {
					await this.applyIfcPartColors(model, entry.style);
				}
				this.applyStyleToObject(model, entry.style, entry.format.type);

				model.visible = entry.style.visible ?? true;
				model.userData.entryId = entry.id;
				const loaded: LoadedModel = {
					entry,
					object: model,
					transform,
					resolveAttributes
				};
				if (animations.length > 0) {
					loaded.mixer = new THREE.AnimationMixer(model);
					loaded.actions = animations.map((clip) => loaded.mixer!.clipAction(clip));
				}
				this.loadedModels.set(entry.id, loaded);
				this.syncAnimationState(loaded);
				if (_type === 'preview') {
					this.previewModelGroup!.add(model);
				} else {
					this.modelGroup!.add(model);
				}
				this.requestRepaintBurst(entry.format.type === 'fbx' ? 180 : 30);
				resolve();
			};

			const finalizeLoadedModel = (object: THREE.Object3D) => {
				finalizeRuntimeModelObject(object, {
					formatType: entry.format.type,
					georeference: entry.format.georeference,
					normalizeToLocalOrigin: entry.format.normalizeToLocalOrigin
				});
			};

			const finalizeAndLoadModel = (
				object: THREE.Object3D,
				animations: THREE.AnimationClip[] = []
			) => {
				finalizeLoadedModel(object);
				void onModelLoaded(object, animations).catch((error) =>
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
						const attributesByModelId = parseFbxModelAttributes(buffer);
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
								matchedAttributeCount
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
								(gltf) => finalizeAndLoadModel(gltf.scene, gltf.animations),
								(error) =>
									reject(
										error instanceof Error ? error : new Error(String(error))
									)
							);
						})
						.catch((error) => reject(error));
				}
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
			} else if (entry.format.type === 'ifc') {
				loadIfcLoaderModule()
					.then(({ IFCLoader }) => {
						const loader = new IFCLoader();
						return configureIfcWasmPath(loader.ifcManager).then(() => {
							loader.load(
								entry.format.url,
								(object) => {
									finalizeLoadedModel(object);
									onModelLoaded(
										object,
										[],
										(hit) => this.resolveIfcAttributes(object, hit)
									);
								},
								undefined,
								(error) => reject(error)
							);
						});
					})
					.catch((error) => reject(error));
			}
		});
	}

	/** 複数のモデルを追加 */
	async addModels(entries: MeshEntry<MeshStyle>[]): Promise<void> {
		await Promise.all(entries.map((entry) => this.addModel(entry)));
	}

	updateTransform(entries: MeshEntry<MeshStyle>[]): void {
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
			this.selectedModelHighlight
			&& loaded.object.getObjectById(this.selectedModelHighlight.mesh.id)
				=== this.selectedModelHighlight.mesh
		) {
			this.clearModelHighlight();
		}

		loaded.object.parent?.remove(loaded.object);
		loaded.object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				mesh.geometry.dispose();
				const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				materials.forEach((mat) => mat.dispose());
				const originalMaterials = mesh.userData.originalMaterials as
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
	async replaceModels(entries: MeshEntry<MeshStyle>[]): Promise<void> {
		this.clearAllModels();
		await this.addModels(entries);
	}

	/** モデルの表示/非表示を切り替え */
	setModelVisibility(entryId: string, visible: boolean): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.entry = { ...loaded.entry, style: { ...loaded.entry.style, visible } };
		loaded.object.visible = visible;
	}

	/** モデルの不透明度を変更 */
	setModelOpacity(entryId: string, opacity: MeshStyle['opacity']): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.entry = { ...loaded.entry, style: { ...loaded.entry.style, opacity } };
		this.applyStyleToObject(loaded.object, loaded.entry.style, loaded.entry.format.type);
		this.syncAnimationState(loaded);
	}

	setModelWireframe(entryId: string, wireframe: boolean): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.entry = { ...loaded.entry, style: { ...loaded.entry.style, wireframe } };
		this.applyStyleToObject(loaded.object, loaded.entry.style, loaded.entry.format.type);
		this.syncAnimationState(loaded);
	}

	setModelColor(entryId: string, color: string): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
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

	async loadIfcPartColorAttributes(entry: MeshEntry<MeshStyle>): Promise<void> {
		const loaded = this.loadedModels.get(entry.id);
		if (!loaded || entry.format.type !== 'ifc' || !entry.style.partColors) return;
		const model = loaded.object as THREE.Object3D & {
			modelID?: number;
			ifcManager?: {
				getItemProperties: (modelId: number, expressId: number) => Promise<Record<string, unknown>>;
				getPropertySets: (modelId: number, expressId: number) => Promise<Record<string, unknown>[]>;
				getIfcType: (modelId: number, expressId: number) => string | Promise<string>;
			} | null;
		};
		if (model.modelID == null || !model.ifcManager) return;
		const cached = model.userData.morivisIfcPartAttributes as Map<number, ModelAttributes> | undefined;
		const attributesByExpressId = cached ?? new Map<number, ModelAttributes>();
		if (!cached) {
			const expressIds = new Set<number>();
			model.traverse((child) => {
				if (!(child as THREE.Mesh).isMesh) return;
				const attribute = (child as THREE.Mesh).geometry.getAttribute('expressID');
				for (let index = 0; attribute && index < attribute.count; index += 1) {
					expressIds.add(attribute.getX(index));
				}
			});
			await Promise.all(Array.from(expressIds).map(async (expressId) => {
				const [item, propertySets, ifcType] = await Promise.all([
					model.ifcManager!.getItemProperties(model.modelID!, expressId),
					model.ifcManager!.getPropertySets(model.modelID!, expressId),
					model.ifcManager!.getIfcType(model.modelID!, expressId)
				]);
				attributesByExpressId.set(expressId, {
					...getIfcAttributes(expressId, item, propertySets),
					'IFC クラス': ifcType
				});
			}));
			model.userData.morivisIfcPartAttributes = attributesByExpressId;
		}
		const valuesByAttribute = new Map<string, Set<string | number | boolean>>();
		attributesByExpressId.forEach((attributes) => {
			Object.entries(attributes).forEach(([key, value]) => {
				const values = valuesByAttribute.get(key) ?? new Set<string | number | boolean>();
				values.add(value);
				valuesByAttribute.set(key, values);
			});
		});
		const expressions = buildVectorTileColorExpressions({
			id: 'ifc-parts',
			fields: {},
			attributes: Array.from(valuesByAttribute, ([attribute, values]) => ({
				attribute,
				values: Array.from(values)
			}))
		}).filter((expression) => expression.type === 'match');
		entry.style.partColors.expressions = expressions;
		entry.style.partColors.key = expressions[0]?.key ?? entry.style.partColors.key;
	}

	async setModelStyle(entry: MeshEntry<MeshStyle>): Promise<void> {
		const loaded = this.loadedModels.get(entry.id);
		if (!loaded) return;
		loaded.entry = entry;
		loaded.transform = calculateModelTransform(entry.style);
		if (entry.format.type === 'ifc') {
			await this.applyIfcPartColors(loaded.object, entry.style);
		}
		this.applyStyleToObject(loaded.object, entry.style, entry.format.type);
		this.syncAnimationState(loaded);
	}

	setModelTransform(entryId: string, style: MeshStyle): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		const newTransform = calculateModelTransform(style);
		loaded.transform = newTransform;
		loaded.entry = { ...loaded.entry, style };
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
			const uvBufferAttribute = uvAttribute instanceof THREE.BufferAttribute
					&& uvAttribute.itemSize === 2
					&& normalizedHeights != null
					&& uvAttribute.count === normalizedHeights.length
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

	async exportModelAsGlb(entryId: string): Promise<ArrayBuffer> {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) {
			throw new Error('モデルがまだ読み込まれていません');
		}

		const exporter = new GLTFExporter();
		const restoreExportObject = this.prepareGlbExportObject(loaded);
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

	async pickModel(point: { x: number; y: number; }): Promise<PickedModelFeature | null> {
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
				CLICKABLE_MODEL_FORMATS.has(loaded.entry.format.type) && loaded.entry.style.visible
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
		const { loaded, hit } = closest;
		const fbxAttributeObject = this.getFbxAttributeObject(hit.object);
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
		this.highlightModelMesh(hit.object as THREE.Mesh, expressId);
		return {
			entryId: loaded.entry.id,
			objectId: String(objectId),
			objectName: this.resolvePickedObjectName(attributeObject, loaded.object),
			attributes: { ...getModelObjectAttributes(hit.object), ...formatAttributes }
		};
	}
}

export const threeJsManager = new ThreeJsLayerManager();
