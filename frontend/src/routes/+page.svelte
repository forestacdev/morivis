<script lang="ts">
	import { fromArrayBuffer, rgb } from 'geotiff';
	import gsap from 'gsap';
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
	import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
	import bufferFragment from './shaders/fragmentBuffer.glsl?raw';
	import bufferVertex from './shaders/vertexBuffer.glsl?raw';
	import { goto } from '$app/navigation';
	import FacLogo from '$lib/components/svgs/FacLogo.svelte';

	import { isBlocked } from '$routes/stores/ui';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { checkToTermsAccepted } from '$routes/map/utils/local_storage';

	import { buffarUniforms, createdDemMesh, uniforms } from './utils';
	import { showTermsDialog, showInfoDialog } from './stores';
	import Icon from '@iconify/svelte';

	let canvas = $state<HTMLCanvasElement | null>(null);
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let orbitControls: OrbitControls;
	let zoomControls: TrackballControls;
	let showButton = $state<boolean>(true);
	let renderTarget: THREE.WebGLRenderTarget;
	let bufferScene: THREE.Scene;

	let postMesh: THREE.Mesh;
	let isLoading = $state<boolean>(false);
	let controlDiv = $state<HTMLDivElement | null>(null);

	const goMap = () => {
		showButton = false;
		if (import.meta.env.MODE === 'production') {
			goto('/morivis/map');
		} else {
			goto('/map');
		}

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

		buffarUniforms.resolution.value.set(width, height);

		// フレームバッファのサイズを更新
		if (!renderTarget) return;

		renderTarget.setSize(width, height);

		// シェーダーの解像度を更新
		(postMesh.material as THREE.ShaderMaterial).uniforms.resolution.value.set(width, height);
	};

	onMount(async () => {
		if (!canvas) return;

		if (!canvas) return;
		const sizes = {
			width: window.innerWidth,
			height: window.innerHeight
		};
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

		// フレームバッファ用のシーンとカメラを作成
		bufferScene = new THREE.Scene();

		// キャンバス
		const context = canvas.getContext('webgl2') as WebGL2RenderingContext;

		// コントロール
		orbitControls = new OrbitControls(camera, canvas);
		orbitControls.enableDamping = true;
		orbitControls.enablePan = false;
		orbitControls.enableZoom = false;
		orbitControls.autoRotateSpeed = 0.5;
		orbitControls.autoRotate = true;
		orbitControls.minDistance = 100;
		orbitControls.maxDistance = 500;
		orbitControls.maxPolarAngle = Math.PI / 2 - 0.35;

		zoomControls = new TrackballControls(camera, canvas);
		zoomControls.noPan = true;
		zoomControls.noRotate = true;
		zoomControls.zoomSpeed = 0.2;

		renderTarget = new THREE.WebGLRenderTarget(sizes.width, sizes.height, {
			depthBuffer: false,
			stencilBuffer: false,
			magFilter: THREE.NearestFilter,
			minFilter: THREE.NearestFilter,
			wrapS: THREE.ClampToEdgeWrapping,
			wrapT: THREE.ClampToEdgeWrapping
		});
		buffarUniforms.screenTexture.value = renderTarget.texture as THREE.Texture;
		// フレームバッファに描画するオブジェクトを追加
		const buffarGeometry = new THREE.PlaneGeometry(2, 2);
		const buffarMaterial = new THREE.ShaderMaterial({
			fragmentShader: bufferFragment,
			vertexShader: bufferVertex,
			uniforms: buffarUniforms as any // 型の互換性のためにanyを使用
		});

		postMesh = new THREE.Mesh(buffarGeometry, buffarMaterial);
		bufferScene.add(postMesh);

		// レンダラー
		renderer = new THREE.WebGLRenderer({
			canvas,
			context,
			alpha: true
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		// renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

			// フレームバッファ;
			renderer.setRenderTarget(renderTarget);
			renderer.render(scene, camera);

			renderer.setRenderTarget(null);
			renderer.render(bufferScene, camera);

			// シェーダーの解像度を更新
			(postMesh.material as THREE.ShaderMaterial).uniforms.resolution.value.set(
				window.innerWidth,
				window.innerHeight
			);
		};
		animate();

		// 画面リサイズ時にキャンバスもリサイズ
		window.addEventListener('resize', onResize);
		onResize();

		if (!checkToTermsAccepted()) {
			showTermsDialog.set(true);
		}
	});

	onDestroy(() => {
		// クリーンアップ
		orbitControls.dispose();
		zoomControls.dispose();
		scene.clear(); // シーン内のオブジェクトを削除
		renderer.dispose();
		renderTarget.dispose(); // フレームバッファの解放
		postMesh.geometry.dispose(); // メッシュのジオメトリを解放
		// イベントリスナーの削除

		window.removeEventListener('resize', onResize);
	});
	const toggleInfoDialog = () => {
		showInfoDialog.set(!$showInfoDialog);
	};

	const toggleTermsDialog = () => {
		showTermsDialog.set(!$showTermsDialog);
	};
</script>

<div class="app relative flex h-dvh w-dvw">
	<canvas class="h-full w-full bg-gray-900" bind:this={canvas}></canvas>

	<div class="pointer-events-none absolute left-0 top-0 z-10 h-full w-full">
		<div class="flex h-full w-full flex-col items-center justify-center">
			<span class="c-text-shadow text-[100px] font-bold text-white">morivis</span>
			{#if !$isBlocked}
				<button
					transition:slide={{ duration: 300, axis: 'y' }}
					class="bg-base hover:bg-main pointer-events-auto shrink-0 cursor-pointer rounded-full px-8 py-4 text-2xl transition-all duration-200 hover:text-white {$isBlocked
						? 'pointer-events-none'
						: 'pointer-events-auto'}"
					onclick={goMap}
					disabled={$isBlocked}
					>マップを見る
				</button>
			{/if}
		</div>
	</div>
	<div class="absolute bottom-8 flex w-full items-center justify-between px-8 opacity-90">
		<div class="flex gap-3">
			<a
				class="pointer-events-auto flex cursor-pointer items-center text-white"
				href="https://github.com/forestacdev/morivis"
				target="_blank"
				rel="noopener noreferrer"
				><Icon icon="mdi:github" class="h-8 w-8" />
			</a>
			<button
				class="pointer-events-auto flex cursor-pointer items-center text-white"
				onclick={toggleInfoDialog}
			>
				<Icon icon="akar-icons:info-fill" class="h-7 w-7" />
			</button>
		</div>
		<a
			class="pointer-events-auto shrink-0 cursor-pointer [&_path]:fill-white"
			href="https://www.forest.ac.jp/"
			target="_blank"
			rel="noopener noreferrer"
		>
			<FacLogo width={'230'} />
		</a>
		<button
			class="pointer-events-auto flex shrink-0 cursor-pointer items-center p-2 text-white"
			onclick={toggleTermsDialog}
		>
			<span class="select-none underline">利用規約</span>
		</button>
	</div>
</div>

<style>
	.c-text-shadow {
		text-shadow: rgb(0, 50, 24) 1px 0 10px;
	}
</style>
