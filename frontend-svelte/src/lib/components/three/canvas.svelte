<script lang="ts">
	import * as THREE from 'three';
	import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

	import { onMount } from 'svelte';

	onMount(() => {
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight
		};

		// キャンバスの作成
		const canvas = document.createElement('canvas');
		document.body.appendChild(canvas);

		// シーンの作成
		const scene = new THREE.Scene();

		// カメラ
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100000);
		camera.position.set(-190, 280, -350);
		scene.add(camera);

		// コントロール
		const mapControls = new MapControls(camera, canvas);
		mapControls.enableDamping = true;
		mapControls.enableZoom = false;
		mapControls.maxDistance = 1000;

		const zoomControls = new TrackballControls(camera, canvas);
		zoomControls.noPan = true;
		zoomControls.noRotate = true;
		zoomControls.noZoom = false;
		zoomControls.zoomSpeed = 0.5;

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

		// アニメーション
		const animate = () => {
			requestAnimationFrame(animate);

			const target = mapControls.target;
			mapControls.update();
			zoomControls.target.set(target.x, target.y, target.z);
			zoomControls.update();
			renderer.render(scene, camera);
		};
		animate();
	});
</script>

<div>
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	canvas {
		background-image: radial-gradient(#382c6e, #000000);
	}
</style>
