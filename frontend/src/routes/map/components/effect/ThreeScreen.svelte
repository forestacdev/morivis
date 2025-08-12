<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';

	import { mapStore } from '$routes/stores/map';

	let canvas = $state<HTMLCanvasElement | null>(null);
	let mapCanvas: HTMLCanvasElement | null = null;
	let animationId: number | null = null;
	let renderer: THREE.WebGLRenderer | null = null;
	let resizeHandler: (() => void) | null = null;
	let renderCallback: (() => void) | null = null;

	onMount(() => {
		if (!canvas) {
			console.error('Canvas element is not bound');
			return;
		}
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;

		// 平行投影カメラのセットアップ
		const aspect = width / height;
		const cameraSize = 5;
		const camera = new THREE.OrthographicCamera(
			-cameraSize * aspect, // left
			cameraSize * aspect, // right
			cameraSize, // top
			-cameraSize, // bottom
			0.1, // near
			1000 // far
		);
		camera.position.set(0, 0, 10);
		camera.lookAt(0, 0, 0);

		// シーンとレンダラー
		const scene = new THREE.Scene();
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setSize(width, height);

		// テクスチャ化
		mapCanvas = mapStore.getCanvas();
		const mapTexture = new THREE.Texture(mapCanvas);
		mapTexture.needsUpdate = true;

		// ShaderMaterial を作成
		const material = new THREE.ShaderMaterial({
			uniforms: {
				uMapTexture: { value: mapTexture }
			},
			vertexShader: `
                varying vec2 vUv;
                void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
			fragmentShader: `
                uniform sampler2D uMapTexture;
                varying vec2 vUv;
                void main() {
                vec4 texColor = texture2D(uMapTexture, vUv);
                gl_FragColor = texColor;
                }
            `,
			transparent: false
		});

		// 平面ジオメトリとメッシュ

		const sprite = new THREE.Sprite(material);
		// カメラ視野にぴったり合わせるスケーリング
		const camWidth = camera.right - camera.left;
		const camHeight = camera.top - camera.bottom;
		sprite.scale.set(camWidth, camHeight, 1);
		scene.add(sprite);

		// 地図の更新イベントでテクスチャ更新を指示
		renderCallback = () => {
			mapCanvas = mapStore.getCanvas(); // MapLibre の canvas
			mapTexture.image = mapCanvas;
			mapTexture.needsUpdate = true; // MapLibre の canvas が更新されたらテクスチャも更新
		};
		mapStore.onRender(renderCallback);

		// アニメーションループ
		function animate() {
			if (renderer) {
				renderer.render(scene, camera);
			}
			animationId = requestAnimationFrame(animate);
		}
		animationId = requestAnimationFrame(animate);

		// リサイズ対応（必要に応じて）
		resizeHandler = () => {
			const w = canvas!.clientWidth;
			const h = canvas!.clientHeight;
			const aspect = w / h;
			camera.left = -cameraSize * aspect;
			camera.right = cameraSize * aspect;
			camera.top = cameraSize;
			camera.bottom = -cameraSize;
			camera.updateProjectionMatrix();
			if (renderer) {
				renderer.setSize(w, h);
			}
		};
		window.addEventListener('resize', resizeHandler);
	});

	onDestroy(() => {
		// アニメーションループを停止
		if (animationId !== null) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}

		// イベントリスナーを削除
		if (resizeHandler) {
			window.removeEventListener('resize', resizeHandler);
			resizeHandler = null;
		}

		// MapLibreのコールバックを削除
		if (renderCallback) {
			// MapStoreがoffRenderメソッドを持つ場合
			// mapStore.offRender(renderCallback);
		}

		// Three.jsリソースを破棄
		if (renderer) {
			renderer.dispose();
			renderer = null;
		}
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none absolute h-full w-full"></canvas>

<style>
</style>
