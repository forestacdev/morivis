import { getAdjustableRangeDomain, getAdjustableRangeValue } from '$routes/map/data/types';
import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
import { ColorMapManager, generateNumberAndColorMap } from '$routes/map/utils/style/color-mapping';
import { setFbxCurveVisibility } from '$routes/map/utils/three/fbx-attributes';
import { isGeneratedFbxTextTexture, setFbxTextStyle } from '$routes/map/utils/three/fbx-text';
import { minecraftMaterialState } from '$routes/map/utils/three/minecraft-material';
import {
	getModelObjectAttributes,
	type ModelAttributes
} from '$routes/map/utils/three/model-attributes';
import { resolveMeshEdgeUniforms } from '$routes/map/utils/three/model-edge';
import { createEdgeUvGeometry } from '$routes/map/utils/three/model-edge-uv';
import { getModelPartColor } from '$routes/map/utils/three/model-part-style';
import { resolveMeshShadingUniforms } from '$routes/map/utils/three/model-shading';
import { buildVectorTileColorExpressions } from '$routes/map/utils/vector/tile-style';
import * as THREE from 'three';
const IFC_ATTRIBUTE_BATCH_SIZE = 32;
export class ModelMaterials {
	private colorMapManager = new ColorMapManager();
	private createEdgeOverlayMaterial = (style: MeshStyle): THREE.ShaderMaterial => {
		const edgeUniforms = resolveMeshEdgeUniforms(style);
		const material = new THREE.ShaderMaterial({
			uniforms: {
				uEdgeColor: { value: edgeUniforms.color },
				uEdgeThickness: { value: edgeUniforms.thickness },
				uSilhouetteWidthPx: { value: edgeUniforms.silhouetteWidthPx },
				uEdgeOpacity: { value: edgeUniforms.opacity }
			},
			vertexShader: `
				varying vec2 vUv;
				varying vec3 vModelPosition;
				varying vec3 vViewNormal;
				varying vec3 vViewPosition;
				#include <morphtarget_pars_vertex>
				#include <skinning_pars_vertex>

				void main() {
					#include <beginnormal_vertex>
					#include <morphnormal_vertex>
					#include <skinbase_vertex>
					#include <skinnormal_vertex>
					vec3 transformed = vec3(position);
					#include <morphtarget_vertex>
					#include <skinning_vertex>
					vUv = uv;
					vModelPosition = transformed;
					vViewNormal = normalize(normalMatrix * objectNormal);
					vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
					vViewPosition = viewPosition.xyz;
					gl_Position = projectionMatrix * viewPosition;
				}
			`,
			fragmentShader: `
				uniform vec3 uEdgeColor;
				uniform float uEdgeThickness;
				uniform float uSilhouetteWidthPx;
				uniform float uEdgeOpacity;
				varying vec2 vUv;
				varying vec3 vModelPosition;
				varying vec3 vViewNormal;
				varying vec3 vViewPosition;

				float edgeDistanceInModelSpace(vec2 uv, vec3 modelPosition) {
					vec2 uvDx = dFdx(uv);
					vec2 uvDy = dFdy(uv);
					float determinant = uvDx.x * uvDy.y - uvDx.y * uvDy.x;
					if (abs(determinant) < 0.000001) return 1000000.0;

					// UV 1.0あたりのモデル座標上の長さを、画面微分から接線として復元する。
					vec3 positionDx = dFdx(modelPosition);
					vec3 positionDy = dFdy(modelPosition);
					vec3 tangentU = (positionDx * uvDy.y - positionDy * uvDx.y) / determinant;
					vec3 tangentV = (positionDy * uvDx.x - positionDx * uvDy.x) / determinant;
					vec2 edgeDistanceUv = abs(fract(uv - 0.5) - 0.5);
					return min(
						edgeDistanceUv.x * length(tangentU),
						edgeDistanceUv.y * length(tangentV)
					);
				}

				float silhouetteAlpha() {
					vec3 normalDirection = normalize(vViewNormal);
					vec3 viewDirection = normalize(-vViewPosition);
					float facing = abs(dot(normalDirection, viewDirection));
					float pixelWidth = max(fwidth(facing), 0.00001);
					return 1.0 - smoothstep(0.0, pixelWidth * uSilhouetteWidthPx, facing);
				}

				void main() {
					float distanceToEdge = edgeDistanceInModelSpace(vUv, vModelPosition);
					// fwidthは太さの決定には使わず、境界のアンチエイリアス幅だけに使う。
					float antialiasWidth = max(fwidth(distanceToEdge), 0.00001);
					float uvEdgeAlpha = 1.0 - smoothstep(
						uEdgeThickness - antialiasWidth,
						uEdgeThickness + antialiasWidth,
						distanceToEdge
					);
					float alpha = max(uvEdgeAlpha, silhouetteAlpha());
					if (alpha <= 0.001) discard;
					gl_FragColor = vec4(uEdgeColor, alpha * uEdgeOpacity);
				}
			`,
			transparent: true,
			// 面や他モデルに隠れない、最前面用の描画パスとして扱う。
			depthTest: false,
			depthWrite: false,
			side: THREE.DoubleSide
		});
		material.userData.morivisEdgeOverlayMaterial = true;
		return material;
	};

