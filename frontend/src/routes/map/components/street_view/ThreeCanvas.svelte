<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

	import photoAngleDataDictRaw from './photo_angles.json';
	import type { PhotoAngleDict } from './utils';

	import fs from './shaders/fragment.glsl?raw';
	// import fs from './shaders/fragment_debug.glsl?raw';
	import vs from './shaders/vertex.glsl?raw';
	import DebugControl from './DebugControl.svelte';

	import { degreesToRadians, TextureCache } from './utils';
	import type { CurrentPointData } from './utils';

	import { isStreetView, isDebugMode } from '$routes/stores';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { removeUrlParams, setStreetViewParams } from '$routes/map/utils/params';
	import type { StreetViewPoint, NextPointData } from '$routes/map/types/street-view';
	import type { buffarUniforms } from '$routes/utils';
	import { checkMobile, checkMobileWidth, checkPc } from '$routes/map/utils/ui';
	import { isMobile, showOtherMenu } from '$routes/stores/ui';

	const PANORAMA_IMAGE_URL = 'https://forestacdev.github.io/360photo-data-webp/webp/';
	const photoAngleDataDict = photoAngleDataDictRaw as PhotoAngleDict;

	const IN_CAMERA_FOV = checkPc() ? 75 : 100; // 初期FOV
	const OUT_CAMERA_FOV = 150;
	const MIN_CAMERA_FOV = 20; // 最小FOV
	const MAX_CAMERA_FOV = 100; // 最大FOV
	const IN_CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
	const OUT_CAMERA_POSITION = new THREE.Vector3(0, 10, 0);

	// テクスチャローダーを保持
	let textureLoader: THREE.TextureLoader;

	interface Props {
		streetViewPoint: StreetViewPoint | null;
		nextPointData: NextPointData[] | null;
		cameraBearing: number;
		showThreeCanvas: boolean;
		showAngleMarker: boolean; // 角度マーカーを表示するかどうか
	}

	let {
		streetViewPoint,
		nextPointData,
		cameraBearing = $bindable(),
		showThreeCanvas,
		showAngleMarker = $bindable()
	}: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let currentSceneId = $state<number>();
	let scene: THREE.Scene;
	let spheres: THREE.Mesh[] = []; // 球体を管理する配列
	let camera: THREE.PerspectiveCamera;
	let orbitControls: OrbitControls;
	let renderer: THREE.WebGLRenderer;
	let bufferScene: THREE.Scene;
	const fov = new Tween(IN_CAMERA_FOV, { duration: 300, easing: cubicOut });

	let postMesh: THREE.Mesh;
	let isLoading = $state<boolean>(false);
	let controlDiv = $state<HTMLDivElement | null>(null);
	let mobileFullscreen = $state<boolean>(true); // モバイルフルスクリーン用

	// Uniforms の型定義を修正
	interface Uniforms {
		skybox: { value: THREE.CubeTexture | null };
		gamma: { value: number }; // ガンマ補正用
		exposure: { value: number }; // 明度調整用
		inputGamma: { value: number }; // 入力ガンマ補正
		outputGamma: { value: number }; // 出力ガンマ補正
		brightness: { value: number }; // 明るさ調整用
		contrast: { value: number }; // コントラスト調整用
		rotationAnglesA: { value: THREE.Vector3 };
		rotationAnglesB: { value: THREE.Vector3 };
		rotationAnglesC: { value: THREE.Vector3 };
		textureA: { value: THREE.Texture | null };
		textureB: { value: THREE.Texture | null };
		textureC: { value: THREE.Texture | null };
		fadeStartTime: { value: number };
		fadeSpeed: { value: number };
		time: { value: number };
		fromTarget: { value: number }; // フェード元 0=A, 1=B, 2=C
		toTarget: { value: number }; // フェード先 0=A, 1=B, 2=C
	}

	const uniforms: Uniforms = {
		skybox: { value: null },
		exposure: { value: 0.6 }, // 明度調整用
		gamma: { value: 2.2 }, // ガンマ補正用
		inputGamma: { value: 2.2 },
		outputGamma: { value: 2.2 },
		brightness: { value: 1.5 },
		contrast: { value: 0.5 },
		rotationAnglesA: { value: new THREE.Vector3() },
		rotationAnglesB: { value: new THREE.Vector3() },
		rotationAnglesC: { value: new THREE.Vector3() },
		textureA: { value: null },
		textureB: { value: null },
		textureC: { value: null },
		fadeStartTime: { value: 0.0 },
		fadeSpeed: { value: 3.0 },
		time: { value: 0.0 },
		fromTarget: { value: 0 }, // フェード元
		toTarget: { value: 0 } // フェード先
	};

	const debugBoxMaterial = new THREE.MeshBasicMaterial({
		color: 0xffffff,
		wireframe: true,
		side: THREE.DoubleSide,
		opacity: 1.0,
		visible: false
	});

	let angleX = $state<number>(0);
	let angleY = $state<number>(0);
	let angleZ = $state<number>(0);
	let showWireframe = $state<boolean>(false); // デバッグ用ワイヤーフレーム表示

	$effect(() => {
		if (showWireframe) {
			debugBoxMaterial.visible = true;
		} else {
			debugBoxMaterial.visible = false;
		}
	});

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
	// 次のポイントを読み込む
	const placePointData = (nextPointData: NextPointData[]): CurrentPointData[] => {
		// 次のポイントデータが存在しない場合は何もしない
		if (!nextPointData || nextPointData.length === 0) {
			console.warn('次のポイントデータが存在しません。');
			return [];
		}

		// テクスチャ読み込みのPromiseを格納する配列
		const texturePromises = nextPointData.map((pointData) => {
			const id = pointData.featureData.properties.photo_id;
			const angleData = photoAngleDataDict[id];
			const webp = PANORAMA_IMAGE_URL + pointData.featureData.properties.photo_id + '.webp';

			return {
				id: id,
				angle: angleData as { angle_x: number; angle_y: number; angle_z: number },
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
	};

	// テクスチャローダーを初期化
	textureLoader = new THREE.TextureLoader();

	const textureCache = new TextureCache(textureLoader);

	onMount(async () => {
		if (!canvas) return;
		const sizes = {
			width: canvas.clientWidth,
			height: canvas.clientHeight
		};

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
		orbitControls.rotateSpeed *= checkPc() ? -0.3 : -0.6;
		orbitControls.enableDamping = true;
		orbitControls.enablePan = false;
		orbitControls.enableZoom = false;
		orbitControls.maxZoom = 1;

		// レンダラー

		renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			alpha: true
		});

		// 球体
		const skyBoxGeometry: THREE.BoxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
		// 自動フェード用シェーダー
		const fadeShaderMaterial = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			uniforms: uniforms as any, // 型の互換性のためにanyを使用
			fragmentShader: fs,
			vertexShader: vs,
			transparent: false, // 必要に応じてtrueに
			alphaTest: 0,
			premultipliedAlpha: false // これも重要
		});
		const sphere = new THREE.Mesh(skyBoxGeometry, fadeShaderMaterial);
		scene.add(sphere);

		const debugGeometry: THREE.BoxGeometry = new THREE.BoxGeometry(900, 900, 900, 2, 2, 2);
		const wireframeCube = new THREE.Mesh(debugGeometry, debugBoxMaterial);
		scene.add(wireframeCube);

		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		window.addEventListener('resize', onResize);

		$effect(() => {
			if (fov) {
				camera.fov = fov.current; // tweened ストアの現在の値をカメラのFOVに設定
				camera.updateProjectionMatrix();
			}
		});

		// マウスホイールでFOVを変更するイベントリスナー
		canvas.addEventListener('wheel', (event) => {
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
					Math.pow(touch2.clientX - touch1.clientX, 2) +
						Math.pow(touch2.clientY - touch1.clientY, 2)
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
		canvas.addEventListener('touchend', (event) => {
			lastTouchDistance = 0;
			orbitControls.enablePan = true;
		});

		// アニメーション

		const animate = () => {
			if (!isStreetView) return;
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

			// // 度をラジアンに変換してシェーダーに渡す
			let rotationAngles = new THREE.Vector3(
				degreesToRadians(angleX),
				degreesToRadians(angleY),
				degreesToRadians(angleZ)
			);

			if (currentTextureIndex === 0) {
				uniforms.rotationAnglesA.value = rotationAngles;
			} else if (currentTextureIndex === 1) {
				uniforms.rotationAnglesB.value = rotationAngles;
			} else if (currentTextureIndex === 2) {
				uniforms.rotationAnglesC.value = rotationAngles;
			}

			renderer.render(scene, camera);
		};
		animate();
	});

	isStreetView.subscribe(async (value) => {
		onResize();
	});

	let currentTextureIndex = $state<number>(0); // 0=A, 1=B, 2=C

	const loadTextureWithFade = async (pointsData: CurrentPointData) => {
		try {
			const { id, angle, featureData, texture } = pointsData;
			const newTexture = await textureCache.loadTexture(texture);

			// 次のテクスチャスロットを決定
			const nextIndex = (currentTextureIndex + 1) % 3;

			// フェード情報を設定（現在→次へ）
			uniforms.fromTarget.value = currentTextureIndex;
			uniforms.toTarget.value = nextIndex;

			// 新しいテクスチャと角度を次のスロットに設定
			if (nextIndex === 0) {
				uniforms.textureA.value = newTexture;
				uniforms.rotationAnglesA.value = new THREE.Vector3(
					degreesToRadians(angle.angle_x),
					degreesToRadians(angle.angle_y),
					degreesToRadians(angle.angle_z)
				);
			} else if (nextIndex === 1) {
				uniforms.textureB.value = newTexture;
				uniforms.rotationAnglesB.value = new THREE.Vector3(
					degreesToRadians(angle.angle_x),
					degreesToRadians(angle.angle_y),
					degreesToRadians(angle.angle_z)
				);
			} else {
				uniforms.textureC.value = newTexture;
				uniforms.rotationAnglesC.value = new THREE.Vector3(
					degreesToRadians(angle.angle_x),
					degreesToRadians(angle.angle_y),
					degreesToRadians(angle.angle_z)
				);
			}

			angleX = angle.angle_x;
			angleY = angle.angle_y;
			angleZ = angle.angle_z;

			// フェード開始時刻を設定
			uniforms.fadeStartTime.value = performance.now() * 0.001;

			// インデックスを更新
			currentTextureIndex = nextIndex;
		} catch (error) {
			console.error('フェード付きテクスチャの読み込みに失敗しました:', error);
		}
	};

	const loadTextures = async (pointsData: CurrentPointData[]) => {
		if (!pointsData || pointsData.length === 0) return;

		textureCache.preloadTextures(pointsData.map((point) => point.texture));
	};
	// $effect(() => created360Mesh(streetViewPoint));
	$effect(() => {
		if (nextPointData) {
			// loadTextureWithFade
			const pointsData = placePointData(nextPointData || []);
			const { id, angle, featureData, texture } = pointsData[0];
			currentSceneId = featureData.properties.node_id;

			// 初期角度を設定
			loadTextureWithFade(pointsData[0]);
			loadTextures(pointsData.slice(1));
		}
	});

	$effect(() => {
		if (currentSceneId && isStreetView) {
			setStreetViewParams(currentSceneId);
		}
	});

	// TODO: 画面リサイズ時にキャンバスもリサイズ
	const onCanvasResize = (value: boolean) => {
		if (!renderer || !canvas) return;

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
</script>

<div
	class="absolute z-10 flex overflow-hidden bg-black duration-500 {showThreeCanvas
		? 'right-0 top-0 w-full opacity-100 max-lg:h-1/2 lg:h-full'
		: 'pointer-events-none bottom-0 right-0 h-full w-full opacity-0'} {showThreeCanvas &&
	mobileFullscreen
		? 'max-lg:h-full'
		: ''}"
>
	<!-- 角度調整コントロール -->
	{#if $isDebugMode}
		<DebugControl bind:angleX bind:angleY bind:angleZ bind:showWireframe {streetViewPoint} />
	{/if}
	<canvas class="h-full w-full" bind:this={canvas}> </canvas>
	{#if isLoading}
		<div class="css-loading">
			<div class="css-spinner"></div>
		</div>
	{:else}
		{#if showThreeCanvas}
			<div
				class="lg:bg-main absolute left-4 z-10 flex items-center justify-center gap-2 rounded-lg p-2 text-white max-lg:bg-black/70 lg:px-4"
				style="top: calc(10px + env(safe-area-inset-top));"
			>
				<button
					class="lg:bg-base cursor-pointer rounded-full p-2 max-lg:text-white lg:text-black"
					onclick={() => ($isStreetView = false)}
					><Icon icon="ep:back" class="max-lg:h-5 max-lg:w-5 lg:h-6 lg:w-6" />
				</button>
				<div class="flex flex-col gap-2">
					<span class="text-lg max-lg:hidden"
						>{streetViewPoint ? streetViewPoint.properties['name'] : ''}</span
					>
					<span>撮影日:{streetViewPoint ? streetViewPoint.properties['Date'] : ''}</span>
				</div>
			</div>

			<button
				class="bg-main hover:text-accent absolute right-4 top-3 z-10 flex cursor-pointer items-center justify-center gap-2 rounded-lg p-2 text-white duration-100 max-lg:hidden"
				onclick={() => showOtherMenu.set(true)}
				><Icon icon="ic:round-menu" class="h-8 w-8" />
			</button>
		{/if}

		{#if $isMobile}
			<button
				class="absolute bottom-3 right-3 z-10 cursor-pointer rounded-full bg-black/70 p-2 text-white"
				onclick={() => {
					mobileFullscreen = !mobileFullscreen;
					onResize();
				}}
				><Icon
					icon={mobileFullscreen ? 'mingcute:fullscreen-exit-2-line' : 'mingcute:fullscreen-2-line'}
					class="h-7 w-7"
				/>
			</button>
		{/if}

		<!-- コントロール -->
		<div
			class="css-3d pointer-events-none absolute bottom-0 grid w-full place-items-center p-0 max-lg:h-[200px] lg:h-[400px]"
		>
			<div class="rotate-x-[60deg]">
				<div bind:this={controlDiv} class="pointer-events-none origin-center">
					{#if nextPointData}
						{#each nextPointData as point}
							<!-- 自身のnode_idを除外 -->
							{#if point.featureData.properties.node_id !== currentSceneId}
								<button
									onclick={() => {
										setStreetViewParams(point.featureData.properties.node_id);
									}}
									class="css-arrow"
									style="--angle: {point.bearing}deg; --distance: {!$isMobile ? '175' : '120'}px;"
								>
									<Icon
										icon="ep:arrow-up-bold"
										class="max-lg:h-[70px] max-lg:w-[70px] lg:h-[128px] lg:w-[128px]"
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
