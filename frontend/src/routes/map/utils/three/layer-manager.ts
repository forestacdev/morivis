import type { CustomLayerInterface } from 'maplibre-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import type { ModelMeshEntry, MeshStyle } from '$routes/map/data/types/model';
import {
	calculateModelTransform,
	type ModelTransform
} from '$routes/map/utils/three/model-transform';

interface LoadedModel {
	entry: ModelMeshEntry<MeshStyle>;
	object: THREE.Object3D;
	transform: ModelTransform;
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
	private loadedModels: Map<string, LoadedModel> = new Map();
	private loader = new GLTFLoader();
	private isInitialized = false;

	/** カスタムレイヤーを作成（初期化用） */
	createLayer(): CustomLayerInterface {
		return {
			id: '3d-model-layer',
			type: 'custom',
			renderingMode: '3d',

			onAdd: (map, gl) => {
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

					const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
					this.scene.add(hemiLight);

					this.isInitialized = true;
				}
			},

			render: (_gl, args) => {
				if (!this.scene || !this.camera || !this.renderer) return;
				if (this.loadedModels.size === 0) return;

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

					const modelMatrix = new THREE.Matrix4()
						.makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
						.scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
						.multiply(rotationX)
						.multiply(rotationY)
						.multiply(rotationZ);

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

			const onModelLoaded = (model: THREE.Group | THREE.Object3D) => {
				model.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						const mesh = child as THREE.Mesh;
						const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

						materials.forEach((material) => {
							material.transparent = true;
							material.opacity = entry.style.opacity;
							if (entry.style.wireframe) {
								(material as THREE.MeshStandardMaterial).wireframe = true;
							}
						});
					}
				});

				model.visible = entry.style.visible ?? true;
				model.userData.entryId = entry.id;

				this.loadedModels.set(entry.id, { entry, object: model, transform });
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
					(gltf) => onModelLoaded(gltf.scene),
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
		});
	}

	/** モデルを削除 */
	removeModel(entryId: string): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded || !this.modelGroup) return;

		this.modelGroup.remove(loaded.object);
		loaded.object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				mesh.geometry.dispose();
				const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				materials.forEach((mat) => mat.dispose());
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
	setModelOpacity(entryId: string, opacity: number): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;

		loaded.object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				materials.forEach((material) => {
					material.opacity = opacity;
				});
			}
		});
	}

	setModelWireframe(entryId: string, wireframe: boolean): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				materials.forEach((material) => {
					if ('wireframe' in material) {
						(material as THREE.MeshStandardMaterial).wireframe = wireframe;
					}
				});
			}
		});
	}

	setModelColor(entryId: string, color: string): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		loaded.object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				materials.forEach((material) => {
					if ('color' in material && material.color instanceof THREE.Color) {
						material.color = new THREE.Color(color);
					}
				});
			}
		});
	}

	setModelTransform(entryId: string, style: MeshStyle): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return;
		const newTransform = calculateModelTransform(style);
		loaded.transform = newTransform;
		loaded.entry = { ...loaded.entry, style };
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
		this.scene = null;
		this.camera = null;
		this.isInitialized = false;
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
