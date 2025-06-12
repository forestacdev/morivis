<script lang="ts">
	import Icon from '@iconify/svelte';
	import { GUI } from 'lil-gui';
	import { onMount, tick } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import gsap from 'gsap';

	import angleDataJson from './angle.json';

	import fs from './shader/fragment.glsl?raw';
	import vs from './shader/vertex.glsl?raw';

	import fragment from './shader/fragmentBuffer.glsl?raw';
	import vertex from './shader/vertexBuffer.glsl?raw';
	import { getCameraYRotation, updateAngle, degreesToRadians } from './utils';

	import type { NextPointData, StreetViewPoint } from '$routes/map/+page.svelte';
	import { isStreetView, DEBUG_MODE } from '$routes/store';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	const IMAGE_URL = 'https://raw.githubusercontent.com/forestacdev/fac-cubemap-image/main/images/';
	const IMAGE_URL_SHINGLE =
		'https://raw.githubusercontent.com/forestacdev/360photo-data-webp/main/webp/';

	const IN_CAMERA_FOV = 75;
	const OUT_CAMERA_FOV = 150;
	const IN_CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
	const OUT_CAMERA_POSITION = new THREE.Vector3(0, 10, 0);

	// テクスチャローダーを保持
	let textureLoader: THREE.TextureLoader;

	interface Props {
		streetViewPoint: StreetViewPoint | null;
		nextPointData: NextPointData[] | null;
		cameraBearing: number;
		setPoint: (streetViewPoint: StreetViewPoint) => void;
		showThreeCanvas: boolean;
		showAngleMarker: boolean; // 角度マーカーを表示するかどうか
	}

	let {
		streetViewPoint,
		nextPointData,
		cameraBearing = $bindable(),

		setPoint,
		showThreeCanvas,
		showAngleMarker = $bindable()
	}: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let currentSceneId = $state<string>('');
	let scene: THREE.Scene;
	let nextScenes: {
		id: string;
		scene: THREE.Scene;
		angle: {
			x: number;
			y: number;
			z: number;
		};
	}[] = []; // 次のポイントのシーンを管理する配列
	let spheres: THREE.Mesh[] = []; // 球体を管理する配列
	let camera: THREE.PerspectiveCamera;
	let orbitControls: OrbitControls;
	let renderer: THREE.WebGLRenderer;
	let renderTarget: THREE.WebGLRenderTarget;
	let bufferScene: THREE.Scene;
	const fov = new Tween(IN_CAMERA_FOV, { duration: 300, easing: cubicOut });

	let isAnimating = $state<boolean>(true);

	let postMesh: THREE.Mesh;
	let isRendering = true;
	let isLoading = $state<boolean>(false);
	let controlDiv = $state<HTMLDivElement | null>(null);
	let fromPoint = $state<StreetViewPoint | null>(null);

	const textureData = {
		a: 'https://raw.githubusercontent.com/forestacdev/360photo-data-webp/refs/heads/main/webp/R0010026.webp',
		b: 'https://raw.githubusercontent.com/forestacdev/360photo-data-webp/refs/heads/main/webp/R0010027.webp',
		c: 'https://raw.githubusercontent.com/forestacdev/360photo-data-webp/refs/heads/main/webp/R0010028.webp'
	};

	interface Uniforms {
		skybox: { value: THREE.CubeTexture | null };
		shingleTexture: { value: THREE.Texture | null }; // シングルテクスチャの追加
		rotationAngles: { value: THREE.Vector3 };
		textureA: { value: THREE.Texture | null };
		textureB: { value: THREE.Texture | null };
		fadeStartTime: { value: number }; // フェード開始時刻
		fadeSpeed: { value: number }; // フェード速度（秒）
		time: { value: number }; // 現在時刻
	}
	const uniforms: Uniforms = {
		skybox: { value: null },
		shingleTexture: { value: null }, // シングルテクスチャの追加
		rotationAngles: { value: new THREE.Vector3() },
		textureA: { value: null },
		textureB: { value: null },
		fadeStartTime: { value: 0.0 }, // フェード開始時刻
		fadeSpeed: { value: 2.0 }, // フェード速度（秒）
		time: { value: 0.0 } // 現在時刻
	};

	interface BuffarUniforms {
		screenCenter: { value: THREE.Vector2 };
		resolution: { value: THREE.Vector2 };
		screenTexture: { value: THREE.Texture | null };
		zoomBlurStrength: { value: number }; // ズームブラーの強さ
	}

	const buffarUniforms: BuffarUniforms = {
		screenCenter: { value: new THREE.Vector2(0.5, 0.5) },
		resolution: {
			value: new THREE.Vector2(window.innerWidth, window.innerHeight)
		},
		screenTexture: { value: null },
		zoomBlurStrength: { value: 0.0 } // ズームブラーの強さ
	};

	let geometryBearing = { x: 0, y: 0, z: 0 };
	let controllerX;
	let controllerY;
	let controllerZ;

	const gui = new GUI();

	controllerX = gui.add(geometryBearing, 'x', 0, 360).listen();
	controllerY = gui.add(geometryBearing, 'y', 0, 360).listen();
	controllerZ = gui.add(geometryBearing, 'z', 0, 360).listen();

	const copy = {
		copyAngle: () => {
			// クリップボードに角度をjson textでコピー
			const angleX = geometryBearing.x;
			const angleY = geometryBearing.y;
			const angleZ = geometryBearing.z;
			const angleData = {
				id: streetViewPoint.properties['ID'],
				angleX: angleX,
				angleY: angleY,
				angleZ: angleZ
			};

			const angleJson = JSON.stringify(angleData, null, 2);
			navigator.clipboard
				.writeText(angleJson)
				.then(() => {
					console.log('角度データをクリップボードにコピーしました:', angleJson);
				})
				.catch((err) => {
					console.error('クリップボードへのコピーに失敗しました:', err);
				});
		}
	};

	// 角度を更新するボタンを追加
	gui.add(copy, 'copyAngle').name('copy Angle');

	// 球体を配置する関数
	const placeSpheres = (nextPointData: NextPointData[]) => {
		// 球体のパラメータ
		const radius = 5; // 球体を配置する半径
		const sphereRadius = 0.3; // 球体の大きさ
		const material = new THREE.MeshBasicMaterial({
			color: 0xff0000,
			visible: $DEBUG_MODE ? true : false
		});

		removeSpheres(); // 既存の球体を削除

		nextPointData.forEach((pointData) => {
			const angleRad = THREE.MathUtils.degToRad(pointData.bearing);
			const x = radius * Math.sin(angleRad);
			const z = -radius * Math.cos(angleRad);

			const geometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
			const sphere = new THREE.Mesh(geometry, material);
			sphere.name = pointData.featureData.properties.id;
			sphere.position.set(x, 0, z);
			scene.add(sphere);
			spheres.push(sphere); // 配列に追加
		});

		// lookAtSphere(spheres[0]);
	};

	// 球体を削除する関数
	const removeSpheres = () => {
		if (spheres.length > 0) {
			spheres.forEach((sphere) => {
				scene.remove(sphere);
				sphere.geometry.dispose(); // メモリ解放
			});
			spheres = []; // 配列を空にする
		}
	};
	const placeScene = (nextPointData: NextPointData[]): {} => {
		// 次のポイントデータが存在しない場合は何もしない
		if (!nextPointData || nextPointData.length === 0) return;

		// テクスチャ読み込みのPromiseを格納する配列
		const texturePromises = nextPointData.map((pointData) => {
			// TODO: IDの修正
			const id = pointData.featureData.properties['ID'];
			const angleData = angleDataJson.find((angle) => angle.id === id);

			const webp =
				IMAGE_URL_SHINGLE + pointData.featureData.properties['Name'].replace('.JPG', '.webp');

			return {
				id: id,
				angle: angleData,
				featureData: pointData.featureData,
				texture: webp
			};
		});

		return texturePromises;
	};

	// 画面リサイズ時にキャンバスもリサイズ
	const onResize = () => {
		// サイズを取得
		if (!renderer) return;
		const width = window.innerWidth;
		const height = window.innerHeight;

		// レンダラーのサイズを調整する
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
		const sizes = {
			width: canvas.clientWidth,
			height: canvas.clientHeight
		};

		// テクスチャローダーを初期化
		textureLoader = new THREE.TextureLoader();

		// シーンの作成
		scene = new THREE.Scene();

		// カメラ
		camera = new THREE.PerspectiveCamera(IN_CAMERA_FOV, sizes.width / sizes.height, 0.1, 1000);

		scene.add(camera);

		// フレームバッファ用のシーンとカメラを作成
		bufferScene = new THREE.Scene();

		// camera.position.set(0, 0, 0);
		camera.rotation.order = 'YXZ';

		// カメラの設定
		camera.aspect = sizes.width / sizes.height;
		camera.updateProjectionMatrix();

		// パソコン閲覧時マウスドラッグで視点操作する
		orbitControls = new OrbitControls(camera, canvas);
		orbitControls.target.set(camera.position.x, camera.position.y, camera.position.z + 0.01);

		// 視点操作のイージングの値
		orbitControls.dampingFactor = 0.1;

		// マウスドラッグの反転
		orbitControls.rotateSpeed *= -1;
		orbitControls.enableDamping = true;
		orbitControls.enablePan = false;
		orbitControls.enableZoom = false;
		orbitControls.maxZoom = 1;

		if ($DEBUG_MODE) {
			// // ヘルパー方向
			const axesHelper = new THREE.AxesHelper(1000);
			scene.add(axesHelper);

			const helper = new THREE.PolarGridHelper(10, 16, 10, 64);
			scene.add(helper);
		}

		// レンダラー

		renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			alpha: true
		});

		// 球体
		const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
		// 自動フェード用シェーダー
		const fadeShaderMaterial = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			uniforms: uniforms,
			fragmentShader: fs,
			vertexShader: vs
		});
		const sphere = new THREE.Mesh(geometry, fadeShaderMaterial);
		scene.add(sphere);

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
			fragmentShader: fragment,
			vertexShader: vertex,
			uniforms: buffarUniforms
		});

		// sprite.renderOrder = 1;
		postMesh = new THREE.Mesh(buffarGeometry, buffarMaterial);
		bufferScene.add(postMesh);

		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		canvas.addEventListener('resize', onResize);

		$effect(() => {
			if (fov) {
				camera.fov = fov.current; // tweened ストアの現在の値をカメラのFOVに設定
				camera.updateProjectionMatrix();
			}
		});

		// マウスホイールでFOVを変更するイベントリスナー
		canvas.addEventListener('wheel', (event) => {
			const minFov = 20; // 最小FOV
			const maxFov = 100; // 最大FOV
			const zoomSpeed = 0.51; // ズーム速度

			const newFOV = camera.fov + event.deltaY * 0.05 * zoomSpeed;

			// マウススクロールの方向に応じてFOVを増減

			fov.set(Math.max(minFov, Math.min(maxFov, newFOV)));
		});

		// アニメーション

		const animate = () => {
			requestAnimationFrame(animate);
			// if (!isRendering) return;

			orbitControls.update();
			uniforms.time.value = performance.now() * 0.001; // ミリ秒を秒に変換

			let degrees = THREE.MathUtils.radToDeg(camera.rotation.y);
			degrees = (degrees + 360) % 360; // 0〜360度の範囲に調整

			// controlDiv親要素のを取得
			if (!controlDiv) return;
			controlDiv.style.transform = `rotateZ(${degrees}deg)`;

			cameraBearing = (degrees + 180) % 360; // 0〜360度の範囲に調整

			// 度をラジアンに変換してシェーダーに渡す
			let rotationAngles = new THREE.Vector3(
				degreesToRadians(geometryBearing.x),
				degreesToRadians(geometryBearing.y),
				degreesToRadians(geometryBearing.z)
			);
			uniforms.rotationAngles.value = rotationAngles;

			renderer.setRenderTarget(renderTarget);
			renderer.render(scene, camera);

			renderer.setRenderTarget(null);
			renderer.render(bufferScene, camera);
		};
		animate();
	});

	isStreetView.subscribe(async (value) => {
		onResize();
	});
	const nextPoint = (point) => {
		setPoint(point);
	};

	// Promise を使った読み込み完了待ち
	const loadTextureAsync = (url: string): Promise<THREE.Texture> => {
		return new Promise((resolve, reject) => {
			textureLoader.load(
				url,
				(texture) => {
					texture.colorSpace = THREE.SRGBColorSpace;
					texture.minFilter = THREE.LinearFilter;
					texture.magFilter = THREE.LinearFilter;
					texture.generateMipmaps = false;
					texture.needsUpdate = true;

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

	// $effect(() => created360Mesh(streetViewPoint));
	$effect(() => {
		if (nextPointData) {
			// loadTextureWithFade

			const pointsData = placeScene(nextPointData || []);

			const { id, angle, featureData, texture } = pointsData[0];

			loadTextureWithFade(texture);
			uniforms.userDirection.value = angle.angleY;

			geometryBearing.x = angle.angleX;
			geometryBearing.y = angle.angleY;
			geometryBearing.z = angle.angleZ;

			// 最初の拡大アニメーション;
			// gsap.to(camera, {
			// 	duration: 0.5, // アニメーションの時間
			// 	fov: 55, // スケールを大きくしてトンネル効果を演出
			// 	ease: 'power2.inOut', // イージング
			// 	onUpdate: () => {
			// 		camera.updateProjectionMatrix(); // FOVの変更を適用
			// 	},
			// 	onComplete: () => {
			// 		// 縮小ステップを瞬間的に表示
			// 		gsap.set(camera, {
			// 			fov: 90 // 縮小状態
			// 		});
			// 		camera.updateProjectionMatrix(); // 瞬間的な変更を適用

			// 		// 縮小状態から元のサイズに戻すアニメーション
			// 		gsap.to(camera, {
			// 			duration: 1.0, // アニメーションの時間
			// 			fov: IN_CAMERA_FOV, // 元のサイズに戻す
			// 			ease: 'power2.inOut', // イージング
			// 			onUpdate: () => {
			// 				camera.updateProjectionMatrix(); // FOVの変更を適用
			// 			},
			// 			onComplete: () => {
			// 				// 次のシーンを配置
			// 			}
			// 		});
			// 	}
			// });

			// gsap.to(buffarUniforms.zoomBlurStrength, {
			// 	duration: 0.5, // アニメーションの時間
			// 	value: 0.1, // ズームブラーの強さを設定
			// 	ease: 'power2.inOut', // イージング
			// 	onUpdate: () => {
			// 		// ズームブラーの強さを更新
			// 		buffarUniforms.zoomBlurStrength.value = buffarUniforms.zoomBlurStrength.value;
			// 	},
			// 	onComplete: () => {
			// 		// ズームブラーの強さをリセット
			// 		gsap.to(buffarUniforms.zoomBlurStrength, {
			// 			duration: 1.0, // アニメーションの時間
			// 			value: 0.0, // ズームブラーの強さをリセット
			// 			ease: 'power2.inOut', // イージング
			// 			onUpdate: () => {
			// 				buffarUniforms.zoomBlurStrength.value = buffarUniforms.zoomBlurStrength.value;
			// 			}
			// 		});
			// 	}
			// });
		}
	});
</script>

<!-- <div class="css-canvas-back"></div> -->
<div
	class="absolute z-10 flex overflow-hidden duration-500 {showThreeCanvas
		? 'bottom-0 right-0 h-full w-full opacity-100'
		: 'pointer-events-none bottom-0 right-0 h-full w-full opacity-0'}"
>
	<canvas class="h-full w-full" bind:this={canvas}></canvas>
	{#if isLoading}
		<div class="css-loading">
			<div class="css-spinner"></div>
		</div>
	{:else}
		{#if showThreeCanvas}
			<div
				class="bg-main absolute left-4 top-[10px] z-10 flex items-center justify-center gap-2 rounded-lg p-2 text-white"
			>
				<button class="cursor-pointer rounded-md p-2" onclick={() => ($isStreetView = false)}
					><Icon icon="ep:back" class="h-4 w-4" />
				</button>
				<span>撮影日:{streetViewPoint.properties['Date']}<span> </span></span>
			</div>
		{/if}

		<!-- コントロール -->
		<div
			class="css-3d pointer-events-none absolute bottom-0 grid w-full place-items-center p-0 {showThreeCanvas
				? ' h-[400px]'
				: ' h-full'}"
		>
			<div class="css-control-warp">
				<div bind:this={controlDiv} class="css-control">
					{#if nextPointData}
						{#each nextPointData as point, index}
							{#if point.featureData.properties.id !== currentSceneId}
								<button
									onclick={() => {
										nextPoint(point.featureData);
									}}
									class="css-arrow"
									style="--angle: {point.bearing}deg; --distance: {showThreeCanvas
										? '175'
										: '64'}px;"
								>
									<Icon
										icon="ep:arrow-up-bold"
										width={showThreeCanvas ? 128 : 64}
										height={showThreeCanvas ? 128 : 64}
										class=""
										style="transform: rotate({point.bearing}deg);"
									/>
								</button>
							{/if}
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* NOTE: debug */
	:global(.lil-gui) {
		/* display: none !important; */
	}
	canvas {
		background-image: radial-gradient(#000000, #000000);
		padding: 0;
	}

	.css-3d {
		pointer-events: none;
		transform-style: preserve-3d;
		perspective: 1000px;
		/* background-color: #000000; */
	}

	.css-control-warp {
		transform: rotateX(60deg);
	}

	.css-control {
		transform-origin: center;
		height: 400px;
		width: 400px;
		pointer-events: none;
	}

	.css-arrow {
		pointer-events: auto;
		display: grid;
		place-items: center;
		transition: all 0.3s ease;
		pointer-events: all;
		position: absolute;
		top: 50%;
		left: 50%;
		--x: calc(cos(calc(var(--angle) - 90deg)) * var(--distance));
		--y: calc(sin(calc(var(--angle) - 90deg)) * var(--distance));
		translate: calc(var(--x) - 50%) calc(var(--y) - 50%);
		color: #fff;
		filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.5));
	}

	.css-arrow:hover {
		scale: 1.2;
		cursor: pointer;
	}

	.css-loading {
		z-index: 1;
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.css-spinner {
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
