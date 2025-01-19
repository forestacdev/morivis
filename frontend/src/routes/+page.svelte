<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
	let canvas = $state<HTMLCanvasElement | null>(null);
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;

	// 画面リサイズ時にキャンバスもリサイズ

	onMount(async () => {
		if (!canvas) return;
		// シーンの作成
		scene = new THREE.Scene();

		// カメラ
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);

		camera.position.set(100, 100, 100);
		scene.add(camera);

		// キャンバス
		const context = canvas.getContext('webgl2') as WebGL2RenderingContext;

		// コントロール
		const orbitControls = new OrbitControls(camera, canvas);
		orbitControls.enableDamping = true;
		orbitControls.enablePan = false;
		orbitControls.enableZoom = false;

		const zoomControls = new TrackballControls(camera, canvas);
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
		const gridHelper = new THREE.GridHelper(200, 100);
		scene.add(gridHelper);
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

		// アニメーション
		const animate = () => {
			requestAnimationFrame(animate);

			orbitControls.update();
			zoomControls.update();

			renderer.render(scene, camera);
		};
		animate();

		// 画面リサイズ時にキャンバスもリサイズ
		const onResize = () => {
			// サイズを取得
			const width = window.innerWidth;
			const height = window.innerHeight;

			// レンダラーのサイズを調整する
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(width, height);

			// カメラのアスペクト比を正す
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};
		window.addEventListener('resize', onResize);
	});
</script>

<div class="app relative flex h-screen w-screen">
	<canvas class="h-screen w-full bg-black" bind:this={canvas}></canvas>

	<div class="h-full w-full">
		<a href="/map">
			<div class="relative h-full rounded-lg">
				<div
					class="absolute left-1/2 top-1/2 z-10 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-lg bg-opacity-0 hover:bg-black hover:bg-opacity-20"
				>
					<div class="flex h-full w-full items-center justify-center">
						<span class="text-[30px] font-bold text-white [text-shadow:_0px_0px_10px_#000]"
							>Let's take a look at the map.</span
						>
					</div>
				</div>
			</div>
		</a>
	</div>
</div>
