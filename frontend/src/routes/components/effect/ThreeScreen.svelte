<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';

	import { mapStore } from '$routes/store/map';

	let canvas = $state<HTMLCanvasElement | null>(null);
	let mapCanvas: HTMLCanvasElement | null = null;

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
		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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
		mapStore.onRender(() => {
			mapCanvas = mapStore.getCanvas(); // MapLibre の canvas
			mapTexture.image = mapCanvas;
			mapTexture.needsUpdate = true; // MapLibre の canvas が更新されたらテクスチャも更新
		});
		// アニメーションループ
		function animate() {
			renderer.render(scene, camera);
			requestAnimationFrame(animate);
		}
		animate();

		// リサイズ対応（必要に応じて）
		const onResize = () => {
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			const aspect = w / h;
			camera.left = -cameraSize * aspect;
			camera.right = cameraSize * aspect;
			camera.top = cameraSize;
			camera.bottom = -cameraSize;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
		};
		window.addEventListener('resize', onResize);

		return () => {
			window.removeEventListener('resize', onResize);
			renderer.dispose();
		};
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none absolute h-full w-full"></canvas>

<style>
</style>
