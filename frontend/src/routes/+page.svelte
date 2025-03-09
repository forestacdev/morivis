<script lang="ts">
	import { fromArrayBuffer } from 'geotiff';
	import gsap from 'gsap';
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

	import fragmentShader from './shader/fragment.glsl?raw';
	import vertexShader from './shader/vertex.glsl?raw';

	import { goto } from '$app/navigation';

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
		// wireframe: true
	});

	const imageToflatArray = async (
		url: string
	): Promise<{
		width: number;
		height: number;
		data: number[];
	}> => {
		// 画像をフェッチしてBlobを取得
		const response = await fetch(url);
		const blob = await response.blob();

		// BlobをImageオブジェクトに変換
		const img = new Image();
		img.src = URL.createObjectURL(blob);

		// 画像のロード完了を待つ
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
		});

		// Canvasに画像を描画
		const canvas = document.createElement('canvas');
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Failed to get canvas context');
		}

		ctx.drawImage(img, 0, 0);

		// ピクセルデータを取得
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const { data } = imageData;

		// RGB値を1次元配列に変換 (RGBA -> RGB)
		const rgbArray: number[] = [];
		for (let i = 0; i < data.length; i += 4) {
			const r = data[i]; // Red
			const g = data[i + 1]; // Green
			const b = data[i + 2]; // Blue
			rgbArray.push(r, g, b); // RGBのみを追加
		}

		return {
			width: canvas.width,
			height: canvas.height,
			data: rgbArray
		};
	};

	const createdDemMesh = async () => {
		// if (!imageurl) return;

		const demData = await loadRasterData('./ensyurin_dem.tiff');

		// return;

		// ピクセル解像度
		const dx = 1;
		const dy = 1;

		const newWidth = demData.width;
		const newHeight = demData.height;

		const newDemData = new Float32Array(demData.data.map((value) => value * 0.15));

		// // DEMデータを計算してコピー
		// demData.data.forEach((_, index) => {
		// 	if (index % 3 !== 0) return; // RGBAのうちR成分に対してのみ処理を行う

		// 	const pixelIndex = index / 3;
		// 	const i = Math.floor(pixelIndex / newWidth);
		// 	const j = pixelIndex % newWidth;

		// 	// rgbの値を取得
		// 	const r = demData.data[index];
		// 	const g = demData.data[index + 1];
		// 	const b = demData.data[index + 2];

		// 	const scale = 0.2;

		// 	// 高さを計算 rgb
		// 	const h = (-10000 + (r * 256 * 256 + g * 256 + b) * 0.1) * scale;
		// 	newDemData[pixelIndex] = h;
		// });

		// Geometryの作成
		const geometry = new THREE.BufferGeometry();

		// ラスターの中心座標を原点にするためのオフセット
		const xOffset = (newWidth * dx) / 2;
		const zOffset = (newHeight * dy) / 2;

		// DEMの値の最小値を計算
		const minValue = newDemData.reduce((min, value) => Math.min(min, value), Infinity);

		// 頂点座標の計算
		const vertices = Array.from({ length: newWidth * newHeight }, (_, index) => {
			const i = Math.floor(index / newWidth);
			const j = index % newWidth;
			// X座標とZ座標にオフセットを追加
			return [j * dx - xOffset, newDemData[index], i * dy - zOffset];
		}).flat();

		// 頂点座標をgeometryにセット
		const verticesFloat32Array = new Float32Array(vertices);
		geometry.setAttribute('position', new THREE.BufferAttribute(verticesFloat32Array, 3));

		// UV座標の計算とセット
		const uvs = Array.from({ length: newWidth * newHeight }, (_, index) => {
			const i = Math.floor(index / newWidth);
			const j = index % newWidth;
			const u = j / (newWidth - 1); // 横方向の正規化
			const v = i / (newHeight - 1); // 縦方向の正規化
			return [u, v];
		}).flat();

		const indices = Array.from({ length: (newHeight - 1) * (newWidth - 1) }, (_, idx) => {
			const i = Math.floor(idx / (newWidth - 1));
			const j = idx % (newWidth - 1);
			const a = i * newWidth + j;
			const b = a + newWidth;
			const c = a + 1;
			const d = b + 1;

			return [a, b, c, b, d, c];
		}).flat();

		// UV座標の計算とセット
		// UV座標とインデックスの計算
		// const indices = [];
		// const uvs = [];

		// for (let i = 0; i < newHeight - 1; i++) {
		// 	for (let j = 0; j < newWidth - 1; j++) {
		// 		// 現在のセルの頂点インデックス
		// 		const a = i * newWidth + j; // 左上
		// 		const b = (i + 1) * newWidth + j; // 左下
		// 		const c = i * newWidth + (j + 1); // 右上
		// 		const d = (i + 1) * newWidth + (j + 1); // 右下

		// 		// インデックスを追加（2つの三角形で1セルを構成）
		// 		indices.push(a, b, c, b, d, c);

		// 		// UV座標を追加（各四角形ごとに0〜1の範囲でUVを設定）
		// 		uvs.push(
		// 			0,
		// 			1, // 左上
		// 			0,
		// 			0, // 左下
		// 			1,
		// 			1, // 右上
		// 			1,
		// 			0 // 右下
		// 		);
		// 	}
		// }

		const uvsFloat32Array = new Float32Array(uvs);
		geometry.setAttribute('uv', new THREE.BufferAttribute(uvsFloat32Array, 2)); // UV属性を追加

		// インデックスの計算

		// インデックスをgeometryにセット
		geometry.setIndex(indices);

		// メッシュの作成とシーンへの追加
		const material = new THREE.MeshStandardMaterial({ color: 0x5566aa });
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
						window.location.href = '/map';
					}
				}
			})
			.add(cameraPositionAnim)
			.add(targetAnim, '-=1.0')
			.add(fovAnim, '-=1.0');
	};

	onMount(async () => {
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
	});
</script>

<div class="app relative flex h-screen w-screen">
	<canvas class="h-screen w-full bg-black" bind:this={canvas}></canvas>

	<div class="pointer-events-none absolute left-0 top-0 z-10 h-full w-full">
		<div class="flex h-full w-full flex-col items-center justify-center">
			<span class="text-[30px] font-bold text-white [text-shadow:_0px_0px_10px_#000]"
				>ENSHURIN MAP VIEW</span
			>
			<button
				class="pointer-events-auto text-[30px] font-bold text-white"
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
