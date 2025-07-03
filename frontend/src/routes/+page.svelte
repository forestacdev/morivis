<script lang="ts">
	import { fromArrayBuffer, rgb } from 'geotiff';
	import gsap from 'gsap';
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
	import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

	import { goto } from '$app/navigation';
	import FacLogo from '$lib/components/svgs/FacLogo.svelte';

	import { isBlocked } from '$routes/stores/ui';
	import { fade, fly, scale } from 'svelte/transition';

	import { createdDemMesh, uniforms } from './utils';

	let canvas = $state<HTMLCanvasElement | null>(null);
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let orbitControls: OrbitControls;
	let zoomControls: TrackballControls;
	let showButton = $state<boolean>(true);

	const goMap = () => {
		showButton = false;
		goto('/map');

		return;
	};

	const onResize = () => {
		// サイズを取得
		const width = window.innerWidth;
		const height = window.innerHeight;

		uniforms.resolution.value.set(width, height);

		// レンダラーのサイズを調整する
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(width, height);

		// カメラのアスペクト比を正す
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};

	onMount(async () => {
		if (!canvas) return;
		// シーンの作成
		scene = new THREE.Scene();

		// カメラ
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);

		let rot = -170;
		const radian = (rot * Math.PI) / 180;
		const distance = 180;

		// 角度に応じてカメラの位置を設定
		camera.position.x = distance * Math.sin(radian);
		camera.position.z = distance * Math.cos(radian);
		camera.position.y = 90;

		// camera.position.set(100, 100, 100);
		scene.add(camera);

		// キャンバス
		const context = canvas.getContext('webgl2') as WebGL2RenderingContext;

		// コントロール
		orbitControls = new OrbitControls(camera, canvas);
		orbitControls.enableDamping = true;
		orbitControls.enablePan = false;
		orbitControls.enableZoom = false;
		orbitControls.autoRotateSpeed = 0.5;
		orbitControls.autoRotate = true;

		zoomControls = new TrackballControls(camera, canvas);
		zoomControls.noPan = true;
		zoomControls.noRotate = true;
		zoomControls.zoomSpeed = 0.2;

		// レンダラー
		renderer = new THREE.WebGLRenderer({
			canvas,
			context,
			alpha: true
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// ヘルパーグリッド
		// const gridHelper = new THREE.GridHelper(200, 100);
		// scene.add(gridHelper);
		// gridHelper.position.y = -5;

		// const radius = 10;
		// const sectors = 16;
		// const rings = 80;
		// const divisions = 64;

		// const helper = new THREE.PolarGridHelper(radius, sectors, rings, divisions);
		// scene.add(helper);

		// // ヘルパー方向
		// const axesHelper = new THREE.AxesHelper(100);
		// scene.add(axesHelper);

		const mesh = await createdDemMesh();
		if (mesh) {
			scene.add(mesh);
		} else {
			console.error('Failed to create DEM mesh');
		}

		const clock = new THREE.Clock();

		// アニメーション
		const animate = () => {
			requestAnimationFrame(animate);

			orbitControls.update();
			zoomControls.update();

			uniforms.time.value = clock.getElapsedTime();

			renderer.render(scene, camera);
		};
		animate();

		// 画面リサイズ時にキャンバスもリサイズ

		window.addEventListener('resize', onResize);
		// 初期化
		onResize();
	});

	onDestroy(() => {
		// クリーンアップ
		orbitControls.dispose();
		zoomControls.dispose();
		scene.clear(); // シーン内のオブジェクトを削除
		renderer.dispose();
		// イベントリスナーの削除

		window.removeEventListener('resize', onResize);
	});
</script>

<div class="app relative flex h-screen w-screen">
	<canvas class="h-screen w-full bg-gray-900" bind:this={canvas}></canvas>

	<div class="pointer-events-none absolute left-0 top-0 z-10 h-full w-full">
		<div class="flex h-full w-full flex-col items-center justify-center gap-6">
			<span class="text-[100px] font-bold text-white">morivis</span>

			{#if !$isBlocked}
				<button
					transition:scale={{ duration: 300, opacity: 0.5 }}
					class="bg-base pointer-events-auto cursor-pointer rounded-full p-4 px-8 text-2xl {$isBlocked
						? 'pointer-events-none'
						: 'pointer-events-auto'}"
					onclick={goMap}
					disabled={$isBlocked}
					>クリックでマップを見る
				</button>
			{/if}

			<div class="absolute bottom-8 [&_path]:fill-white">
				<FacLogo width={'300'} />
			</div>
		</div>
	</div>
</div>
