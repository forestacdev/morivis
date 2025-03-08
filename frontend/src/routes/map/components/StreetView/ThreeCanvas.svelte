<script lang="ts">
	import Icon from '@iconify/svelte';
	import bearing from '@turf/bearing';
	import { delay } from 'es-toolkit';
	import gsap from 'gsap';
	import { onMount, tick } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

	import angleDataJson from './angle.json';
	import fs from './shader/fragment.glsl?raw';
	import vs from './shader/vertex.glsl?raw';
	import { getCameraYRotation, updateAngle, degreesToRadians } from './utils';

	import type { NextPointData, StreetViewPoint } from '$map/+page.svelte';
	import { gui } from '$map/debug/utils';
	import { isStreetView, DEBUG_MODE } from '$map/store';

	// const IMAGE_URL = 'https://raw.githubusercontent.com/forestacdev/theta360-Images/main/images/';
	// const IMAGE_URL = 'https://raw.githubusercontent.com/forestacdev/360photo-data-webp/main/webp/';
	const IMAGE_URL = 'https://raw.githubusercontent.com/forestacdev/fac-cubemap-image/main/images/';
	const IN_CAMERA_FOV = 75;
	const OUT_CAMERA_FOV = 150;
	const IN_CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
	const OUT_CAMERA_POSITION = new THREE.Vector3(0, 10, 0);

	interface Props {
		feature: StreetViewPoint;
		nextPointData: NextPointData[] | null;
		cameraBearing: number;
		setPoint: (feature: StreetViewPoint) => void;
	}

	let { feature, nextPointData, cameraBearing = $bindable(), setPoint }: Props = $props();
	let canvas = $state<HTMLCanvasElement | null>(null);
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let orbitControls: OrbitControls;
	let renderer: THREE.WebGLRenderer;
	let isRendering = true;
	let isLoading = $state<boolean>(false);
	let controlDiv = $state<HTMLDivElement | null>(null);
	let showCanvas = $state<boolean>(false);

	interface Uniforms {
		skybox: { value: THREE.CubeTexture | null };
		rotationAngles: { value: THREE.Vector3 };
	}
	const uniforms = {
		skybox: { value: null },
		rotationAngles: { value: new THREE.Vector3() }
	};
	const skyGeometry: THREE.SphereGeometry = new THREE.SphereGeometry(10, 16, 16);
	const skyMaterial: THREE.ShaderMaterial = new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: vs,
		fragmentShader: fs,
		side: THREE.BackSide,
		wireframe: false
	});
	let skyMesh: THREE.Mesh;

	let geometryBearing = { x: 0, y: 0, z: 0 };
	let controllerX;
	let controllerY;
	let controllerZ;

	controllerX = gui.add(geometryBearing, 'x', 0, 360).listen();
	controllerY = gui.add(geometryBearing, 'y', 0, 360).listen();
	controllerZ = gui.add(geometryBearing, 'z', 0, 360).listen();

	const submit = {
		updateAngle: () => {
			updateAngle(feature.properties['ID'], geometryBearing);
		}
	};

	// 角度を更新するボタンを追加
	gui.add(submit, 'updateAngle').name('Update Angle');

	let spheres: THREE.Mesh[] = []; // 球体を管理する配列

	// 球体を配置する関数
	const placeSpheres = (nextPointData: NextPointData[]) => {
		// 球体のパラメータ
		const radius = 5; // 球体を配置する半径
		const sphereRadius = 0.3; // 球体の大きさ
		const material = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			visible: $DEBUG_MODE ? true : false
		});

		removeSpheres(); // 既存の球体を削除

		nextPointData.forEach((pointData) => {
			const angleRad = THREE.MathUtils.degToRad(pointData.bearing);
			const x = radius * Math.sin(angleRad);
			const z = -radius * Math.cos(angleRad);

			const geometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
			const sphere = new THREE.Mesh(geometry, material);
			sphere.name = pointData.featureData.properties['ID'];
			sphere.position.set(x, 0, z);
			scene.add(sphere);
			spheres.push(sphere); // 配列に追加
		});

		lookAtSphere(spheres[0]);
	};

	// 球体を削除する関数
	const removeSpheres = () => {
		if (spheres.length > 0) {
			spheres.forEach((sphere) => {
				scene.remove(sphere);
				sphere.geometry.dispose(); // メモリ解放
			});
			spheres = []; // 配列を空にする
		}
	};

	// **カメラを指定したオブジェクトの方向に向ける**
	const lookAtSphere = (target: THREE.Mesh) => {
		// ターゲットの座標を取得
		const targetPos = target.position;

		// カメラの位置をターゲットと正反対に設定
		const oppositePos = new THREE.Vector3(-targetPos.x, targetPos.y, -targetPos.z);
		camera.position.set(oppositePos.x, camera.position.y, oppositePos.z);

		// カメラをターゲットの方向へ向ける
		camera.lookAt(target.position);
	};

	const lookAtSphereAnime = (target: THREE.Mesh, point: StreetViewPoint) => {
		// ターゲットの座標を取得
		const targetPos = target.position.clone();

		// カメラの位置をターゲットと正反対に設定（X, Z を反転）
		const oppositePos = new THREE.Vector3(-targetPos.x, targetPos.y, -targetPos.z);

		// GSAPを使ってカメラの位置をスムーズに移動
		gsap.to(camera.position, {
			x: oppositePos.x,
			y: camera.position.y,
			z: oppositePos.z,
			duration: 0.3, // 1.5秒かけて移動
			ease: 'power2.out',
			onUpdate: () => {
				camera.lookAt(targetPos);
			},

			onComplete: () => {
				setPoint(point);
			}
		});
	};
	const worker = new Worker(new URL('./worker.ts', import.meta.url), {
		type: 'module'
	});
	const created360Mesh = async (feature: StreetViewPoint): void => {
		if (!feature) return;
		isLoading = true;
		const imageUrl = `${IMAGE_URL}${feature.properties['Name']}`;
		const id = feature.properties['ID'];
		const angleData = angleDataJson.find((angle) => angle.id === id);
		const url = imageUrl.replace('.JPG', '/');

		if (!imageUrl) return;

		worker.postMessage({
			urls: [
				`${url}face_1.jpg`,
				`${url}face_2.jpg`,
				`${url}face_3.jpg`,
				`${url}face_4.jpg`,
				`${url}face_5.jpg`,
				`${url}face_6.jpg`
			]
		});

		// Worker からのメッセージを受け取る
		worker.onmessage = (event) => {
			if (event.data.error) {
				console.error(event.data.error);
				isLoading = false;
				return;
			}

			const { blobUrls } = event.data;
			const textureCube = new THREE.CubeTextureLoader();

			textureCube.load(
				blobUrls,
				(texture) => {
					texture.colorSpace = THREE.SRGBColorSpace;

					// texture.mapping = THREE.CubeReflectionMapping;
					// texture.flipY = true;
					// shaderMaterial.needsUpdate = true;

					geometryBearing.x = angleData.angleX;
					geometryBearing.y = angleData.angleY;
					geometryBearing.z = angleData.angleZ;

					// GUI側のコントロールの値を更新
					if ($DEBUG_MODE) {
						controllerX.setValue(geometryBearing.x);
						controllerY.setValue(geometryBearing.y);
						controllerZ.setValue(geometryBearing.z);
					}

					isLoading = false;

					uniforms.skybox.value = texture;

					placeSpheres(nextPointData);
				},
				undefined,
				(error) => console.error('テクスチャの適用に失敗しました', error)
			);
		};
	};

	// 画面リサイズ時にキャンバスもリサイズ
	const onResize = () => {
		// サイズを取得
		if (!renderer) return;
		const width = window.innerWidth;
		const height = window.innerHeight;

		// レンダラーのサイズを調整する
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(width, height);

		// カメラのアスペクト比を正す
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};

	onMount(async () => {
		if (!canvas) return;
		const sizes = {
			width: canvas.clientWidth,
			height: canvas.clientHeight
		};

		// シーンの作成
		scene = new THREE.Scene();

		// カメラ
		camera = new THREE.PerspectiveCamera(IN_CAMERA_FOV, sizes.width / sizes.height, 0.1, 1000);

		// カメラの初期位置

		camera.position.set(0, 0, 0);
		camera.rotation.order = 'YXZ';
		scene.add(camera);

		// カメラの設定
		camera.aspect = sizes.width / sizes.height;
		camera.updateProjectionMatrix();

		// パソコン閲覧時マウスドラッグで視点操作する
		orbitControls = new OrbitControls(camera, canvas);
		orbitControls.target.set(camera.position.x, camera.position.y, camera.position.z + 0.01);

		// 視点操作のイージングの値
		orbitControls.dampingFactor = 0.1;

		// マウスドラッグの反転
		orbitControls.rotateSpeed *= -1;
		orbitControls.enableDamping = true;
		orbitControls.enablePan = false;
		orbitControls.enableZoom = false;
		orbitControls.maxZoom = 1;

		skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
		scene.add(skyMesh);

		if ($DEBUG_MODE) {
			const helper = new THREE.PolarGridHelper(10, 16, 80, 64);
			scene.add(helper);

			// // ヘルパー方向
			const axesHelper = new THREE.AxesHelper(1000);
			scene.add(axesHelper);
		}

		// レンダラー

		renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			alpha: true
		});
		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		canvas.addEventListener('resize', onResize);
		// マウスホイールでFOVを変更するイベントリスナー
		canvas.addEventListener('wheel', (event) => {
			const minFov = 20; // 最小FOV
			const maxFov = 100; // 最大FOV
			const zoomSpeed = 1; // ズーム速度

			// マウススクロールの方向に応じてFOVを増減
			camera.fov += event.deltaY * 0.05 * zoomSpeed;

			// FOVの範囲を制限
			camera.fov = Math.max(minFov, Math.min(maxFov, camera.fov));

			// 変更を適用
			camera.updateProjectionMatrix();
		});

		// アニメーション
		const animate = () => {
			requestAnimationFrame(animate);
			if (!isRendering) return;

			orbitControls.update();

			let degrees = THREE.MathUtils.radToDeg(camera.rotation.y);
			degrees = (degrees + 360) % 360; // 0〜360度の範囲に調整

			// controlDiv親要素のを取得
			if (!controlDiv) return;
			controlDiv.style.transform = `rotateZ(${degrees}deg)`;

			cameraBearing = (degrees + 180) % 360; // 0〜360度の範囲に調整

			// 度をラジアンに変換してシェーダーに渡す
			let rotationAngles = new THREE.Vector3(
				degreesToRadians(geometryBearing.x),
				degreesToRadians(geometryBearing.y),
				degreesToRadians(geometryBearing.z)
			);
			uniforms.rotationAngles.value = rotationAngles;

			renderer.render(scene, camera);
		};
		animate();
	});

	isStreetView.subscribe(async (value) => {
		onResize();
		if (value) {
			await delay(1000);
			// gsap.to(camera, {
			// 	duration: 1, // アニメーション時間（秒）
			// 	fov: IN_CAMERA_FOV, // 目標FOV（ズームイン）
			// 	ease: 'power2.inOut', // スムーズなイージング
			// 	onUpdate: () => camera.updateProjectionMatrix() // FOV変更を適用
			// });

			// const target = spheres.find(
			// 	(sphere) => sphere.name === nextPointData[0].featureData.properties['ID']
			// );

			// const targetPos = target.position.clone();

			// // カメラの位置をターゲットと正反対に設定（X, Z を反転）
			// const oppositePos = new THREE.Vector3(-targetPos.x, targetPos.y, -targetPos.z);

			// gsap.to(camera.position, {
			// 	ease: 'power2.inOut',
			// 	onUpdate: () => {
			// 		camera.lookAt(oppositePos);
			// 		camera.updateProjectionMatrix();
			// 	}
			// });

			showCanvas = value;
		} else {
			// gsap.to(camera, {
			// 	duration: 1, // アニメーション時間（秒）
			// 	fov: OUT_CAMERA_FOV, // 目標FOV（ズームイン）
			// 	ease: 'power2.inOut', // スムーズなイージング
			// 	onUpdate: () => camera.updateProjectionMatrix() // FOV変更を適用
			// });

			// gsap.to(camera.position, {
			// 	duration: 1,
			// 	y: OUT_CAMERA_POSITION.y, // カメラを上へ移動して真下を向く
			// 	x: camera.position.x,
			// 	z: camera.position.z,

			// 	ease: 'power2.inOut',
			// 	onUpdate: () => {
			// 		camera.lookAt(0, 0, 0); // 確実に真下を向く
			// 		camera.updateProjectionMatrix();
			// 	}
			// });
		}
	});
	const nextPoint = (point) => {
		const target = spheres.find((sphere) => sphere.name === point.properties['ID']);

		if (!target) return;

		lookAtSphereAnime(target, point);
	};

	$effect(() => created360Mesh(feature));
