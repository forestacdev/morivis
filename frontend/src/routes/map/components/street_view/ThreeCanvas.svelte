<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import {
		PANORAMA_IMAGE_URL,
		IN_CAMERA_FOV,
		OUT_CAMERA_FOV,
		MIN_CAMERA_FOV,
		MAX_CAMERA_FOV,
		IN_CAMERA_POSITION,
		OUT_CAMERA_POSITION,
		SCENE_CENTER_COORDS
	} from './constants';

	import DebugControl from './DebugControl.svelte';
	import InteractionManager from './InteractionManager.svelte';

	import { degreesToRadians, TextureCache, getCameraXYRotation, placePointData } from './utils';
	import { uniforms } from './utils/material';
	import type { CurrentPointData, PhotoAngleDict } from '$routes/map/types/street-view';

	import { isStreetView, isDebugMode } from '$routes/stores';

	import { setStreetViewParams } from '$routes/map/utils/params';
	import type { StreetViewPoint, NextPointData } from '$routes/map/types/street-view';
	import { isMobile, showOtherMenu } from '$routes/stores/ui';
	import { fade } from 'svelte/transition';
	import { getStreetViewCameraParams } from '$routes/map/utils/params';
	import { fadeShaderMaterial, debugBoxMaterial } from './utils/material';
	import { FGB2DLineLoader } from './utils/lineGeometryLoader';
	import { STREET_VIEW_DATA_PATH } from '$routes/constants';
	import { mapPotisonToWorldPotison } from './utils/proj';

	interface Props {
		streetViewPoint: StreetViewPoint | null;
		nextPointData: NextPointData[] | null;
		cameraBearing: number;
		showThreeCanvas: boolean;
		showAngleMarker: boolean; // 角度マーカーを表示するかどうか
		isExternalCameraUpdate: boolean; // 外部からのカメラ更新かどうか
	}

	let {
		streetViewPoint,
		nextPointData,
		cameraBearing = $bindable(),
		showThreeCanvas,
		showAngleMarker = $bindable(),
		isExternalCameraUpdate = $bindable()
	}: Props = $props();

	let canvas = $state<HTMLCanvasElement>();
	let camera = $state<THREE.PerspectiveCamera>();
	let renderer = $state<THREE.WebGLRenderer>();
	let currentSceneId = $state<number>();
	let scene = $state<THREE.Scene>();

	let orbitControls = $state<OrbitControls>();

	// テクスチャローダーを保持
	let textureLoader: THREE.TextureLoader;

	let postMesh: THREE.Mesh;
	let isLoading = $state<boolean>(false);
	let isLoadedNodeIdList = [] as number[]; // パノラマが画像の読み込みが完了したノードIDのリスト

	let controlDiv = $state<HTMLDivElement | null>(null);
	let mobileFullscreen = $state<boolean>(true); // モバイルフルスクリーン用

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

	let spheres: THREE.Mesh[] = []; // 球体を管理する配列

	// 球体を削除する関数
	const removeSpheres = () => {
		if (spheres.length > 0) {
			spheres.forEach((sphere) => {
				if (!scene) return;
				scene.remove(sphere);
				sphere.geometry.dispose(); // メモリ解放
			});
			spheres = []; // 配列を空にする
		}
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
		camera = new THREE.PerspectiveCamera(IN_CAMERA_FOV, sizes.width / sizes.height, 0.1, 10000);

		scene.add(camera);

		camera.rotation.order = 'YXZ';

		// カメラの設定
		camera.aspect = sizes.width / sizes.height;
		camera.updateProjectionMatrix();

		// パソコン閲覧時マウスドラッグで視点操作する
		orbitControls = new OrbitControls(camera, canvas);
		orbitControls.target.set(camera.position.x, camera.position.y, camera.position.z + 0.01);

		const cameraParams = getStreetViewCameraParams();

		if (cameraParams && cameraParams.x !== undefined && cameraParams.y !== undefined) {
			const targetDegreesY = (-cameraParams.y - 180 + 360) % 360;
			const targetRadiansY = THREE.MathUtils.degToRad(targetDegreesY);

			// X軸回転（垂直）
			const targetDegreesX = (-cameraParams.x + 360) % 360;
			const targetRadiansX = THREE.MathUtils.degToRad(targetDegreesX);

			// ターゲット位置も更新
			const distance = 0.01;
			orbitControls.target.set(
				camera.position.x + Math.sin(targetRadiansY) * distance,
				camera.position.y + Math.tan(targetRadiansX) * distance,
				camera.position.z + Math.cos(targetRadiansY) * distance
			);

			orbitControls.update();
			isExternalCameraUpdate = false;
		} else {
			// デフォルトの向き
			orbitControls.target.set(
				camera.position.x,
				camera.position.y,
				camera.position.z - 0.01 // ← +0.01 から -0.01 に変更
			);
		}

		// レンダラー
		renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			alpha: true
		});

		// 球体
		const skyBoxGeometry: THREE.BoxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);

		const sphere = new THREE.Mesh(skyBoxGeometry, fadeShaderMaterial);
		sphere.name = 'panoramaSphere';
		scene.add(sphere);

		const debugGeometry: THREE.BoxGeometry = new THREE.BoxGeometry(900, 900, 900, 2, 2, 2);
		const wireframeCube = new THREE.Mesh(debugGeometry, debugBoxMaterial);
		scene.add(wireframeCube);

		const lineLoader = new FGB2DLineLoader(SCENE_CENTER_COORDS);
		const lineGeometry = await lineLoader.load(`${STREET_VIEW_DATA_PATH}/links.fgb`, {
			color: new THREE.Color(0x00ff00),
			speed: 1.0,
			height: -10.1,
			proj: 'EPSG:6675'
		});

		const lineMaterial = new THREE.LineBasicMaterial({
			color: 0x00ff00
		});
		const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
		lineMesh.material.depthWrite = false; // 深度バッファに書き込まない
		lineMesh.renderOrder = 1;
		lineMesh.name = 'lineMesh';

		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// アニメーション
		const animate = () => {
			if (!isStreetView || !orbitControls || !camera || !renderer || !scene) return;
			requestAnimationFrame(animate);
			// if (!isRendering) return;

			orbitControls.update();
			uniforms.time.value = performance.now() * 0.001; // ミリ秒を秒に変換

			let degrees = THREE.MathUtils.radToDeg(camera.rotation.y);
			degrees = (degrees + 360) % 360; // 0〜360度の範囲に調整

			// controlDiv親要素のを取得
			if (!controlDiv) return;
			controlDiv.style.transform = `rotateZ(${degrees}deg)`;

			// 外部更新中でない場合のみcameraBearingを更新;
			if (!isExternalCameraUpdate) {
				cameraBearing = (degrees + 180) % 360; // 0〜360度の範囲に調整
			}

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

	// 外部からのcameraBearing変更を監視してカメラに反映
	$effect(() => {
		if (cameraBearing !== undefined && camera && isExternalCameraUpdate && orbitControls) {
			const targetDegrees = (cameraBearing - 180 + 360) % 360;
			const targetRadians = THREE.MathUtils.degToRad(targetDegrees);

			camera.rotation.y = targetRadians;

			// ターゲット位置も更新
			const distance = 0.01;
			orbitControls.target.set(
				camera.position.x + Math.sin(targetRadians) * distance,
				camera.position.y,
				camera.position.z + Math.cos(targetRadians) * distance
			);

			orbitControls.update();

			isExternalCameraUpdate = false;
		}
	});

	let currentTextureIndex = $state<number>(0); // 0=A, 1=B, 2=C

	const loadTextureWithFade = async (pointsData: CurrentPointData) => {
		try {
			const { angle, featureData, texture, photo_id, node_id } = pointsData;
			const newTexture = await textureCache.loadTexture(texture);

			const { x, z } = mapPotisonToWorldPotison(
				featureData.geometry.coordinates[0],
				featureData.geometry.coordinates[1]
			);

			console.log(`ワールド座標: x=${x}, z=${z}`); // ログ追加

			// lineMeshの位置を更新
			if (!scene) return;
			const lineMesh = scene.getObjectByName('lineMesh');
			if (lineMesh) {
				lineMesh.position.set(-x * 30, 0 * 30, -z * 30);
			}

			// 次のテクスチャスロットを決定
			const nextIndex = (currentTextureIndex + 1) % 3;

			// フェード情報を設定（現在→次へ）
			uniforms.fromTarget.value = currentTextureIndex;
			uniforms.toTarget.value = nextIndex;

			// テクスチャの回転角度を設定（カメラの向きには影響させない）
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

		textureCache.preloadTextures(pointsData.map((point) => point.texture)).then(() => {
			pointsData.forEach(async (pointData, index) => {
				// 読み込み完了リストに追加
				isLoadedNodeIdList = [...isLoadedNodeIdList, pointData.node_id];
			});
		});
	};
	// $effect(() => created360Mesh(streetViewPoint));
	$effect(() => {
		if (nextPointData) {
			if (!isLoadedNodeIdList.includes(nextPointData[0].featureData.properties.node_id)) {
				isLoading = true;
			}
			const pointsData = placePointData(nextPointData || []);
			const { node_id, angle, featureData, texture } = pointsData[0];
			currentSceneId = featureData.properties.node_id;

			// 1番目の読み込み完了を待ってから2番目以降を読み込む
			loadTextureWithFade(pointsData[0]).then(() => {
				isLoadedNodeIdList = [...isLoadedNodeIdList, node_id];
				isLoading = false;
				loadTextures(pointsData.slice(1));
			});
		}
	});

	$effect(() => {
		if (currentSceneId && isStreetView) {
			setStreetViewParams(currentSceneId);
		}
	});

	// 画面リサイズ時の処理
	const onResize = () => {
		// サイズを取得
		if (!renderer || !camera) return;
		const width = window.innerWidth;
		const height = window.innerHeight;

		// レンダラーのサイズを調整する
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(width, height);

		// カメラのアスペクト比を正す
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};
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
		<div class="css-loading" transition:fade={{ duration: 150 }}>
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

{#if canvas && camera && orbitControls && renderer && scene}
	<InteractionManager
		{scene}
		{canvas}
		{camera}
		{orbitControls}
		{renderer}
		{mobileFullscreen}
		{onResize}
	/>
{/if}

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
		background-color: rgba(0, 0, 0, 0.5);
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
