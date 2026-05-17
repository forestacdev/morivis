import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import {
	DEFAULT_MESH_SHADING,
	type MeshShadingStyle,
	type ModelMeshEntry,
	type MeshStyle
} from '$routes/map/data/types/model';
import {
	calculateModelTransform,
	type ModelTransform
} from '$routes/map/utils/three/model-transform';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';

interface LoadedModel {
	entry: ModelMeshEntry<MeshStyle>;
	object: THREE.Object3D;
	transform: ModelTransform;
	mixer?: THREE.AnimationMixer;
	actions?: THREE.AnimationAction[];
	lastClipIndex?: number;
}

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
	private map: MapLibreMap | null = null;
	private loadedModels: Map<string, LoadedModel> = new Map();
	private loader = new GLTFLoader();
	private isInitialized = false;
	private colorMapManager = new ColorMapManager();
	private lastRenderTimeMs: number | null = null;

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
			colorRamp?.enabled && colorRamp.max > colorRamp.min
				? new THREE.DataTexture(
						colorRampRgbaArray,
						1,
						256,
						THREE.RGBAFormat,
						THREE.UnsignedByteType
					)
				: null;
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
				uHeightRampMin: { value: colorRamp?.min ?? 0 },
				uHeightRampMax: { value: colorRamp?.max ?? 1 },
				uHeightRampSourceMin: { value: colorRamp?.sourceMin ?? colorRamp?.min ?? 0 },
				uHeightRampSourceMax: { value: colorRamp?.sourceMax ?? colorRamp?.max ?? 1 }
			},
			vertexShader: `
				varying vec3 vNormal;
				varying vec2 vUv;

				void main() {
					vNormal = normalize(normalMatrix * normal);
					vUv = uv;
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
				uniform float uHeightRampMin;
				uniform float uHeightRampMax;
				uniform float uHeightRampSourceMin;
				uniform float uHeightRampSourceMax;

				varying vec3 vNormal;
				varying vec2 vUv;

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
					vec3 surfaceColor = uUseHeightColorRamp ? rampColor : (uBaseColor * texel.rgb);
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
			side: sourceMaterial.side
		});
		material.userData.morivisShaderShading = true;
		material.userData.colorRampTexture = colorRampTexture;
		return material;
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
			side: sourceMaterial.side
		});
		material.transparent = true;
		material.opacity = style.opacity;
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
		if ('wireframe' in material) {
			material.wireframe = style.wireframe;
		}
		return material;
	};

	private applyStyleToMesh = (mesh: THREE.Mesh, style: MeshStyle) => {
		const currentMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
		const originalMaterials =
			(mesh.userData.originalMaterials as THREE.Material[] | undefined) ??
			currentMaterials.map((material) => material.clone());

		if (!mesh.userData.originalMaterials) {
			mesh.userData.originalMaterials = originalMaterials;
		}

		const useShaderMaterial =
			Boolean(style.shading?.enabled) || Boolean(style.heightColorRamp?.enabled);
		const isSkinnedMesh = (mesh as THREE.SkinnedMesh).isSkinnedMesh === true;

		const nextMaterials = originalMaterials.map((sourceMaterial) =>
			isSkinnedMesh
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

	private applyStyleToObject = (object: THREE.Object3D, style: MeshStyle) => {
		object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				this.applyStyleToMesh(child as THREE.Mesh, style);
			}
		});
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
					this.renderer.outputColorSpace = THREE.SRGBColorSpace;
					this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
					this.renderer.toneMappingExposure = 1.0;

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
				const nowMs = performance.now();
				const deltaSeconds =
					this.lastRenderTimeMs == null ? 0 : Math.max((nowMs - this.lastRenderTimeMs) / 1000, 0);
				this.lastRenderTimeMs = nowMs;
				let hasPlayingAnimation = false;

				this.loadedModels.forEach((loaded) => {
					if (loaded.entry.state?.animation?.playing && loaded.mixer) {
						loaded.mixer.update(deltaSeconds);
						hasPlayingAnimation = true;
					}
				});

				this.loadedModels.forEach((loaded) => {
					const { transform } = loaded;

					const rotationX = new THREE.Matrix4().makeRotationAxis(
						new THREE.Vector3(1, 0, 0),
						transform.rotateX
					);
					const rotationY = new THREE.Matrix4().makeRotationAxis(
						new THREE.Vector3(0, 1, 0),
						transform.rotateY
					);
					const rotationZ = new THREE.Matrix4().makeRotationAxis(
						new THREE.Vector3(0, 0, 1),
						transform.rotateZ
					);
					const scaleMatrix = new THREE.Matrix4().makeScale(
						transform.scaleX,
						-transform.scaleY,
						transform.scaleZ
					);

					const modelMatrix = new THREE.Matrix4()
						.makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
						.multiply(rotationX)
						.multiply(rotationY)
						.multiply(rotationZ)
						.multiply(scaleMatrix);

					const projectionMatrix = new THREE.Matrix4().fromArray(
						args.defaultProjectionData.mainMatrix
					);
					this.camera!.projectionMatrix = projectionMatrix.multiply(modelMatrix);

					this.modelGroup!.traverse((child) => {
						if (child.userData.entryId) {
							child.visible = child.userData.entryId === loaded.entry.id;
						}
					});

					this.renderer!.resetState();
					this.renderer!.render(this.scene!, this.camera!);
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
	addModel(entry: ModelMeshEntry<MeshStyle>, _type: 'main' | 'preview' = 'main'): Promise<void> {
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

			const onModelLoaded = (
				model: THREE.Group | THREE.Object3D,
				animations: THREE.AnimationClip[] = []
			) => {
				this.applyStyleToObject(model, entry.style);

				model.visible = entry.style.visible ?? true;
				model.userData.entryId = entry.id;
				const loaded: LoadedModel = {
					entry,
					object: model,
					transform
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
				resolve();
			};

			if (entry.format.type === 'obj') {
				const objLoader = new OBJLoader();
				const loadObj = () => {
					objLoader.load(
						entry.format.url,
						(obj) => onModelLoaded(obj),
						undefined,
						(error) => reject(error)
					);
				};

				if (entry.format.mtlUrl) {
					const mtlLoader = new MTLLoader();
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
			} else {
				this.loader.load(
					entry.format.url,
					(gltf) => onModelLoaded(gltf.scene, gltf.animations),
					undefined,
					(error) => reject(error)
				);
			}
		});
	}

	/** 複数のモデルを追加 */
	async addModels(entries: ModelMeshEntry<MeshStyle>[]): Promise<void> {
		await Promise.all(entries.map((entry) => this.addModel(entry)));
	}

	updateTransform(entries: ModelMeshEntry<MeshStyle>[]): void {
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

		loaded.object.parent?.remove(loaded.object);
		loaded.object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				mesh.geometry.dispose();
				const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				materials.forEach((mat) => mat.dispose());
				const originalMaterials = mesh.userData.originalMaterials as THREE.Material[] | undefined;
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
	async replaceModels(entries: ModelMeshEntry<MeshStyle>[]): Promise<void> {
		this.clearAllModels();
		await this.addModels(entries);
	}

	/** モデルの表示/非表示を切り替え */
	setModelVisibility(entryId: string, visible: boolean): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;

		loaded.object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				materials.forEach((material) => {
					material.visible = visible;
				});
			}
		});
	}

	/** モデルの不透明度を変更 */
	setModelOpacity(entryId: string, opacity: MeshStyle['opacity']): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.entry = { ...loaded.entry, style: { ...loaded.entry.style, opacity } };
		this.applyStyleToObject(loaded.object, loaded.entry.style);
		this.syncAnimationState(loaded);
	}

	setModelWireframe(entryId: string, wireframe: boolean): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.entry = { ...loaded.entry, style: { ...loaded.entry.style, wireframe } };
		this.applyStyleToObject(loaded.object, loaded.entry.style);
		this.syncAnimationState(loaded);
	}

	setModelColor(entryId: string, color: string): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.entry = { ...loaded.entry, style: { ...loaded.entry.style, color } };
		this.applyStyleToObject(loaded.object, loaded.entry.style);
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

	setModelAnimationState(entry: ModelMeshEntry<MeshStyle>): void {
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
		this.clearAllModels();
		if (this.renderer) {
			this.renderer.dispose();
			this.renderer = null;
		}
		this.modelGroup = null;
		this.previewModelGroup = null;
		this.loadedModels.clear();
		this.scene = null;
		this.camera = null;
		this.map = null;
		this.isInitialized = false;
		this.lastRenderTimeMs = null;
	}

	/** 初期化済みかどうか */
	get initialized(): boolean {
		return this.isInitialized;
	}

	/** ロード済みモデルのIDリスト */
	get modelIds(): string[] {
		return Array.from(this.loadedModels.keys());
	}
}

export const threeJsManager = new ThreeJsLayerManager();
