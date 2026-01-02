<script lang="ts">
	import * as THREE from 'three';
	import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
	import maplibregl, { CanvasSource } from 'maplibre-gl';
	import { mapStore } from '$routes/stores/map';
	import type { CustomLayerInterface } from 'maplibre-gl';
	import { ENTRY_GLTF_PATH } from '$routes/constants';

	// モデルパラメータ（インタラクティブに変更可能）
	const modelParams = {
		lng: 136.919515,
		lat: 35.553991,
		altitude: 0,
		// heightMeters: 121, // モデルのベースを地面から何m上げるか
		heightMeters: 0, // モデルのベースを地面から何m上げるか
		rotateY: 2, // Y軸回転（度）: 0-360
		scale: 0.83 // スケール倍率
	};

	// transformation parametersを計算する関数
	function calculateModelTransform() {
		const mc = maplibregl.MercatorCoordinate.fromLngLat(
			[modelParams.lng, modelParams.lat],
			modelParams.altitude // m
		);

		const baseScale = mc.meterInMercatorCoordinateUnits();

		// 追加の持ち上げ量（m）を、Mercator unitsに変換
		const zOffset = baseScale * (modelParams.heightMeters ?? 0);

		return {
			translateX: mc.x,
			translateY: mc.y,
			translateZ: mc.z + zOffset,
			rotateX: Math.PI / 2,
			rotateY: (modelParams.rotateY * Math.PI) / 180,
			rotateZ: 0,
			scale: baseScale * modelParams.scale
		};
	}
	let modelTransform = calculateModelTransform();
	const loader = new GLTFLoader();

	let camera: THREE.Camera;
	let scene: THREE.Scene;
	let renderer: THREE.WebGLRenderer;

	// configuration of the custom layer for a 3D model per the CustomLayerInterface
	const customLayer: CustomLayerInterface = {
		id: '3d-model',
		type: 'custom',
		renderingMode: '3d',
		onAdd(map, gl) {
			camera = new THREE.Camera();
			scene = new THREE.Scene();

			map = map;

			// use the MapLibre GL JS map canvas for three.js
			renderer = new THREE.WebGLRenderer({
				canvas: map.getCanvas(),
				context: gl,
				antialias: true
			});

			renderer.autoClear = false;

			// create two three.js lights to illuminate the model
			const directionalLight = new THREE.DirectionalLight(0xffffff);
			directionalLight.position.set(0, -70, 100).normalize();
			scene.add(directionalLight);

			const directionalLight2 = new THREE.DirectionalLight(0xffffff);
			directionalLight2.position.set(0, 70, 100).normalize();
			scene.add(directionalLight2);

			console.log(888);

			loader.load(`${ENTRY_GLTF_PATH}/morinos.glb`, (gltf) => {
				// 透過設定
				gltf.scene.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						const mesh = child as THREE.Mesh;
						if (Array.isArray(mesh.material)) {
							mesh.material.forEach((material) => {
								material.transparent = true;
								material.opacity = 0.5; // 透過度を設定
							});
						} else {
							mesh.material.transparent = true;
							mesh.material.opacity = 0.5; // 透過度を設定
						}
					}
				});
				scene.add(gltf.scene);
			});
		},

		render(gl, args) {
			const rotationX = new THREE.Matrix4().makeRotationAxis(
				new THREE.Vector3(1, 0, 0),
				modelTransform.rotateX
			);
			const rotationY = new THREE.Matrix4().makeRotationAxis(
				new THREE.Vector3(0, 1, 0),
				modelTransform.rotateY
			);
			const rotationZ = new THREE.Matrix4().makeRotationAxis(
				new THREE.Vector3(0, 0, 1),
				modelTransform.rotateZ
			);

			const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
			const l = new THREE.Matrix4()
				.makeTranslation(
					modelTransform.translateX,
					modelTransform.translateY,
					modelTransform.translateZ
				)
				.scale(new THREE.Vector3(modelTransform.scale, -modelTransform.scale, modelTransform.scale))
				.multiply(rotationX)
				.multiply(rotationY)
				.multiply(rotationZ);

			// Alternatively, you can use this API to get the correct model matrix.
			// It will work regardless of current projection.
			// Also see the example "globe-3d-model.html".
			//
			// const modelMatrix = args.getMatrixForModel(modelOrigin, modelAltitude);
			// const m = new THREE.Matrix4().fromArray(matrix);
			// const l = new THREE.Matrix4().fromArray(modelMatrix);

			camera.projectionMatrix = m.multiply(l);
			renderer.resetState();
			renderer.render(scene, camera);
		}
	};

	mapStore.onStyleLoad((map) => {
		map.addLayer(customLayer);
	});
</script>

<style>
</style>
