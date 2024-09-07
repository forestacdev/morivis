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
	//svelteからcreateEventDispatcher関数をインポートする。
	const dispatch = createEventDispatcher();

	import { onMount } from 'svelte';
	import bearing from '@turf/bearing';
	const IMAGE_URL = 'https://raw.githubusercontent.com/forestacdev/theta360-Images/main/images/';
	export let feature: any;
	export let nextPointData = [];
	let canvas: HTMLCanvasElement;
	let scene: THREE.Scene;
	let isRendering = true;
	let controlDiv: HTMLDivElement;
	let isRotatingClockwise = true;
	export let cameraBearing;

	let currentRequestController = null;

	let geometryBearing = { x: 0, y: 0, z: 0 };

	const gui = new GUI();

	const controllerX = gui
		.add(geometryBearing, 'x', 0, 360)
		.listen()
		.onChange((value) => {
			// geometryBearing.x = value;
		});

	const controllerY = gui
		.add(geometryBearing, 'y', 0, 360)
		.listen()
		.onChange((value) => {
			// geometryBearing.y = value;
		});

	const controllerZ = gui
		.add(geometryBearing, 'z', 0, 360)
		.listen()
		.onChange((value) => {
			// geometryBearing.z = value;
		});

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
		console.log(feature);
		const imageUrl = `${IMAGE_URL}${feature.properties['Name']}`;
		const id = feature.properties['ID'];
		const angleData = angleDataJson.find((angle) => angle.id === id);
		geometryBearing.x = angleData.angleX;
		geometryBearing.y = angleData.angleY;
		geometryBearing.z = angleData.angleZ;

		// GUI側のコントロールの値を更新
		controllerX.setValue(geometryBearing.x);
		controllerY.setValue(geometryBearing.y);
		controllerZ.setValue(geometryBearing.z);

		if (!imageUrl) return;

		// 画像を読み込み
		const texture = await new THREE.TextureLoader().load(imageUrl);
		texture.colorSpace = THREE.SRGBColorSpace;

		const mash = scene.getObjectByName('360');

		if (!mash || !mash.material) return;

		mash.material.map = texture;

		// テクスチャが読み込まれたらレンダリングを開始
		isRendering = true;
	};

	onMount(async () => {
		const sizes = {
			width: canvas.clientWidth,
			height: canvas.clientHeight
		};

		// シーンの作成
		scene = new THREE.Scene();

		// カメラ
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100000);
		camera.position.set(0, 0, 0);

		// camera.position.set(-100, 100, -100);
		scene.add(camera);

		// カメラの設定
		camera.aspect = sizes.width / sizes.height;
		camera.updateProjectionMatrix();

		// パソコン閲覧時マウスドラッグで視点操作する
		const orbitControls = new OrbitControls(camera, canvas);
		orbitControls.target.set(camera.position.x + 0.15, camera.position.y, camera.position.z);
		// 視点操作のイージングをONにする
		orbitControls.enableDamping = true;
		// 視点操作のイージングの値
		orbitControls.dampingFactor = 0.1;
		// 視点変更の速さ
		orbitControls.rotateSpeed = 0.5;
		// ズーム禁止
		orbitControls.enableZoom = false;
		// パン操作禁止
		orbitControls.enablePan = false;
		orbitControls.panSpeed = -1;

		const geometry = new THREE.SphereGeometry(50, 60, 40);
		geometry.scale(-1, 1, 1);

		// マテリアルの作成
		const material = new THREE.MeshBasicMaterial({
			// 画像をテクスチャとして指定
			map: new THREE.TextureLoader().load('')
		});

		// 球体(形状)にマテリアル(質感)を貼り付けて物体を作成
		const sphere = new THREE.Mesh(geometry, material);
		sphere.name = '360';

		// シーンに追加
		scene.add(sphere);

		// ヘルパーグリッド
		// const gridHelper = new THREE.GridHelper(200, 100);
		// scene.add(gridHelper);
		// gridHelper.position.y = -5;

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
			// zoomControls.target.set(target.x, target.y, target.z);
			// zoomControls.update();
			// const cameraRotationY = camera.rotation.y * (180 / Math.PI);
			// controlDiv.style.transform = `rotateZ(${cameraRotationY}deg)`;
			// カメラのY軸回転角度（ラジアン単位）を取得
			camera.rotation.order = 'YXZ';
			let degrees = THREE.MathUtils.radToDeg(camera.rotation.y);
			degrees = ((degrees + 360) % 360) - 270; // 0〜360度の範囲に調整

			if (!controlDiv) return;

			controlDiv.style.transform = `rotateZ(${degrees}deg)`;

			cameraBearing = degrees;
			const mesh = scene.getObjectByName('360');
			if (mesh) {
				// mesh.rotation.y = THREE.MathUtils.degToRad(degrees);
				mesh.rotation.x = THREE.MathUtils.degToRad(geometryBearing.x);
				mesh.rotation.y = THREE.MathUtils.degToRad(geometryBearing.y);
				mesh.rotation.z = THREE.MathUtils.degToRad(geometryBearing.z);
			}

			// console.log(degrees);
			renderer.render(scene, camera);
		};
		animate();
	});

	const nextPoint = (pointData) => {
		dispatch('nextPoint', pointData);
	};

	$: created360Mesh(feature);
</script>

<!-- <div class="custom-canvas-back"></div> -->
<div class="relative h-full w-full">
	<div
		class="custom-3d pointer-events-none absolute bottom-[10px] grid w-full place-items-center"
	>
		<div class="custom-control-warp">
			<div bind:this={controlDiv} class="custom-control">
				{#each nextPointData as point, index}
					<button
						on:click={() => nextPoint(point.feaureData)}
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

	/* ポップアップの中のボタン */
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
		--x: calc(cos(calc(var(--angle) - 90deg)) * 100px);
		--y: calc(sin(calc(var(--angle) - 90deg)) * 100px);
		translate: calc(var(--x) - 50%) calc(var(--y) - 50%);
		animation: fly forwards 0.25s;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		color: #fff;
	}
</style>
