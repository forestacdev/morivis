<script lang="ts">
	import { fromArrayBuffer, rgb } from 'geotiff';
	import gsap from 'gsap';
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
	import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

	import fragmentShader from './shader/fragment.glsl?raw';
	import vertexShader from './shader/vertex.glsl?raw';

	import { goto } from '$app/navigation';
	import FacLogo from '$lib/components/svgs/FacLogo.svelte';

	// ラスターデータの読み込み
	const loadRasterData = async (url: string) => {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		const tiff = await fromArrayBuffer(arrayBuffer);
		const image = await tiff.getImage();

		// ラスターデータを取得
		const rasters = await image.readRasters();
		const data = rasters[0];

		// ラスターの高さと幅を取得
		const width = image.getWidth();
		const height = image.getHeight();

		return { data, width, height };
	};
	let canvas = $state<HTMLCanvasElement | null>(null);
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let orbitControls: OrbitControls;

	const material2uniforms = {
		uTime: { value: 0 },
		uTexture: { value: new THREE.TextureLoader().load('./microtopographic.webp') },
		uColor: { value: new THREE.Color('rgb(252, 252, 252)') },
		uColor2: { value: new THREE.Color('rgb(0, 194, 36)') }
	};

	const material2 = new THREE.ShaderMaterial({
		uniforms: material2uniforms,
		// 頂点シェーダー
		vertexShader,
		fragmentShader,
		transparent: true
	});

	const imageToElevationArray = async (
		url: string,
		scale: number = 0.1
	): Promise<{
		width: number;
		height: number;
		data: Float32Array; // ← 高さ(m)配列として返す
	}> => {
		const response = await fetch(url);
		const blob = await response.blob();
		const img = new Image();
		img.src = URL.createObjectURL(blob);
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
		});

		const canvas = document.createElement('canvas');
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get canvas context');

		ctx.drawImage(img, 0, 0);

		const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

		const pixelCount = (rgba.length / 4) | 0;
		const elevationArray = new Float32Array(pixelCount);

		for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
			const r = rgba[i];
			const g = rgba[i + 1];
			const b = rgba[i + 2];
			// Mapbox Terrain-RGB → 高さ(m)
			const h = (-10000 + (r * 256 * 256 + g * 256 + b) * 0.1) * scale;
			elevationArray[j] = h;
		}

		return {
			width: canvas.width,
			height: canvas.height,
			data: elevationArray
		};
	};

	const createdDemMesh = async () => {
		const { data, width, height } = await imageToElevationArray('./terrainrgb.png', 0.15);

		// return;

		// ピクセル解像度
		const dx = 1;
		const dy = 1;

		// Geometryの作成
		const geometry = new THREE.BufferGeometry();

		// ラスターの中心座標を原点にするためのオフセット
		const xOffset = (width * dx) / 2;
		const zOffset = (height * dy) / 2;

		// 頂点座標の計算
		const vertices = new Float32Array(width * height * 3);
		for (let i = 0; i < height; i++) {
			for (let j = 0; j < width; j++) {
				const index = i * width + j;
				const x = j * dx - xOffset;
				const y = data[index];
				const z = i * dy - zOffset;
				const k = index * 3;
				vertices[k] = x;
				vertices[k + 1] = y;
				vertices[k + 2] = z;
			}
		}
		geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

		// UV座標の計算とセット
		const uvs = new Float32Array(width * height * 2);
		for (let i = 0; i < height; i++) {
			for (let j = 0; j < width; j++) {
				const index = i * width + j;
				const u = j / (width - 1);
				const v = i / (height - 1);
				const k = index * 2;
				uvs[k] = u;
				uvs[k + 1] = v;
			}
		}
		geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

		const quadCount = (width - 1) * (height - 1);
		const indices = new Uint32Array(quadCount * 6);
		let p = 0;
		for (let i = 0; i < height - 1; i++) {
			for (let j = 0; j < width - 1; j++) {
				const a = i * width + j;
				const b = a + width;
				const c = a + 1;
				const d = b + 1;

				// 三角形1: a, b, c
				indices[p++] = a;
				indices[p++] = b;
				indices[p++] = c;

				// 三角形2: b, d, c
				indices[p++] = b;
				indices[p++] = d;
				indices[p++] = c;
			}
		}
		geometry.setIndex(new THREE.BufferAttribute(indices, 1));

		// メッシュの作成とシーンへの追加
		const mesh = new THREE.Mesh(geometry, material2);
		const obj = scene.getObjectByName('dem');
		if (obj) {
			scene.remove(obj);
		}
		mesh.name = 'dem';
		geometry.computeVertexNormals(); // 法線の計算

		const matrix = new THREE.Matrix4().makeRotationY(Math.PI / -2);
		geometry.applyMatrix4(matrix);

		scene.add(mesh);
	};

	let isMapView = false;

	const toggleView = (val: boolean) => {
		// goto('/map');
		orbitControls.autoRotate = val;

		isMapView = !isMapView;

		let rot = 180;
		const radian = (rot * Math.PI) / 180;
		const distance = 180;
		// 角度に応じてカメラの位置を設定
		camera.position.x = distance * Math.sin(radian);
		camera.position.z = distance * Math.cos(radian);

		// カメラの近距離と遠距離の設定
		// const closeView = { position: camera.position.clone(), lookAt: { x: 0, y: 0, z: 0 } };
		const closeView = { position: camera.position.clone(), lookAt: { x: 0, y: 0, z: 0 } };
		const farView = {
			position: { x: distance * Math.cos(radian), y: 600, z: 0 },
			lookAt: { x: 0, y: 0, z: 0 }
		};
		if (isMapView) {
			closeView.position = camera.position.clone();

			const target = orbitControls.target;
			closeView.lookAt = { x: target.x, y: target.y, z: target.z };
		} else {
			farView.position = camera.position.clone();
			const target = orbitControls.target;
			farView.lookAt = { x: target.x, y: target.y, z: target.z };
		}

		const targetView = isMapView ? farView : closeView;

		// カメラ位置のアニメーション
		const cameraPositionAnim = gsap.to(camera.position, {
			x: targetView.position.x,
			y: targetView.position.y,
			z: targetView.position.z,
			duration: 1.0,
			ease: 'power1',
			onUpdate: () => {
				camera.up.set(0, 1, 0); // カメラの「上方向」を y 軸に固定
				camera.lookAt(targetView.lookAt.x, targetView.lookAt.y, targetView.lookAt.z);
			}
		});

		// ターゲットのアニメーション
		const targetAnim = gsap.to(orbitControls.target, {
			x: targetView.lookAt.x,
			y: targetView.lookAt.y,
			z: targetView.lookAt.z,
			duration: 1.0,
			ease: 'power1',
			onUpdate: () => {
				camera.lookAt(orbitControls.target.x, orbitControls.target.y, orbitControls.target.z);
			}
		});

		// `camera.fov` のスムーズなアニメーション
		const fovAnim = gsap.to(camera, {
			fov: isMapView ? 45 : 75, // 目標視野角
			duration: 1.0,
			ease: 'power1',
			onUpdate: () => {
				camera.updateProjectionMatrix(); // 投影行列の更新が必須
			}
		});

		// すべてのアニメーションの完了を待つ
		gsap
			.timeline({
				onComplete: () => {
					if (isMapView) {
						// goto('/');
						window.location.href = '/';
					}
				}
			})
			.add(cameraPositionAnim)
			.add(targetAnim, '-=1.0')
			.add(fovAnim, '-=1.0');
	};

	onMount(() => {
		if (!canvas) return;
		// シーンの作成
		scene = new THREE.Scene();

		// カメラ
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);

		let rot = -40;
		const radian = (rot * Math.PI) / 180;
		const distance = 180;
		// 角度に応じてカメラの位置を設定
		camera.position.x = distance * Math.sin(radian);
		camera.position.z = distance * Math.cos(radian);
		camera.position.y = 100;

		// camera.position.set(100, 100, 100);
		scene.add(camera);

		// キャンバス
		const context = canvas.getContext('webgl2') as WebGL2RenderingContext;

		// コントロール
		orbitControls = new OrbitControls(camera, canvas);
		orbitControls.enableDamping = true;
		orbitControls.enablePan = false;
		orbitControls.enableZoom = false;
		orbitControls.autoRotateSpeed = 1.0;
		orbitControls.autoRotate = true;

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

		createdDemMesh();

		const clock = new THREE.Clock();

		// アニメーション
		const animate = () => {
			requestAnimationFrame(animate);

			orbitControls.update();
			zoomControls.update();

			material2uniforms.uTime.value = clock.getElapsedTime();

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

		return () => {
			// クリーンアップ
			orbitControls.dispose();
			zoomControls.dispose();
			// イベントリスナーの削除

			window.removeEventListener('resize', onResize);
			renderer.dispose();
		};
	});
</script>

<div class="app relative flex h-screen w-screen">
	<canvas class="h-screen w-full bg-gray-900" bind:this={canvas}></canvas>

	<div class="pointer-events-none absolute left-0 top-0 z-10 h-full w-full">
		<div class="flex h-full w-full flex-col items-center justify-center">
			<span class="text-[90px] font-bold text-white">morivis</span>
			<div class="[&_path]:fill-white">
				<FacLogo width={'300'} />
			</div>
			<button
				class="pointer-events-auto cursor-pointer text-[30px] font-bold text-white"
				onclick={() => toggleView(isMapView)}>Let's take a look at the map.</button
			>
			<!-- <a class="pointer-events-auto cursor-pointer" href="/map">
				<div class="flex h-full w-full items-center justify-center">
					<span class="text-[30px] font-bold text-white [text-shadow:_0px_0px_10px_#000]"
						>Let's take a look at the map.</span
					>
				</div>
			</a> -->
		</div>
	</div>
</div>