	private updateEdgeOverlayMaterial = (material: THREE.Material, style: MeshStyle) => {
		if (
			!(material instanceof THREE.ShaderMaterial)
			|| material.userData.morivisEdgeOverlayMaterial !== true
		) {
			return false;
		}

		const edgeUniforms = resolveMeshEdgeUniforms(style);
		material.uniforms.uEdgeColor.value.copy(edgeUniforms.color);
		material.uniforms.uEdgeThickness.value = edgeUniforms.thickness;
		material.uniforms.uSilhouetteWidthPx.value = edgeUniforms.silhouetteWidthPx;
		material.uniforms.uEdgeOpacity.value = edgeUniforms.opacity;
		return true;
	};

	private createEdgeOverlay = (
		mesh: THREE.Mesh,
		materials: THREE.Material[],
		edgeGeometry: THREE.BufferGeometry,
		usesGeneratedUv: boolean
	) => {
		const sourceSkinnedMesh = mesh as THREE.SkinnedMesh;
		const overlayMaterial = Array.isArray(mesh.material) ? materials : materials[0];
		let overlay: THREE.Mesh;
		if (sourceSkinnedMesh.isSkinnedMesh) {
			const skinnedOverlay = new THREE.SkinnedMesh(edgeGeometry, overlayMaterial);
			skinnedOverlay.bindMode = sourceSkinnedMesh.bindMode;
			skinnedOverlay.bind(sourceSkinnedMesh.skeleton, sourceSkinnedMesh.bindMatrix);
			skinnedOverlay.morphTargetInfluences = sourceSkinnedMesh.morphTargetInfluences;
			skinnedOverlay.morphTargetDictionary = sourceSkinnedMesh.morphTargetDictionary;
			overlay = skinnedOverlay;
		} else {
			overlay = new THREE.Mesh(edgeGeometry, overlayMaterial);
			overlay.morphTargetInfluences = mesh.morphTargetInfluences;
			overlay.morphTargetDictionary = mesh.morphTargetDictionary;
		}
		overlay.name = 'morivis-uv-edge-overlay';
		overlay.userData.morivisEdgeOverlay = true;
		overlay.userData.morivisGeneratedEdgeUv = usesGeneratedUv;
		overlay.raycast = () => undefined;
		overlay.renderOrder = 10_000;
		mesh.add(overlay);
		return overlay;
	};

	private disposeEdgeOverlay = (mesh: THREE.Mesh, overlay: THREE.Mesh) => {
		mesh.remove(overlay);
		const materials = Array.isArray(overlay.material) ? overlay.material : [overlay.material];
		materials.forEach((material) => material.dispose());
		if (overlay.userData.morivisGeneratedEdgeUv === true) {
			overlay.geometry.dispose();
		}
	};

	private syncEdgeOverlay = (mesh: THREE.Mesh, style: MeshStyle) => {
		const overlay = mesh.children.find(
			(child) => child.userData.morivisEdgeOverlay === true
		) as THREE.Mesh | undefined;
		const edgeGeometry = !overlay && style.edge?.enabled
			? createEdgeUvGeometry(mesh.geometry)
			: null;
		const enabled = Boolean(style.edge?.enabled) && (overlay != null || edgeGeometry != null);
		if (!enabled) {
			if (!overlay) return;
			this.disposeEdgeOverlay(mesh, overlay);
			return;
		}

		const materialCount = Array.isArray(mesh.material) ? mesh.material.length : 1;
		if (!overlay) {
			if (!edgeGeometry) return;
			const materials = Array.from(
				{ length: materialCount },
				() => this.createEdgeOverlayMaterial(style)
			);
			this.createEdgeOverlay(mesh, materials, edgeGeometry.geometry, edgeGeometry.generated);
			return;
		}

		const currentMaterials = Array.isArray(overlay.material)
			? overlay.material
			: [overlay.material];
		if (
			currentMaterials.length === materialCount
			&& currentMaterials.every((material) => this.updateEdgeOverlayMaterial(material, style))
		) {
			return;
		}

		currentMaterials.forEach((material) => material.dispose());
		const nextMaterials = Array.from(
			{ length: materialCount },
			() => this.createEdgeOverlayMaterial(style)
		);
		overlay.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
	};

