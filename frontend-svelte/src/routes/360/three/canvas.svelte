<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
	import Icon from '@iconify/svelte';
	import Worker from './worker?worker';
	import { createEventDispatcher } from 'svelte';
	// import { angleData } from './angle';
	import angleDataJson from '$lib/json/angle.json';
	import { GUI } from 'lil-gui';
	import gsap from 'gsap';
	//svelteからcreateEventDispatcher関数をインポートする。
	const dispatch = createEventDispatcher();

	import { onMount } from 'svelte';
	import bearing from '@turf/bearing';
	// const IMAGE_URL = 'https://raw.githubusercontent.com/forestacdev/theta360-Images/main/images/';
	// const IMAGE_URL = 'https://raw.githubusercontent.com/forestacdev/360photo-data-webp/main/webp/';
	const IMAGE_URL =
		'https://raw.githubusercontent.com/forestacdev/fac-cubemap-image/main/images/';
	// main/images/R0010026/face_1.jpg
	export let feature: any;
	export let nextPointData = [];
	let canvas: HTMLCanvasElement;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let isRendering = true;
	let isloading = true;
	let controlDiv: HTMLDivElement;

	export let cameraBearing;

	let currentRequestController = null;

	let geometryBearing = { x: 0, y: 0, z: 0 };

	const gui = new GUI();
	const controllerX = gui.add(geometryBearing, 'x', 0, 360).listen();
	const controllerY = gui.add(geometryBearing, 'y', 0, 360).listen();
	const controllerZ = gui.add(geometryBearing, 'z', 0, 360).listen();

	async function updateAngle(id: string, geometryBearing: { x: number; y: number; z: number }) {
		// const test = await fetch('/360', {
		// 	method: 'GET'
		// });

		// console.log(test);
		const response = await fetch('/360', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ id, geometryBearing })
		});
		const result = await response.json();
		if (result.success) {
			console.log('Angle updated successfully', result.updatedData);
		} else {
			console.error('Failed to update angle', result.error);
		}
	}

	const submit = {
		updateAngle: () => {
			updateAngle(feature.properties['ID'], geometryBearing);
		}
	};

	// 角度を更新するボタンを追加
	gui.add(submit, 'updateAngle').name('Update Angle');

	const created360Mesh = async (feature) => {
		isloading = true;
		const imageUrl = `${IMAGE_URL}${feature.properties['Name']}`;
		const id = feature.properties['ID'];
		const angleData = angleDataJson.find((angle) => angle.id === id);
		const url = imageUrl.replace('.JPG', '/');

		if (!imageUrl) return;
		const textureCube = new THREE.CubeTextureLoader();

		textureCube.load(
			[
				`${url}face_1.jpg`,
				`${url}face_2.jpg`,
				`${url}face_3.jpg`, // 球体の場合は逆になる
				`${url}face_4.jpg`, // 球体の場合は逆になる
				`${url}face_5.jpg`,
				`${url}face_6.jpg`
			],
			(texture) => {
				texture.colorSpace = THREE.SRGBColorSpace;
				// texture.mapping = THREE.CubeReflectionMapping;
				// texture.flipY = true;
				// shaderMaterial.needsUpdate = true;

				geometryBearing.x = angleData.angleX;
				geometryBearing.y = angleData.angleY;
				geometryBearing.z = angleData.angleZ;

				// GUI側のコントロールの値を更新
				controllerX.setValue(geometryBearing.x);
				controllerY.setValue(geometryBearing.y);
				controllerZ.setValue(geometryBearing.z);

				isloading = false;

				scene.background = texture;

				// 回転を設定
				// const rotationMatrix = new THREE.Matrix3().setFromMatrix4(
				// 	new THREE.Matrix4().makeRotationY(angleData)
				// );
				// material.userData.uniforms.envMapRotation.value.copy(rotationMatrix);
			},
			undefined,
			(error) => console.error('テクスチャの読み込みに失敗しました', error)
		);
	};

	onMount(async () => {
		const sizes = {
			width: canvas.clientWidth,
			height: canvas.clientHeight
		};

		// シーンの作成
		scene = new THREE.Scene();

		// カメラ
		camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100000);
		camera.position.set(0, 0, 0);
		// camera.position.set(-100, 100, -100);
		scene.add(camera);

		// カメラの設定
		camera.aspect = sizes.width / sizes.height;
		camera.updateProjectionMatrix();

		// パソコン閲覧時マウスドラッグで視点操作する
		const orbitControls = new OrbitControls(camera, canvas);
		orbitControls.target.set(camera.position.x, camera.position.y, camera.position.z + 0.01);
		// 視点操作のイージングをONにする
		orbitControls.enableDamping = true;
		// 視点操作のイージングの値
		orbitControls.dampingFactor = 0.1;
		// 視点変更の速さ
		orbitControls.rotateSpeed = 0.5;
		// ズーム禁止
		// orbitControls.enableZoom = false;
		// orbitControls.maxZoom = 1;
		// パン操作禁止
		orbitControls.enablePan = false;
		orbitControls.panSpeed = -1;

		// ヘルパーグリッド
		const gridHelper = new THREE.GridHelper(200, 100);
		// scene.add(gridHelper);
		gridHelper.position.y = -5;

		const radius = 10;
		const sectors = 16;
		const rings = 80;
		const divisions = 64;

		const helper = new THREE.PolarGridHelper(radius, sectors, rings, divisions);
		scene.add(helper);

		// ヘルパー方向
		const axesHelper = new THREE.AxesHelper(100);
		scene.add(axesHelper);

		// レンダラー
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			alpha: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// 画面リサイズ時にキャンバスもリサイズ
		const onResize = () => {
			// サイズを取得
			const width = canvas.clientWidth;
			const height = canvas.clientHeight;

			// レンダラーのサイズを調整する
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setSize(width, height);

			// カメラのアスペクト比を正す
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();
		};
		window.addEventListener('resize', onResize);

		// テクスチャ

		// アニメーション
		const animate = () => {
			requestAnimationFrame(animate);
			if (!isRendering) return;
			const target = orbitControls.target;
			orbitControls.update();

			camera.rotation.order = 'YXZ';
			let degrees = THREE.MathUtils.radToDeg(camera.rotation.y);
			degrees = (degrees + 360) % 360; // 0〜360度の範囲に調整

			let degreesX = THREE.MathUtils.radToDeg(camera.rotation.x);
			degreesX = ((degreesX + 360) % 360) - 270; // 0〜360度の範囲に調整

			if (!controlDiv) return;

			controlDiv.style.transform = `rotateZ(${degrees}deg)`;
			// controlDiv親要素のを取得
			const parent = controlDiv.parentElement;

			parent.style.transform = `rotateX(${degreesX - 30}deg)`;

			cameraBearing = degrees;

			// scene.environmentRotation.set(0, THREE.MathUtils.degToRad(geometryBearing.y), 0);

			scene.backgroundRotation.set(
				THREE.MathUtils.degToRad(geometryBearing.x),
				THREE.MathUtils.degToRad(geometryBearing.y),
				THREE.MathUtils.degToRad(geometryBearing.z)
			);

			// テクスチャを回転させる

			renderer.render(scene, camera);
		};
		animate();
	});

	const nextPoint = (point) => {
		dispatch('nextPoint', point.feaureData);
	};

	$: created360Mesh(feature);
