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

	const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], altitude);
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

					this.renderer = new THREE.WebGLRenderer({
						canvas: map.getCanvas(),
						context: gl,
						antialias: true
					});
					this.renderer.autoClear = false;

					// ライトを追加
					const directionalLight = new THREE.DirectionalLight(0xffffff);
					directionalLight.position.set(0, -70, 100).normalize();
					this.scene.add(directionalLight);

					const directionalLight2 = new THREE.DirectionalLight(0xffffff);
					directionalLight2.position.set(0, 70, 100).normalize();
					this.scene.add(directionalLight2);

					// デバッグででっかい球体を追加

					const debugSphere = new THREE.Mesh(
						new THREE.SphereGeometry(500, 32, 32),
						new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
					);
					debugSphere.position.set(0, 0, 0);
					this.scene.add(debugSphere);

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
					this.scene!.traverse((child) => {
						if (child.userData.entryId) {
							child.visible = child.userData.entryId === loaded.entry.id;
						}
					});
				});
				this.renderer!.resetState();
				this.renderer!.render(this.scene!, this.camera!);
				mapStore.triggerRepaint();
			},

			onRemove: () => {
				// レイヤー削除時はモデルだけクリア（renderer等は保持）
				this.clearAllModels();
			}
		};
	}

	/**
	 * モデルを追加
	 */
	addModel(entry: ModelMeshEntry<MeshStyle>): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.scene) {
				reject(new Error('Scene not initialized'));
				return;
			}

			if (entry.style.type !== 'mesh') {
				reject(new Error('Entry style type must be "mesh"'));
				return;
			}

			// 既存のモデルがあれば削除
			if (this.loadedModels.has(entry.id)) {
				this.removeModel(entry.id);
			}

			const transform = calculateModelTransform(entry.style);

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
					this.scene!.add(model);

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

	/**
	 * モデルを削除
	 */
	removeModel(entryId: string): void {
		const loaded = this.loadedModels.get(entryId);
		if (!loaded || !this.scene) return;

		this.scene.remove(loaded.object);
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
		if (loaded) {
			console.log(`Setting visibility of model ${entryId} to ${visible}`);
			loaded.object.visible = visible;
		}
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
