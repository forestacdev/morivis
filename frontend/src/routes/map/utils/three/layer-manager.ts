import type {
	IfcPartColorProfile,
	MeshEntry,
	MeshStyle,
	ModelTransformStyle,
	ThreeModelEntry
} from '$routes/map/data/types/model';
import type { CustomLayerInterface, Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { applyGaussianSplatStyle } from '$routes/map/utils/three/gaussian-splat-renderer';
import {
	getInitialModelAnimationState,
	isEmbeddedModelAnimationClip,
	isVmdModelAnimationClip,
	isVpdModelAnimationClip,
	isVrmaModelAnimationClip
} from '$routes/map/utils/three/model-animation';
import { getIfcAttributes, type ModelAttributes } from '$routes/map/utils/three/model-attributes';
import { resolveModelLodUrl } from '$routes/map/utils/three/model-lod';
import type { ModelPlacementTransform } from '$routes/map/utils/three/model-placement-scale';
import type { ModelTransform } from '$routes/map/utils/three/model-transform';
import { centerObjectToLocalOrigin } from '$routes/map/utils/three/object-normalization';
import {
	applyPmxAnimationClip,
	clearPmxAnimationClip,
	type LoadedPmxModel,
	loadPmxAnimationClip
} from '$routes/map/utils/three/pmx-loader';
import {
	applyPmxMorphState,
	getPmxMorphCatalog,
	normalizePmxMorphWeights
} from '$routes/map/utils/three/pmx-morphs';
import { loadVrmAnimationClip } from '$routes/map/utils/three/vrm-loader';
import { buildVectorTileColorExpressions } from '$routes/map/utils/vector/tile-style';
import { removePmxMorphCatalog, setPmxMorphCatalog } from '$routes/stores/pmx-morphs';
import type { VRM } from '@pixiv/three-vrm';
import type { ThreeMmdAnimation } from '@yohawing/three-mmd-loader/three';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildMercatorModelMatrix } from './mercator-model-matrix';
import { ModelInteractionController } from './model-interaction-controller';
import { loadWebIfcModule, ModelLoader } from './model-loader';
import { ModelMaterials } from './model-materials';
import { ModelPlacementController } from './model-placement-controller';
import { ModelRenderer } from './model-renderer';
import { isMeshModelEntry, type LoadedModel } from './model-runtime-types';

const MMD_ANIMATION_FRAME_RATE = 30;

const getMmdAnimationDurationSeconds = (animation: ThreeMmdAnimation) => {
	const maxFrame = animation.animation.kind === 'vmd' ? animation.animation.metadata.maxFrame : 0;
	return maxFrame > 0 ? maxFrame / MMD_ANIMATION_FRAME_RATE : undefined;
};

export type {
	ModelViewCameraOptions,
	ModelViewSession,
	PickedLowerDetailLod,
	PickedModelFeature
} from './model-interaction-controller';
const IFC_ATTRIBUTE_BATCH_SIZE = 32;

const getIfcPartColorProfile = (entry: MeshEntry<MeshStyle>): IfcPartColorProfile | undefined =>
	entry.properties?.ifc?.extractionProfiles.find(
		(profile): profile is IfcPartColorProfile => profile.type === 'part-colors'
	);

/**
 * Three.js レイヤーマネージャー
 * モデル登録とアニメーションを管理し、読み込み・描画・操作のライフサイクルをつなぐ。
 */
export class ThreeJsLayerManager {
	private readonly modelRenderer = new ModelRenderer();
	private readonly placement = new ModelPlacementController({
		isModelViewActive: () => this.activeModelView !== null,
		onModelTransform: (entryId, style) => this.setModelTransform(entryId, style)
	});
	private calculateTransform = (style: ModelTransformStyle): ModelTransform => ({
		matrix: buildMercatorModelMatrix(style.transform, Boolean(this.map?.getTerrain()))
	});

	private readonly modelLoader = new ModelLoader();
	private readonly materials = new ModelMaterials();
	private get camera() {
		return this.modelRenderer.camera;
	}
	private get scene() {
		return this.modelRenderer.scene;
	}
	private get modelGroup() {
		return this.modelRenderer.modelGroup;
	}
	private get previewModelGroup() {
		return this.modelRenderer.previewModelGroup;
	}
	private get renderer() {
		return this.modelRenderer.renderer;
	}

