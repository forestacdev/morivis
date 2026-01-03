import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import maplibregl, { type CustomLayerInterface } from 'maplibre-gl';
import type { ModelMeshEntry, MeshStyle } from '../data/types/model';

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
 * 複数の GLTF モデルを管理する Three.js カスタムレイヤーを作成
 */
export const createThreeJsLayer = (entries: ModelMeshEntry<MeshStyle>[]): CustomLayerInterface => {
	let camera: THREE.Camera;
	let scene: THREE.Scene;
	let renderer: THREE.WebGLRenderer;
	const loadedModels: LoadedModel[] = [];
	const loader = new GLTFLoader();

	return {
		id: '3d-model-layer',
		type: 'custom',
		renderingMode: '3d',

		onAdd(map, gl) {
			camera = new THREE.Camera();
			scene = new THREE.Scene();

			renderer = new THREE.WebGLRenderer({
				canvas: map.getCanvas(),
				context: gl,
				antialias: true
			});
			renderer.autoClear = false;

			// ライトを追加
			const directionalLight = new THREE.DirectionalLight(0xffffff);
			directionalLight.position.set(0, -70, 100).normalize();
			scene.add(directionalLight);

			const directionalLight2 = new THREE.DirectionalLight(0xffffff);
			directionalLight2.position.set(0, 70, 100).normalize();
			scene.add(directionalLight2);

			// 各エントリのモデルをロード
			entries.forEach((entry) => {
				if (entry.style.type !== 'mesh') return;

				const transform = calculateModelTransform(entry.style);

				loader.load(entry.format.url, (gltf) => {
					const model = gltf.scene;

					// 透過・色設定
					model.traverse((child) => {
						if ((child as THREE.Mesh).isMesh) {
							const mesh = child as THREE.Mesh;
							const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

							materials.forEach((material) => {
								material.transparent = true;
								material.opacity = entry.style.opacity;
								// if (entry.style.color) {
								// 	(material as THREE.MeshStandardMaterial).color = new THREE.Color(
								// 		entry.style.color
								// 	);
								// }
								if (entry.style.wireframe) {
									(material as THREE.MeshStandardMaterial).wireframe = true;
								}
							});
						}
					});

					// 表示/非表示
					model.visible = entry.style.visible ?? true;

					// ユーザーデータにエントリIDと変換情報を保存
					model.userData.entryId = entry.id;
					model.userData.transform = transform;

					loadedModels.push({ entry, object: model, transform });
					scene.add(model);
				});
			});
		},

		render(_gl, args) {
			if (loadedModels.length === 0) return;

			// 各モデルを個別にレンダリング
			loadedModels.forEach((loaded) => {
				const { transform, object } = loaded;

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
				camera.projectionMatrix = projectionMatrix.multiply(modelMatrix);

				// このモデルだけ表示して描画
				scene.traverse((child) => {
					if (child.userData.entryId) {
						child.visible = child.userData.entryId === loaded.entry.id;
					}
				});

				renderer.resetState();
				renderer.render(scene, camera);
			});
		},

		onRemove() {
			// クリーンアップ
			loadedModels.forEach((loaded) => {
				scene.remove(loaded.object);
				loaded.object.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						const mesh = child as THREE.Mesh;
						mesh.geometry.dispose();
						const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
						materials.forEach((mat) => mat.dispose());
					}
				});
			});
			loadedModels.length = 0;
			renderer.dispose();
		}
	};
};
