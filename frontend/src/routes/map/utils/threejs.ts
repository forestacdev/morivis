import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import maplibregl, { type CustomLayerInterface } from 'maplibre-gl';
import type { ModelMeshEntry, MeshStyle } from '../data/types/model';
import { mapStore } from '$routes/stores/map';

interface ModelTransform {
	translateX: number;
	translateY: number;
	translateZ: number;
	rotateX: number;
	rotateY: number;
	rotateZ: number;
	scale: number;
}

interface LoadedModel {
	entry: ModelMeshEntry<MeshStyle>;
	object: THREE.Object3D;
	transform: ModelTransform;
}

/**
 * MeshStyle の transform から MapLibre 用の変換行列パラメータを計算
 */
const calculateModelTransform = (style: MeshStyle): ModelTransform => {
	const { lng, lat, altitude, scale, rotationY } = style.transform;

	const mc = maplibregl.MercatorCoordinate.fromLngLat(
		[lng, lat],
		mapStore.getTerrain() ? altitude : 0
	);
	const baseScale = mc.meterInMercatorCoordinateUnits();

	return {
		translateX: mc.x,
		translateY: mc.y,
		translateZ: mc.z,
		rotateX: Math.PI / 2,
		rotateY: (rotationY * Math.PI) / 180,
		rotateZ: 0,
		scale: baseScale * scale
	};
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
	private loadedModels: Map<string, LoadedModel> = new Map();
	private loader = new GLTFLoader();
	private isInitialized = false;

	/**
	 * カスタムレイヤーを作成（初期化用）
	 */
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

					// ライトを追加

					// const debugSphere = new THREE.Mesh(
					// 	new THREE.SphereGeometry(500, 32, 32),
					// 	new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
					// );
					// debugSphere.position.set(0, 0, 0);
					// this.scene.add(debugSphere);

					const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
					this.scene.add(hemiLight);

					this.isInitialized = true;
				}
			},

			render: (_gl, args) => {
				if (!this.scene || !this.camera || !this.renderer) return;
				if (this.loadedModels.size === 0) return;

				// 各モデルを個別にレンダリング
				this.loadedModels.forEach((loaded) => {
					const { transform } = loaded;

					// 回転行列を作成
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

					// モデルの変換行列を計算
					const modelMatrix = new THREE.Matrix4()
						.makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
						.scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
						.multiply(rotationX)
						.multiply(rotationY)
						.multiply(rotationZ);

					// カメラの投影行列を設定
					const projectionMatrix = new THREE.Matrix4().fromArray(
						args.defaultProjectionData.mainMatrix
					);
					this.camera.projectionMatrix = projectionMatrix.multiply(modelMatrix);

					// このモデルだけ表示して描画
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
				// レイヤー削除時はモデルだけクリア（renderer等は保持）
				this.clearAllModels();
			}
		};
	}

	/**
	 * モデルを追加
	 * プレビューに同じIDのモデルがあれば再利用する
	 */
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

			// mainとして追加する場合、プレビューに同じIDがあれば再利用
			if (_type === 'main') {
				const existing = this.loadedModels.get(entry.id);
				if (existing && existing.object.parent === this.previewModelGroup) {
					// プレビューからメインに移動（再読み込み不要）
					this.previewModelGroup.remove(existing.object);
					this.modelGroup.add(existing.object);
					existing.transform = transform;
					resolve();
					return;
				}
			}

			// 既存のモデルがあれば削除（同じグループにある場合のみ）
			const existing = this.loadedModels.get(entry.id);
			if (existing) {
				// previewとして追加時にpreviewにある、またはmainとして追加時にmainにある場合は削除
				const isInPreview = existing.object.parent === this.previewModelGroup;
				const isInMain = existing.object.parent === this.modelGroup;
				if ((_type === 'preview' && isInPreview) || (_type === 'main' && isInMain)) {
					this.removeModel(entry.id);
				}
			}

			this.loader.load(
				entry.format.url,
				(gltf) => {
					const model = gltf.scene;

					// 透過・色設定
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

					// 表示/非表示
					model.visible = entry.style.visible ?? true;

					// ユーザーデータにエントリID を保存
					model.userData.entryId = entry.id;

					this.loadedModels.set(entry.id, { entry, object: model, transform });
					if (_type === 'preview') {
						this.previewModelGroup!.add(model);
					} else {
						this.modelGroup!.add(model);
					}
					resolve();
				},
				undefined,
				(error) => {
					reject(error);
				}
			);
		});
	}

	/**
	 * 複数のモデルを追加
	 */
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

	/**
	 * モデルを削除
	 */
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

	/**
	 * すべてのモデルを削除
	 */
	clearAllModels(): void {
		this.loadedModels.forEach((_, entryId) => {
			this.removeModel(entryId);
		});
	}

	/**
	 * モデルを入れ替え（既存をすべて削除して新しいモデルを追加）
	 */
	async replaceModels(entries: ModelMeshEntry<MeshStyle>[]): Promise<void> {
		this.clearAllModels();
		await this.addModels(entries);
	}

	/**
	 * モデルの表示/非表示を切り替え
	 */
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

	/**
	 * モデルの不透明度を変更
	 */
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
					if (material instanceof THREE.MeshStandardMaterial) {
						material.wireframe = wireframe;
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
					if (material instanceof THREE.MeshStandardMaterial) {
						material.color = new THREE.Color(color);
					}
				});
			}
		});
	}

	setGroupVisibility(visible: boolean): void {
		if (!this.modelGroup) return;
		this.modelGroup.visible = visible;
	}

	/**
	 * プレビューモデルをメイングループに移動（再読み込み不要）
	 */
	promotePreviewToMain(entryId: string): boolean {
		if (!this.modelGroup || !this.previewModelGroup) return false;

		const loaded = this.loadedModels.get(entryId);
		if (!loaded) return false;

		// previewModelGroupから削除してmodelGroupに追加
		this.previewModelGroup.remove(loaded.object);
		this.modelGroup.add(loaded.object);
		return true;
	}

	/**
	 * プレビューモデルをクリア（確定しない場合）
	 */
	clearPreview(entryId?: string): void {
		if (!this.previewModelGroup) return;

		if (entryId) {
			// 特定のプレビューモデルを削除
			const loaded = this.loadedModels.get(entryId);
			if (loaded && loaded.object.parent === this.previewModelGroup) {
				this.removeModel(entryId);
			}
		} else {
			// すべてのプレビューモデルを削除
			const previewIds: string[] = [];
			this.loadedModels.forEach((loaded, id) => {
				if (loaded.object.parent === this.previewModelGroup) {
					previewIds.push(id);
				}
			});
			previewIds.forEach((id) => this.removeModel(id));
		}
	}

	/**
	 * 完全に破棄（ページ離脱時など）
	 */
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

	/**
	 * 初期化済みかどうか
	 */
	get initialized(): boolean {
		return this.isInitialized;
	}

	/**
	 * ロード済みモデルのIDリスト
	 */
	get modelIds(): string[] {
		return Array.from(this.loadedModels.keys());
	}
}

// シングルトンインスタンス
export const threeJsManager = new ThreeJsLayerManager();