</script>

<!-- <div class="custom-canvas-back"></div> -->
<div class="relative h-full w-full">
	{#if isloading}
		<div class="custom-loading">
			<div class="custom-spinner"></div>
		</div>
	{:else}
		<div
			class="custom-3d pointer-events-none absolute bottom-[10px] grid w-full place-items-center"
		>
			<div class="custom-control-warp">
				<div bind:this={controlDiv} class="custom-control">
					{#each nextPointData as point, index}
						<button
							on:click={() => nextPoint(point)}
							class="custom-arrow"
							style="--angle: {point.bearing}deg;"
						>
							<Icon
								icon="ic:baseline-double-arrow"
								width="128"
								height="128"
								class=""
								style="transform: rotate({point.bearing - 90}deg);"
							/>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
	<canvas class="h-full w-full" bind:this={canvas}></canvas>
</div>

<style>
	canvas {
		background-image: radial-gradient(#382c6e, #000000);
	}

	.custom-3d {
		pointer-events: none;
		transform-style: preserve-3d;
		perspective: 1000px;
	}

	.custom-control-warp {
		transform: rotateX(60deg);
	}

	.custom-control {
		transform-origin: center;
		height: 400px;
		width: 400px;
		pointer-events: none;
	}

	.custom-arrow {
		pointer-events: auto;
		border-radius: 50%;
		display: grid;
		place-items: center;
		padding: 5px;
		pointer-events: all;
		position: absolute;
		top: 50%;
		left: 50%;
		--x: calc(cos(calc(var(--angle) - 90deg)) * 150px);
		--y: calc(sin(calc(var(--angle) - 90deg)) * 150px);
		translate: calc(var(--x) - 50%) calc(var(--y) - 50%);
		color: #fff;
		filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.5));
	}

	.custom-loading {
		z-index: 9999;
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.custom-spinner {
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
