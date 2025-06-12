<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { timeout } from 'es-toolkit';

	let canvas: HTMLCanvasElement | null = null;

	const textureData = {
		a: 'https://raw.githubusercontent.com/forestacdev/360photo-data-webp/refs/heads/main/webp/R0010026.webp',
		b: 'https://raw.githubusercontent.com/forestacdev/360photo-data-webp/refs/heads/main/webp/R0010027.webp',
		c: 'https://raw.githubusercontent.com/forestacdev/360photo-data-webp/refs/heads/main/webp/R0010028.webp'
	};

	// ダブルバッファリング用のuniform
	const uniforms = {
		textureA: { value: null },
		textureB: { value: null },
		fadeStartTime: { value: 0.0 }, // フェード開始時刻
		fadeSpeed: { value: 2.0 }, // フェード速度（秒）
		time: { value: 0.0 } // 現在時刻
	};

	// テクスチャローダーを保持
	let textureLoader: THREE.TextureLoader;

	onMount(() => {
		if (!canvas) {
			console.error('Canvas element is not defined');
			return;
		}

		// テクスチャローダーを初期化
		textureLoader = new THREE.TextureLoader();

		// 初期テクスチャを読み込み
		const initialTexture = textureLoader.load(textureData.a);
		uniforms.textureA.value = initialTexture;
		uniforms.textureB.value = initialTexture; // ダミーとして同じテクスチャを設定

		// シーンの作成
		const scene = new THREE.Scene();

		// カメラ
		const camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			100000
		);

		camera.position.set(100, 100, 100);
		scene.add(camera);

		// キャンバス
		const context = canvas.getContext('webgl2') as WebGL2RenderingContext;

		// コントロール
		const orbitControls = new OrbitControls(camera, canvas);
		orbitControls.enableDamping = true;
		orbitControls.enablePan = false;
		orbitControls.enableZoom = false;
		orbitControls.autoRotate = true;
		orbitControls.autoRotateSpeed = 2.5;

		const zoomControls = new TrackballControls(camera, canvas);
		zoomControls.noPan = true;
		zoomControls.noRotate = true;
		zoomControls.zoomSpeed = 0.2;

		// レンダラー
		const renderer = new THREE.WebGLRenderer({
			canvas,
			context,
			alpha: true
		});
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// 球体
		const geometry = new THREE.SphereGeometry(50, 32, 32);

		// 自動フェード用シェーダー
		const fadeShaderMaterial = new THREE.ShaderMaterial({
			uniforms: uniforms,
			fragmentShader: `
				uniform sampler2D textureA;
				uniform sampler2D textureB;
				uniform float fadeStartTime;
				uniform float fadeSpeed;
				uniform float time;
				varying vec2 vUv;
				
				void main() {
					vec4 colorA = texture2D(textureA, vUv);
					vec4 colorB = texture2D(textureB, vUv);
					
					// フェード進行度を計算（0.0 = B表示、1.0 = A表示）
					float fadeProgress = (time - fadeStartTime) * fadeSpeed;
					fadeProgress = clamp(fadeProgress, 0.0, 1.0);
					
					// スムーズステップでより自然なフェード
					float smoothFade = smoothstep(0.0, 1.0, fadeProgress);
					
					// フェードが開始されていない場合（fadeStartTime <= 0.0）はAのみ表示
					float shouldFade = step(0.001, fadeStartTime);
					
					gl_FragColor = mix(colorA, mix(colorB, colorA, smoothFade), shouldFade);
				}
			`,
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`
		});
		const sphere = new THREE.Mesh(geometry, fadeShaderMaterial);
		scene.add(sphere);

		// 画面リサイズ時にキャンバスもリサイズ
		const onResize = () => {
			const width = window.innerWidth;
			const height = window.innerHeight;
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};
		window.addEventListener('resize', onResize);

		// アニメーション（時間更新を追加）
		const animate = () => {
			requestAnimationFrame(animate);

			// 経過時間を更新
			uniforms.time.value = performance.now() * 0.001; // ミリ秒を秒に変換

			const target = orbitControls.target;
			orbitControls.update();
			zoomControls.target.set(target.x, target.y, target.z);
			zoomControls.update();
			renderer.render(scene, camera);
		};
		animate();
	});

	// Promise を使った読み込み完了待ち
	const loadTextureAsync = (url: string): Promise<THREE.Texture> => {
		return new Promise((resolve, reject) => {
			textureLoader.load(
				url,
				(texture) => {
					resolve(texture);
				},
				undefined,
				(error) => {
					reject(error);
				}
			);
		});
	};

	const loadTextureWithFade = async (url: string) => {
		try {
			const newTexture = await loadTextureAsync(url);

			// 現在のテクスチャをBに移動
			uniforms.textureB.value = uniforms.textureA.value;
			uniforms.textureA.value = newTexture;

			// フェード開始時刻を設定（シェーダーが自動的にフェードを開始）
			uniforms.fadeStartTime.value = performance.now() * 0.001;
		} catch (error) {
			console.error('フェード付きテクスチャの読み込みに失敗しました:', error);
		}
	};
</script>

<canvas class="h-full w-full" bind:this={canvas}></canvas>
<button
	class="absolute bottom-4 right-4 rounded bg-amber-50 px-4 py-2"
	onclick={() => loadTextureWithFade(textureData.b)}
>
	フェード切り替え
</button>
