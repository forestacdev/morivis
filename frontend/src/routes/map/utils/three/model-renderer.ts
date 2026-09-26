import { applyGaussianSplatStyle } from '$routes/map/utils/three/gaussian-splat-renderer';
import * as THREE from 'three';
import { isGaussianSplatEntry, isMeshModelEntry, type LoadedModel } from './model-runtime-types';
export class ModelRenderer {
	camera: THREE.Camera | null = null;
	scene: THREE.Scene | null = null;
	modelGroup: THREE.Group | null = null;
	previewModelGroup: THREE.Group | null = null;
	renderer: THREE.WebGLRenderer | null = null;
	private overlayRenderTarget: THREE.WebGLRenderTarget | null = null;
	private overlayScene: THREE.Scene | null = null;
	private overlayCamera: THREE.OrthographicCamera | null = null;
	private isInitialized = false;
	initialize = (
		canvas: HTMLCanvasElement,
		gl: WebGLRenderingContext | WebGL2RenderingContext
	) => {
		if (this.isInitialized) return;
		this.camera = new THREE.Camera();
		this.scene = new THREE.Scene();
		this.modelGroup = new THREE.Group();
		this.previewModelGroup = new THREE.Group();
		this.scene.add(this.modelGroup);
		this.scene.add(this.previewModelGroup);

		this.renderer = new THREE.WebGLRenderer({
			canvas,
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
	};
	get initialized(): boolean {
		return this.isInitialized;
	}
	setOnlyEntryVisible = (
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
	renderActiveModelView = (
		loadedModels: ReadonlyMap<string, LoadedModel>,
		activeModelView: { camera: THREE.Camera; entryIds: ReadonlySet<string>; }
	) => {
		if (!this.scene || !this.renderer || !activeModelView) return;

		const setViewVisibility = (group: THREE.Group | null) => {
			if (!group) return;
			group.traverse((child) => {
				const entryId = child.userData.entryId as string | undefined;
				if (!entryId) return;
				const loaded = loadedModels.get(entryId);
				child.visible = loaded?.object === child
					&& activeModelView!.entryIds.has(entryId)
					&& (loaded.entry.style.visible ?? true);
			});
		};
		setViewVisibility(this.modelGroup);
		setViewVisibility(this.previewModelGroup);
		this.renderer.resetState();
		this.renderer.setRenderTarget(null);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.clear(true, true, true);
		this.renderer.render(this.scene, activeModelView.camera);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.resetState();
	};
	renderModels = (
		loadedModels: ReadonlyMap<string, LoadedModel>,
		mapProjectionMatrix: THREE.Matrix4,
		viewportHeight?: number
	) => {
		if (!this.renderer || !this.scene || !this.camera) return;
		loadedModels.forEach((loaded) => {
			if (isMeshModelEntry(loaded.entry) && loaded.entry.style.showThroughTerrain) {
				return;
			}
			if (isGaussianSplatEntry(loaded.entry)) {
				applyGaussianSplatStyle(
					loaded.object,
					loaded.entry.style,
					viewportHeight
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

		loadedModels.forEach((loaded) => {
			if (!isMeshModelEntry(loaded.entry) || !loaded.entry.style.showThroughTerrain) {
				return;
			}
			this.renderOverlayModel(loaded, mapProjectionMatrix);
		});
	};
	dispose = () => {
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
		this.scene = null;
		this.camera = null;
		this.isInitialized = false;
	};
}