	private map: MapLibreMap | null = null;
	private loadedModels: Map<string, LoadedModel> = new Map();
	private pendingModelLoads = new Map<string, { token: symbol; type: 'main' | 'preview'; }>();
	private readonly interaction = new ModelInteractionController(
		this.modelRenderer,
		this.loadedModels
	);

	private lastRenderTimeMs: number | null = null;
	private repaintBurstHandle: number | null = null;

	private ifcPartAttributeLoads = new Map<string, Promise<number>>();
	private highDetailModelLoads = new Set<string>();
	private get activeModelView() {
		return this.interaction.view;
	}

	private getModelLodUrl = (entry: MeshEntry<MeshStyle>) => {
		return resolveModelLodUrl(
			entry.format.url,
			entry.format.lods,
			this.map?.getZoom() ?? Number.POSITIVE_INFINITY
		);
	};

	private requestModelLod = (
		loaded: LoadedModel & { entry: MeshEntry<MeshStyle>; },
		nextUrl = this.getModelLodUrl(loaded.entry)
	): Promise<void> => {
		if (loaded.entry.format.type !== 'gltf' || !loaded.entry.format.lods?.length) {
			return Promise.resolve();
		}

		if (loaded.lod?.activeUrl === nextUrl || loaded.lod?.failedUrl === nextUrl) {
			return Promise.resolve();
		}
		if (loaded.lod?.pendingUrl === nextUrl) {
			return loaded.lod.pendingLoad ?? Promise.resolve();
		}

		const pendingLoad = this.modelLoader.load(loaded.entry, { lodUrl: nextUrl })
			.then(({ animations, object: scene }) => {
				const current = this.loadedModels.get(loaded.entry.id);
				if (current !== loaded || current.lod?.pendingUrl !== nextUrl) {
					this.disposeModelObject(scene);
					return;
				}

				const previousObject = loaded.object;
				const parent = previousObject.parent;
				if (!parent) {
					this.disposeModelObject(scene);
					loaded.lod = { activeUrl: loaded.lod?.activeUrl ?? loaded.entry.format.url };
					return;
				}

				this.applyStyleToObject(scene, loaded.entry.style, loaded.entry.format.type);
				scene.visible = previousObject.visible;
				scene.userData.entryId = loaded.entry.id;

				if (
					this.interaction.hasHighlightIn(previousObject)
				) {
					this.clearModelHighlight();
				}

				parent.add(scene);
				parent.remove(previousObject);
				this.disposeModelObject(previousObject);
				loaded.object = scene;
				loaded.lod = { activeUrl: nextUrl };

				loaded.mixer?.stopAllAction();
				if (animations.length > 0) {
					loaded.mixer = new THREE.AnimationMixer(scene);
					loaded.actions = animations.map((clip) => loaded.mixer!.clipAction(clip));
				} else {
					delete loaded.mixer;
					delete loaded.actions;
				}
				delete loaded.lastAnimationLoop;
				delete loaded.lastAnimationPlaying;
				delete loaded.lastClipIndex;
				this.syncAnimationState(loaded);
				this.requestRepaintBurst(30);
			})
			.catch((error) => {
				const current = this.loadedModels.get(loaded.entry.id);
				if (current !== loaded || current.lod?.pendingUrl !== nextUrl) return;
				loaded.lod = {
					activeUrl: loaded.lod?.activeUrl ?? loaded.entry.format.url,
					failedUrl: nextUrl
				};
				console.error(`LODモデルの読み込みに失敗しました: ${nextUrl}`, error);
			});
		loaded.lod = {
			...loaded.lod,
			activeUrl: loaded.lod?.activeUrl ?? loaded.entry.format.url,
			pendingLoad,
			pendingUrl: nextUrl
		};
		return pendingLoad;
	};

	private updateModelLods = () => {
		if (this.activeModelView) return;
		this.loadedModels.forEach((loaded) => {
			if (!isMeshModelEntry(loaded.entry) || this.highDetailModelLoads.has(loaded.entry.id)) {
				return;
			}
			void this.requestModelLod(loaded as LoadedModel & { entry: MeshEntry<MeshStyle>; });
		});
	};

	private applyStyleToObject = (
		object: THREE.Object3D,
		style: MeshStyle,
		formatType?: MeshEntry<MeshStyle>['format']['type']
	) => {
		this.materials.applyStyleToObject(object, style, formatType);
		this.map?.triggerRepaint();
	};