	private createShaderMaterial = (
		sourceMaterial: THREE.Material,
		style: MeshStyle,
		objectPartColor?: string,
		useIndexedPartColors = false
	): THREE.ShaderMaterial => {
		const shadingUniforms = resolveMeshShadingUniforms(style);
		const sourceAlpha = minecraftMaterialState(sourceMaterial, style.opacity);
		const objectPartIsTransparent = objectPartColor === 'transparent';
		const baseColor = new THREE.Color(
			objectPartIsTransparent ? style.color : objectPartColor ?? style.color
		);
		if (
			objectPartColor == null
			&& 'color' in sourceMaterial
			&& sourceMaterial.color instanceof THREE.Color
		) {
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
		const partColorTexture = useIndexedPartColors ? this.createPartColorTexture(style) : null;
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
			vertexColors: 'vertexColors' in sourceMaterial && sourceMaterial.vertexColors === true,
			uniforms: {
				uBaseColor: { value: baseColor },
				uOpacity: { value: style.opacity },
				uSourceOpacity: { value: sourceAlpha.sourceOpacity },
				uSourceAlphaTest: { value: sourceAlpha.alphaTest },
				uAmbientStrength: { value: shadingUniforms.ambientStrength },
				uShadeStrength: { value: shadingUniforms.shadeStrength },
				uLightDirection: { value: shadingUniforms.lightDirection },
				uMap: { value: map },
				uUseMap: { value: Boolean(map) },
				uColorRamp: { value: colorRampTexture },
				uUseHeightColorRamp: { value: Boolean(colorRampTexture) },
				uUseObjectPartColor: { value: objectPartColor != null },
				uObjectPartOpacity: { value: objectPartIsTransparent ? 0 : 1 },
				uUsePartColors: { value: useIndexedPartColors },
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
				centroid varying vec2 vUv;
				varying float vPartColorIndex;
				#include <morphtarget_pars_vertex>
				#include <skinning_pars_vertex>
				#include <color_pars_vertex>

				void main() {
					#include <color_vertex>
					vec3 objectNormal = vec3(normal);
					#include <morphnormal_vertex>
					#include <skinbase_vertex>
					#include <skinnormal_vertex>
					vNormal = normalize(normalMatrix * objectNormal);
					vec3 transformed = vec3(position);
					#include <morphtarget_vertex>
					#include <skinning_vertex>
					vUv = uv;
					vPartColorIndex = morivisPartColorIndex;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
				}
			`,
			fragmentShader: `
				uniform vec3 uBaseColor;
				uniform float uOpacity;
				uniform float uSourceOpacity;
				uniform float uSourceAlphaTest;
				uniform float uAmbientStrength;
				uniform float uShadeStrength;
				uniform vec3 uLightDirection;
				uniform sampler2D uMap;
				uniform bool uUseMap;
				uniform sampler2D uColorRamp;
				uniform bool uUseHeightColorRamp;
				uniform bool uUseObjectPartColor;
				uniform float uObjectPartOpacity;
				uniform bool uUsePartColors;
				uniform sampler2D uPartColorPalette;
				uniform float uPartColorPaletteSize;
				uniform float uHeightRampMin;
				uniform float uHeightRampMax;
				uniform float uHeightRampSourceMin;
				uniform float uHeightRampSourceMax;

				varying vec3 vNormal;
				// MSAAの画素中心が微小な面の外にある場合も、アトラスの隣の画像を拾わない。
				centroid varying vec2 vUv;
				varying float vPartColorIndex;
				#include <color_pars_fragment>

				void main() {
					vec4 texel = uUseMap ? texture2D(uMap, vUv) : vec4(1.0);
					#if defined( USE_COLOR_ALPHA )
						texel *= vColor;
					#elif defined( USE_COLOR )
						texel.rgb *= vColor;
					#endif
					if (texel.a < uSourceAlphaTest) discard;
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
						: (
							uUseObjectPartColor
								? uBaseColor
								: (uUseHeightColorRamp ? rampColor : (uBaseColor * texel.rgb))
						);
					vec3 normalDir = normalize(vNormal);
					float diffuse = max(dot(normalDir, normalize(uLightDirection)), 0.0);
					float shade = clamp(uAmbientStrength + diffuse * uShadeStrength, 0.0, 1.0);
					vec3 shadedColor = surfaceColor * shade;
					float objectPartOpacity = uUseObjectPartColor ? uObjectPartOpacity : 1.0;
					float alpha = texel.a * uOpacity * uSourceOpacity * objectPartOpacity;

					if (alpha <= 0.001) discard;

					gl_FragColor = vec4(shadedColor, alpha);
					#include <colorspace_fragment>
				}
			`,
			transparent: sourceAlpha.transparent,
			depthWrite: sourceAlpha.depthWrite,
			wireframe: style.wireframe,
			side: THREE.DoubleSide
		});
		material.userData.morivisShaderShading = true;
		material.userData.morivisMinecraftMaterial = sourceAlpha.enabled;
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
		// THREE.Colorでリニア化した値を格納しているため、サンプリング時のsRGB再変換を避ける。
		texture.colorSpace = THREE.NoColorSpace;
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

	private updateShaderMaterialUniforms = (
		sourceMaterial: THREE.Material,
		material: THREE.Material,
		style: MeshStyle,
		objectPartColor?: string,
		useIndexedPartColors = false
	) => {
		if (
			!(material instanceof THREE.ShaderMaterial)
			|| material.userData.morivisShaderShading !== true
		) {
			return false;
		}

		const shadingUniforms = resolveMeshShadingUniforms(style);
		const objectPartIsTransparent = objectPartColor === 'transparent';
		const baseColor = new THREE.Color(
			objectPartIsTransparent ? style.color : objectPartColor ?? style.color
		);
		if (
			objectPartColor == null
			&& 'color' in sourceMaterial
			&& sourceMaterial.color instanceof THREE.Color
		) {
			baseColor.multiply(sourceMaterial.color);
		}
		const map = 'map' in sourceMaterial && sourceMaterial.map instanceof THREE.Texture
			? sourceMaterial.map
			: null;
		material.uniforms.uBaseColor.value.copy(baseColor);
		material.uniforms.uOpacity.value = style.opacity;
		const sourceAlpha = minecraftMaterialState(sourceMaterial, style.opacity);
		material.uniforms.uSourceOpacity.value = sourceAlpha.sourceOpacity;
		material.uniforms.uSourceAlphaTest.value = sourceAlpha.alphaTest;
		material.transparent = sourceAlpha.transparent;
		material.depthWrite = sourceAlpha.depthWrite;
		material.uniforms.uAmbientStrength.value = shadingUniforms.ambientStrength;
		material.uniforms.uShadeStrength.value = shadingUniforms.shadeStrength;
		material.uniforms.uLightDirection.value.copy(shadingUniforms.lightDirection);
		material.uniforms.uMap.value = map;
		material.uniforms.uUseMap.value = Boolean(map);
		material.uniforms.uUseObjectPartColor.value = objectPartColor != null;
		material.uniforms.uObjectPartOpacity.value = objectPartIsTransparent ? 0 : 1;
		material.uniforms.uUsePartColors.value = useIndexedPartColors;
		material.wireframe = style.wireframe;
		return true;
	};

	private applyStyleToMesh = (
		mesh: THREE.Mesh,
		style: MeshStyle,
		_formatType?: MeshEntry<MeshStyle>['format']['type']
	) => {
		const currentMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
		const originalMaterials = (mesh.userData.originalMaterials as THREE.Material[] | undefined)
			?? currentMaterials.map((material) =>
				typeof material.clone === 'function'
					? material.clone()
					: new THREE.MeshBasicMaterial()
			);

		if (!mesh.userData.originalMaterials) {
			mesh.userData.originalMaterials = originalMaterials;
		}

		const usePartColorMaterial = Boolean(style.partColors?.show)
			&& mesh.geometry.getAttribute('morivisPartColorIndex') != null;
		const objectPartColor = usePartColorMaterial
			? undefined
			: getModelPartColor(style.partColors, getModelObjectAttributes(mesh));
		this.syncEdgeOverlay(mesh, style);
		const hasExistingShaderMaterials = currentMaterials.every((material, index) =>
			this.updateShaderMaterialUniforms(
				originalMaterials[index],
				material,
				style,
				objectPartColor,
				usePartColorMaterial
			)
		);
		if (hasExistingShaderMaterials && !style.heightColorRamp?.enabled) {
			currentMaterials.forEach((material) => {
				const shaderMaterial = material as THREE.ShaderMaterial;
				shaderMaterial.uniforms.uUseHeightColorRamp.value = false;
			});
			if (
				!usePartColorMaterial
				|| currentMaterials.every((material) =>
					this.updatePartColorPalette(material, style)
				)
			) {
				currentMaterials.forEach((material) => {
					const shaderMaterial = material as THREE.ShaderMaterial;
					shaderMaterial.uniforms.uUsePartColors.value = usePartColorMaterial;
				});
				return;
			}
		}

		// 陰影の有無で材質種別を変えると、部材数の多いモデルでGPUプログラムの再構築と切替が増える。
		// 常に同じシェーダーを使い、通常の陰影切替はuniform値だけを更新する。
		const nextMaterials = originalMaterials.map((sourceMaterial) =>
			this.createShaderMaterial(
				sourceMaterial,
				style,
				objectPartColor,
				usePartColorMaterial
			)
		);

		mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
		currentMaterials.forEach((material) => {
			const colorRampTexture = material.userData?.colorRampTexture;
			if (colorRampTexture instanceof THREE.Texture) {
				colorRampTexture.dispose();
			}
			if (typeof material.dispose === 'function') material.dispose();
		});
	};

	applyStyleToObject = (
		object: THREE.Object3D,
		style: MeshStyle,
		formatType?: MeshEntry<MeshStyle>['format']['type']
	) => {
		if (formatType === 'fbx') {
			setFbxCurveVisibility(object, style.showFbxCurves !== false);
			setFbxTextStyle(object, style.showFbxText !== false, style.opacity);
		}
		object.traverse((child) => {
			if (
				(child as THREE.Mesh).isMesh
				&& !child.userData.morivisSelectionHighlight
				&& !child.userData.morivisEdgeOverlay
				&& !child.userData.morivisFbxText
			) {
				this.applyStyleToMesh(child as THREE.Mesh, style, formatType);
			}
		});
	};

	applyIfcPartColors = async (object: THREE.Object3D, style: MeshStyle) => {
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
							ifcType: await ifcModel.ifcManager!.getIfcType(
								ifcModel.modelID!,
								expressId
							)
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
			const signature = `${expression.key}\u0000${
				expression.mapping.categories.join('\u0000')
			}`;
			if (mesh.geometry.userData.morivisPartColorSignature === signature) return;
			const colorIndexes = new Float32Array(expressIdAttribute.count);
			for (let index = 0; index < expressIdAttribute.count; index += 1) {
				const partAttributes = object.userData.morivisIfcPartAttributes as
					| Map<number, ModelAttributes>
					| undefined;
				const value = expression.key === 'IFC クラス'
					? classesByExpressId.get(expressIdAttribute.getX(index))
					: partAttributes?.get(expressIdAttribute.getX(index))?.[expression.key];
				colorIndexes[index] =
					categoryIndexes.get(typeof value === 'boolean' ? String(value) : (value ?? ''))
						?? 0;
			}
			mesh.geometry.setAttribute(
				'morivisPartColorIndex',
				new THREE.BufferAttribute(colorIndexes, 1)
			);
			mesh.geometry.userData.morivisPartColorSignature = signature;
		});
	};

	disposeModelObject = (object: THREE.Object3D) => {
		const disposedTextures = new Set<THREE.Texture>();
		object.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh && !(child as THREE.Points).isPoints) return;

			const drawable = child as THREE.Mesh | THREE.Points;
			if (
				!drawable.userData.morivisEdgeOverlay
				|| drawable.userData.morivisGeneratedEdgeUv === true
			) {
				drawable.geometry.dispose();
			}
			const materials = Array.isArray(drawable.material)
				? drawable.material
				: [drawable.material];
			materials.forEach((material) => {
				const map = (material as THREE.MeshBasicMaterial).map;
				if (
					map && isGeneratedFbxTextTexture(map) && !disposedTextures.has(map)
				) {
					map.dispose();
					disposedTextures.add(map);
				}
				material.dispose();
			});
			const originalMaterials = drawable.userData.originalMaterials as
				| THREE.Material[]
				| undefined;
			originalMaterials?.forEach((material) => material.dispose());
		});
	};
}