</script>

<!-- <div class="css-canvas-back"></div> -->
<div
	class="absolute z-10 flex cursor-pointer overflow-hidden duration-500 {showCanvas
		? 'bottom-0 right-0 h-full w-full opacity-100'
		: 'pointer-events-none bottom-0 right-0 h-full w-full opacity-0'}"
>
	<canvas class="h-full w-full" bind:this={canvas}></canvas>
	{#if isLoading}
		<div class="css-loading">
			<div class="css-spinner"></div>
		</div>
	{:else}
		<div
			class="css-3d pointer-events-none absolute bottom-0 grid w-full place-items-center p-0 {showCanvas
				? ' h-[400px]'
				: ' h-full'}"
		>
			<div class="css-control-warp">
				<div bind:this={controlDiv} class="css-control">
					{#if nextPointData}
						{#each nextPointData as point, index}
							<button
								onclick={() => {
									nextPoint(point.featureData);
								}}
								class="css-arrow"
								style="--angle: {point.bearing}deg; --distance: {showCanvas ? '128' : '64'}px;"
							>
								<Icon
									icon="ic:baseline-double-arrow"
									width={showCanvas ? 128 : 64}
									height={showCanvas ? 128 : 64}
									class=""
									style="transform: rotate({point.bearing - 90}deg);"
								/>
							</button>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/if}
	{#if showCanvas}
		<button
			class="absolute left-4 top-[100px] rounded-md bg-white p-2"
			onclick={() => ($isStreetView = false)}>戻る</button
		>
	{/if}
</div>

<style>
	canvas {
		background-image: radial-gradient(#000000, #000000);
		padding: 0;
	}

	.css-3d {
		pointer-events: none;
		transform-style: preserve-3d;
		perspective: 1000px;
		/* background-color: #000000; */
	}

	.css-control-warp {
		transform: rotateX(60deg);
	}

	.css-control {
		transform-origin: center;
		height: 400px;
		width: 400px;
		pointer-events: none;
	}

	.css-arrow {
		pointer-events: auto;
		display: grid;
		place-items: center;

		pointer-events: all;
		position: absolute;
		top: 50%;
		left: 50%;
		--x: calc(cos(calc(var(--angle) - 90deg)) * var(--distance));
		--y: calc(sin(calc(var(--angle) - 90deg)) * var(--distance));
		translate: calc(var(--x) - 50%) calc(var(--y) - 50%);
		color: #fff;
		filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.5));
	}

	.css-loading {
		z-index: 1;
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.css-spinner {
		width: 100px;
		height: 100px;
		border: 10px solid #333;
		border-radius: 50%;
		border-top-color: #fff;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