	private applyIfcPartColors = (object: THREE.Object3D, style: MeshStyle) =>
		this.materials.applyIfcPartColors(object, style);

	clearModelHighlight = (
		...args: Parameters<ModelInteractionController['clearModelHighlight']>
	): ReturnType<ModelInteractionController['clearModelHighlight']> =>
		this.interaction.clearModelHighlight(...args);

	/** BCF が保持する IFC GlobalId から、読み込み済みIFCの対象部材をハイライトする。 */
	highlightIfcGlobalId = (
		...args: Parameters<ModelInteractionController['highlightIfcGlobalId']>
	): ReturnType<ModelInteractionController['highlightIfcGlobalId']> =>
		this.interaction.highlightIfcGlobalId(...args);

	/** BCFの選択部材をまとめてハイライトする。 */
	highlightIfcGlobalIds = (
		...args: Parameters<ModelInteractionController['highlightIfcGlobalIds']>
	): ReturnType<ModelInteractionController['highlightIfcGlobalIds']> =>
		this.interaction.highlightIfcGlobalIds(...args);

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
		this.syncPmxMorphState(loaded);
		this.syncVrmAnimationState(loaded);
		if (!loaded.mixer || !loaded.actions || loaded.actions.length === 0) return;

		const animationState = loaded.entry.state?.animation;
		const clips = loaded.entry.properties?.animation?.clips;
		const selectedClip = clips?.[
			Math.min(
				Math.max(animationState?.currentClipIndex ?? 0, 0),
				Math.max(clips.length - 1, 0)
			)
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
					loaded.lastClipIndex !== clipIndex
					|| loaded.lastAnimationLoop !== loop
					|| (!loaded.lastAnimationPlaying && playing)
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

		const runtime = vrmAnimation ?? {
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
			const shouldReset = runtime.activeClipIndex !== clipIndex
				|| runtime.lastLoop !== animationState.loop
				|| (!runtime.lastPlaying && animationState.playing);
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
					runtime.loadingClipIndex !== clipIndex
					|| this.loadedModels.get(loaded.entry.id) !== loaded
					|| loaded.entry.state?.animation?.currentClipIndex !== clipIndex
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

	private syncPmxMorphState = (loaded: LoadedModel, force = false) => {
		const mmd = loaded.mmd;
		if (!mmd) return;
		const options = mmd.morphCatalog.options;
		const weights = normalizePmxMorphWeights(loaded.entry.state?.pmxMorphWeights, options);
		const key = JSON.stringify([mmd.activeClipIndex ?? -1, weights]);
		if (!force && mmd.morphStateKey === key) return;
		const hadOverride = mmd.morphOverridesActive;
		mmd.morphOverridesActive = Object.keys(weights).length > 0;
		mmd.morphStateKey = key;
		if (!mmd.morphOverridesActive && !hadOverride) return;
		const index = mmd.activeClipIndex ?? -1;
		const clip = loaded.entry.properties?.animation?.clips[index];
		applyPmxMorphState(
			mmd.model.model,
			options,
			weights,
			mmd.animations.get(index),
			mmd.elapsedSeconds,
			isVpdModelAnimationClip(clip),
			isVpdModelAnimationClip(clip) ? clip.ik : undefined
		);
		this.map?.triggerRepaint();
	};

	private syncMmdAnimationState = (loaded: LoadedModel) => {
		const mmd = loaded.mmd;
		const animationState = loaded.entry.state?.animation;
		const clips = loaded.entry.properties?.animation?.clips;
		if (!mmd || !animationState || !clips?.length) return;
		if (animationState.currentClipIndex === -1) {
			mmd.loadingClipIndex = undefined;
			if (mmd.activeClipIndex !== -1) {
				clearPmxAnimationClip(mmd.model.model);
				mmd.activeClipIndex = -1;
				mmd.elapsedSeconds = 0;
				mmd.durationSeconds = undefined;
				mmd.lastPlaying = false;
				this.map?.triggerRepaint();
			}
			return;
		}

		const clipIndex = Math.min(Math.max(animationState.currentClipIndex, 0), clips.length - 1);
		const clip = clips[clipIndex];
		if (!clip || (!isVmdModelAnimationClip(clip) && !isVpdModelAnimationClip(clip))) return;
		if (mmd.activeClipIndex === clipIndex) {
			mmd.loadingClipIndex = undefined;
			if (!mmd.lastPlaying && animationState.playing && animationState.loop === false) {
				mmd.elapsedSeconds = 0;
			}
			mmd.lastPlaying = animationState.playing;
			return;
		}
		if (mmd.loadingClipIndex === clipIndex) return;
		const cachedAnimation = mmd.animations.get(clipIndex);
		if (cachedAnimation) {
			applyPmxAnimationClip(
				mmd.model.model,
				cachedAnimation,
				isVpdModelAnimationClip(clip),
				isVpdModelAnimationClip(clip) ? clip.ik : undefined
			);
			mmd.loadingClipIndex = undefined;
			mmd.activeClipIndex = clipIndex;
			mmd.elapsedSeconds = 0;
			mmd.durationSeconds = getMmdAnimationDurationSeconds(cachedAnimation);
			mmd.lastPlaying = animationState.playing;
			this.map?.triggerRepaint();
			return;
		}

		mmd.loadingClipIndex = clipIndex;
		void loadPmxAnimationClip(mmd.model.loader, clip)
			.then((animation) => {
				if (
					mmd.loadingClipIndex !== clipIndex
					|| this.loadedModels.get(loaded.entry.id) !== loaded
					|| loaded.entry.state?.animation?.currentClipIndex !== clipIndex
				) {
					return;
				}

				applyPmxAnimationClip(
					mmd.model.model,
					animation,
					isVpdModelAnimationClip(clip),
					isVpdModelAnimationClip(clip) ? clip.ik : undefined
				);
				mmd.animations.set(clipIndex, animation);
				mmd.activeClipIndex = clipIndex;
				mmd.loadingClipIndex = undefined;
				mmd.elapsedSeconds = 0;
				mmd.durationSeconds = getMmdAnimationDurationSeconds(animation);
				mmd.lastPlaying = loaded.entry.state?.animation?.playing;
				this.syncPmxMorphState(loaded, true);
				this.map?.triggerRepaint();
			})
			.catch((error) => {
				if (mmd.loadingClipIndex !== clipIndex) return;
				mmd.loadingClipIndex = undefined;
				console.error(`MMDモーション・ポーズの読み込みに失敗しました: ${clip.name}`, error);
			});
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
			const opacity = (typeof material.uniforms.uOpacity?.value === 'number'
				? material.uniforms.uOpacity.value
				: style.opacity) * (material.uniforms.uSourceOpacity?.value ?? 1);

			return new THREE.MeshStandardMaterial({
				color: baseColor,
				map,
				transparent: material.userData.morivisMinecraftMaterial
					? material.transparent
					: opacity < 1,
				alphaTest: material.uniforms.uSourceAlphaTest?.value ?? 0,
				vertexColors: material.userData.morivisMinecraftMaterial === true
					&& material.vertexColors,
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
		loaded: LoadedModel & { entry: MeshEntry<MeshStyle>; }
	): () => void => {
		const originalPosition = loaded.object.position.clone();
		const originalMaterials: Array<{
			mesh: THREE.Mesh;
			material: THREE.Material | THREE.Material[];
		}> = [];
		const exportMaterials: THREE.Material[] = [];
		const originalOverlayVisibility: Array<{ mesh: THREE.Mesh; visible: boolean; }> = [];

		loaded.object.traverse((child) => {
			if (!(child as THREE.Mesh).isMesh) return;

			const mesh = child as THREE.Mesh;
			if (mesh.userData.morivisEdgeOverlay) {
				originalOverlayVisibility.push({ mesh, visible: mesh.visible });
				mesh.visible = false;
				return;
			}
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
			originalOverlayVisibility.forEach(({ mesh, visible }) => {
				mesh.visible = visible;
			});
			originalMaterials.forEach(({ mesh, material }) => {
				mesh.material = material;
			});
			exportMaterials.forEach((material) => material.dispose());
			loaded.object.position.copy(originalPosition);
			loaded.object.updateMatrixWorld(true);
		};
	};

	setPlacementTransformChangeHandler = (
		handler: ((transform: ModelPlacementTransform) => void) | null
	): void => {
		this.placement.setPlacementTransformChangeHandler(handler);
	};

	setPlacementPreview = (
		entry: ThreeModelEntry,
		style = entry.style,
		options: { showTransformHandles?: boolean; } = {}
	): void => {
		this.placement.setPlacementPreview(entry, style, options);
	};

	clearPlacementPreview = (): void => {
		this.placement.clearPlacementPreview();
	};

	private updateAnimations = () => {
		const nowMs = performance.now();
		const deltaSeconds = this.lastRenderTimeMs == null
			? 0
			: Math.max((nowMs - this.lastRenderTimeMs) / 1000, 0);
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
			const isPlayingEmbeddedAnimation = animationState?.playing
				&& isEmbeddedModelAnimationClip(selectedClip);

			if (isPlayingEmbeddedAnimation && loaded.mixer) {
				loaded.mixer.update(deltaSeconds);
				hasPlayingAnimation = true;
			}
			if (animationState?.playing && loaded.vrmAnimation?.activeClipIndex != null) {
				loaded.vrmAnimation.mixer.update(deltaSeconds);
				hasPlayingAnimation = true;
			}
			if (
				animationState?.playing
				&& loaded.vrm
				&& (isPlayingEmbeddedAnimation || loaded.vrmAnimation?.activeClipIndex != null)
			) {
				loaded.vrm.update(deltaSeconds);
				hasPlayingAnimation = true;
			}
			if (
				loaded.entry.state?.animation?.playing
				&& loaded.mmd?.activeClipIndex != null
				&& loaded.mmd.activeClipIndex >= 0
				&& !isVpdModelAnimationClip(
					loaded.entry.properties?.animation?.clips[loaded.mmd.activeClipIndex]
				)
			) {
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

	/** カスタムレイヤーを作成（初期化用） */
	createLayer = (): CustomLayerInterface => ({
		id: '3d-model-layer',
		type: 'custom',
		renderingMode: '3d',
		onAdd: (map, gl) => {
			this.map = map;
			this.interaction.attach(map);
			this.modelRenderer.initialize(map.getCanvas(), gl);
			this.modelLoader.detectSupport(this.renderer!);
			this.placement.attach(map, this.scene!, this.camera!);
		},
		render: (_gl, args) => {
			if (!this.scene || !this.camera || !this.renderer) return;
			this.placement.hide();
			if (this.loadedModels.size === 0 && !this.placement.hasPreview) return;
			const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
			this.interaction.setProjection(projection);
			this.placement.setProjection(projection);
			const hasPlayingAnimation = this.updateAnimations();
			if (this.activeModelView) {
				this.modelRenderer.renderActiveModelView(this.loadedModels, this.activeModelView);
			} else {
				this.updateModelLods();
				if (this.placement.hasPreview) {
					this.modelRenderer.setOnlyEntryVisible('', false);
					this.placement.render(projection, this.renderer);
				}
				this.modelRenderer.renderModels(
					this.loadedModels,
					projection,
					this.map?.getCanvas().clientHeight
				);
			}
			if (hasPlayingAnimation) this.map?.triggerRepaint();
		},
		onRemove: () => {
			this.interaction.detach();
			this.placement.detach();
			this.clearAllModels();
		}
	});

	/** モデルを追加。プレビューに同じIDのモデルがあれば再利用する */
	addModel(entry: ThreeModelEntry, _type: 'main' | 'preview' = 'main'): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.modelGroup || !this.previewModelGroup) {
				reject(new Error('modelGroup not initialized'));
				return;
			}

			const transform = this.calculateTransform(entry.style);

			if (_type === 'main') {
				const existing = this.loadedModels.get(entry.id);
				if (existing && existing.object.parent === this.previewModelGroup) {
					this.previewModelGroup.remove(existing.object);
					this.modelGroup.add(existing.object);
					void this.setModelStyle(entry).then(() => {
						this.requestRepaintBurst(30);
						resolve();
					}).catch(reject);
					return;
				}
			}

			const existing = this.loadedModels.get(entry.id);
			if (existing) {
				const isInPreview = existing.object.parent === this.previewModelGroup;
				const isInMain = existing.object.parent === this.modelGroup;
				if ((_type === 'preview' && isInPreview) || (_type === 'main' && isInMain)) {
					void this.setModelStyle(entry).then(() => {
						this.requestRepaintBurst(30);
						resolve();
					}).catch(reject);
					return;
				}
			}

			const loadToken = Symbol(entry.id);
			this.pendingModelLoads.set(entry.id, { token: loadToken, type: _type });
			const onModelLoaded = async (
				model: THREE.Group | THREE.Object3D,
				animations: THREE.AnimationClip[] = [],
				resolveAttributes?: (
					hit: THREE.Intersection<THREE.Object3D>
				) => Promise<ModelAttributes>,
				mmdModel?: LoadedPmxModel,
				vrm?: VRM,
				lodUrl?: string
			) => {
				if (isMeshModelEntry(entry)) {
					if (entry.format.type === 'ifc') {
						await this.applyIfcPartColors(model, entry.style);
					}
					this.applyStyleToObject(model, entry.style, entry.format.type);
				} else {
					applyGaussianSplatStyle(model, entry.style, this.map?.getCanvas().clientHeight);
				}

				if (this.pendingModelLoads.get(entry.id)?.token !== loadToken) {
					this.disposeModelObject(model);
					resolve();
					return;
				}
				this.pendingModelLoads.delete(entry.id);
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
							morphCatalog: getPmxMorphCatalog(mmdModel.model),
							elapsedSeconds: 0
						}
					}),
					...(vrm && { vrm }),
					...(lodUrl && entry.format.type === 'gltf' && entry.format.lods?.length
						? { lod: { activeUrl: lodUrl } }
						: {}),
					resolveAttributes
				};
				if (animations.length > 0) {
					loaded.mixer = new THREE.AnimationMixer(model);
					loaded.actions = animations.map((clip) => loaded.mixer!.clipAction(clip));
				}
				if (isMeshModelEntry(entry) && !loaded.entry.state?.animation) {
					const animationState = getInitialModelAnimationState(
						entry.properties?.animation
					);
					if (animationState) {
						loaded.entry.state = {
							...loaded.entry.state,
							animation: animationState
						};
					}
				}
				this.loadedModels.set(entry.id, loaded);
				if (loaded.mmd) setPmxMorphCatalog(entry.id, loaded.mmd.morphCatalog);
				this.syncAnimationState(loaded);
				if (_type === 'preview') {
					this.previewModelGroup!.add(model);
				} else {
					this.modelGroup!.add(model);
				}
				if (
					isMeshModelEntry(entry)
					&& entry.format.type === 'ifc'
					&& entry.properties?.ifc?.extractionProfiles.length
				) {
					void this.preloadIfcProfiles(entry).catch((error) => {
						console.error('IFC事前定義属性の読み込みに失敗しました', error);
					});
				}
				this.requestRepaintBurst(
					isMeshModelEntry(entry)
						&& (entry.format.type === 'fbx' || entry.format.type === 'pmx')
						? 180
						: 30
				);
				resolve();
			};

			this.modelLoader.load(entry, {
				lodUrl: isMeshModelEntry(entry) ? this.getModelLodUrl(entry) : undefined,
				onResourcesLoaded: () => {
					if (this.map) this.requestRepaintBurst(180);
				}
			}).then(asset =>
				onModelLoaded(
					asset.object,
					asset.animations,
					asset.resolveAttributes,
					asset.mmdModel,
					asset.vrm,
					asset.lodUrl
				)
			).catch(error => {
				if (this.pendingModelLoads.get(entry.id)?.token === loadToken) {
					this.pendingModelLoads.delete(entry.id);
				}
				reject(error);
			});
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

			const transform = this.calculateTransform(entry.style);
			loaded.transform = transform;
			loaded.entry = entry;
			this.syncAnimationState(loaded);
		});
	}

	private disposeModelObject = (object: THREE.Object3D) =>
		this.materials.disposeModelObject(object);

	/** モデルを削除 */
	removeModel(entryId: string): void {
		this.pendingModelLoads.delete(entryId);
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		if (
			this.interaction.hasHighlightIn(loaded.object)
		) {
			this.clearModelHighlight();
		}

		loaded.object.parent?.remove(loaded.object);
		this.disposeModelObject(loaded.object);

		this.loadedModels.delete(entryId);
		removePmxMorphCatalog(entryId);
	}

	/** すべてのモデルを削除 */
	clearAllModels(): void {
		this.pendingModelLoads.clear();
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
				getItemProperties: (
					modelId: number,
					expressId: number
				) => Promise<Record<string, unknown>>;
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
				getAllItemsOfType?: (
					modelId: number,
					type: number,
					verbose: boolean
				) => Promise<number[]>;
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
						return model.ifcManager!.getAllItemsOfType!(model.modelID!, type, false)
							.then(
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
							count: result.status === 'fulfilled'
								? result.value.expressIds.length
								: 0,
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
								...getIfcAttributes(expressId, item, [
									...propertySets,
									...typeProperties
								]),
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
		loaded.transform = this.calculateTransform(entry.style);
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
		const newTransform = this.calculateTransform(style);
		loaded.transform = newTransform;
		loaded.entry = { ...loaded.entry, style } as ThreeModelEntry;
		this.syncAnimationState(loaded);
	}

	setPmxMorphState(entry: MeshEntry<MeshStyle>): void {
		const loaded = this.loadedModels.get(entry.id);
		if (!loaded?.mmd) return;
		loaded.entry = entry;
		this.syncPmxMorphState(loaded);
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
			if (!(child as THREE.Mesh).isMesh || child.userData.morivisEdgeOverlay) return;

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

	/** 単体ビューを開く前に、LODモデルを最高詳細へ差し替える。 */
	async loadHighestDetailLod(entryId: string): Promise<void> {
		const loaded = this.loadedModels.get(entryId);
		if (
			!loaded
			|| !isMeshModelEntry(loaded.entry)
			|| loaded.entry.format.type !== 'gltf'
			|| !loaded.entry.format.lods?.length
		) {
			return;
		}

		this.highDetailModelLoads.add(entryId);
		try {
			await this.requestModelLod(
				loaded as LoadedModel & { entry: MeshEntry<MeshStyle>; },
				loaded.entry.format.url
			);
		} finally {
			this.highDetailModelLoads.delete(entryId);
		}
	}

	/** 既存の MapLibre/Three.js 描画コンテキストで単体ビューを開始する。 */
	openModelView = (
		...args: Parameters<ModelInteractionController['openModelView']>
	): ReturnType<ModelInteractionController['openModelView']> =>
		this.interaction.openModelView(...args);

	requestModelViewRepaint = (
		...args: Parameters<ModelInteractionController['requestModelViewRepaint']>
	): ReturnType<ModelInteractionController['requestModelViewRepaint']> =>
		this.interaction.requestModelViewRepaint(...args);

	closeModelView = (
		...args: Parameters<ModelInteractionController['closeModelView']>
	): ReturnType<ModelInteractionController['closeModelView']> =>
		this.interaction.closeModelView(...args);

	async exportModelAsGlb(entryId: string): Promise<ArrayBuffer> {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) {
			throw new Error('モデルがまだ読み込まれていません');
		}
		if (!isMeshModelEntry(loaded.entry)) {
			throw new Error('3D Gaussian Splatting はGLBに書き出せません');
		}
		const meshLoaded = loaded as LoadedModel & { entry: MeshEntry<MeshStyle>; };

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
		this.pendingModelLoads.forEach((load, id) => {
			if (load.type === 'preview' && (!entryId || id === entryId)) {
				this.pendingModelLoads.delete(id);
			}
		});
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
	dispose = (): void => {
		this.interaction.detach();
		if (this.repaintBurstHandle != null && typeof window !== 'undefined') {
			window.cancelAnimationFrame(this.repaintBurstHandle);
		}
		this.repaintBurstHandle = null;
		this.placement.dispose();
		this.clearAllModels();
		this.modelRenderer.dispose();
		this.modelLoader.dispose();
		this.loadedModels.clear();
		this.map = null;
		this.lastRenderTimeMs = null;
	};

	/** 初期化済みかどうか */
	get initialized(): boolean {
		return this.modelRenderer.initialized;
	}

	/** ロード済みモデルのIDリスト */
	get modelIds(): string[] {
		return Array.from(this.loadedModels.keys());
	}

	pickModelInActiveView = (
		...args: Parameters<ModelInteractionController['pickModelInActiveView']>
	): ReturnType<ModelInteractionController['pickModelInActiveView']> =>
		this.interaction.pickModelInActiveView(...args);

	pickModel = (
		...args: Parameters<ModelInteractionController['pickModel']>
	): ReturnType<ModelInteractionController['pickModel']> => this.interaction.pickModel(...args);
}

export const threeJsManager = new ThreeJsLayerManager();
