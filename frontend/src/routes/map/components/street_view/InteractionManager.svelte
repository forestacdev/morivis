<script lang="ts">
	import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import * as THREE from 'three';

	import { IN_CAMERA_FOV, MIN_CAMERA_FOV, MAX_CAMERA_FOV } from './constants';
	import { setStreetViewCameraParams } from '$routes/map/utils/params';
	import { checkPc } from '$routes/map/utils/ui';
	import { getCameraXYRotation } from './utils';
	import { isStreetView } from '$routes/stores';
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';

	interface Props {
		canvas: HTMLCanvasElement;
		camera: THREE.PerspectiveCamera;
		orbitControls: OrbitControls;
		renderer: THREE.WebGLRenderer;
		mobileFullscreen: boolean;
		onResize: () => void;
	}

	let {
		canvas = $bindable(),
		camera,
		orbitControls = $bindable(),
		renderer,
		mobileFullscreen,
		onResize
	}: Props = $props();

	// 視点操作のイージングの値
	orbitControls.dampingFactor = 0.1;

	// マウスドラッグの反転
	orbitControls.rotateSpeed *= checkPc() ? -0.3 : -0.6;
	orbitControls.enableDamping = true;
	orbitControls.enablePan = false;
	orbitControls.enableZoom = false;
	orbitControls.maxZoom = 1;
	orbitControls.addEventListener('end', () => {
		// ズーム終了時の処理
		setStreetViewCameraParams(getCameraXYRotation(camera));
	});

	export const fov = new Tween(IN_CAMERA_FOV, { duration: 300, easing: cubicOut });

	$effect(() => {
		if (fov && camera) {
			camera.fov = fov.current; // tweened ストアの現在の値をカメラのFOVに設定
			camera.updateProjectionMatrix();
		}
	});

	// マウスホイールでFOVを変更するイベントリスナー
	canvas.addEventListener('wheel', (event) => {
		if (!camera) return;
		const zoomSpeed = 0.51; // ズーム速度

		const newFOV = camera.fov + event.deltaY * 0.05 * zoomSpeed;

		// マウススクロールの方向に応じてFOVを増減

		fov.set(Math.max(MIN_CAMERA_FOV, Math.min(MAX_CAMERA_FOV, newFOV)));
	});

	// スマホのピンチ操作に対応するためのタッチイベント
	let lastTouchDistance = 0;

	canvas.addEventListener('touchstart', (event) => {
		if (event.touches.length === 2) {
			// 2本指の距離を計算
			const touch1 = event.touches[0];
			const touch2 = event.touches[1];
			lastTouchDistance = Math.sqrt(
				Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
			);
		}
	});

	canvas.addEventListener(
		'touchmove',
		(event) => {
			if (event.touches.length === 2) {
				event.preventDefault(); // デフォルトのピンチズームを無効化

				const zoomSpeed = 15; // ズーム速度

				// 現在の2本指の距離を計算
				const touch1 = event.touches[0];
				const touch2 = event.touches[1];
				const currentDistance = Math.sqrt(
					Math.pow(touch2.clientX - touch1.clientX, 2) +
						Math.pow(touch2.clientY - touch1.clientY, 2)
				);

				// 距離の変化からズーム方向を決定
				const deltaDistance = currentDistance - lastTouchDistance;
				const newFOV = camera.fov - deltaDistance * 0.1 * zoomSpeed;

				fov.set(Math.max(MIN_CAMERA_FOV, Math.min(MAX_CAMERA_FOV, newFOV)));

				lastTouchDistance = currentDistance;
			}
		},
		{ passive: false }
	);

	// タッチ終了時の処理
	canvas.addEventListener('touchend', (_event) => {
		lastTouchDistance = 0;
		orbitControls.enablePan = true;
	});

	// キャンバスのリサイズ
	const onCanvasResize = (value: boolean) => {
		if (!renderer || !canvas || !camera) return;

		// キャンバスの実際のサイズを取得
		const width = canvas.clientWidth;
		const height = value
			? window.innerHeight // モバイルフルスクリーン時はヘッダー分を引く
			: window.innerHeight / 2;

		// レンダラーのサイズを調整する
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(width, height);

		// カメラのアスペクト比を正す
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};

	$effect(() => {
		if (mobileFullscreen !== undefined) {
			// 少し遅延を入れてからリサイズを実行（CSSトランジションの完了を待つ）
			setTimeout(() => {
				onCanvasResize(mobileFullscreen);
			}, 500);
		}
	});

	isStreetView.subscribe(async (value) => {
		onResize();
	});

	window.addEventListener('resize', onResize);
</script>
