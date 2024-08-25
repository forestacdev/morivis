<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
	import { imageToflatArray } from '$lib/utils/image';
	import Worker from './worker?worker';

	import { onMount } from 'svelte';

	export let targetDemData: string;
	let canvas: HTMLCanvasElement;
	let scene: THREE.Scene;

	const material2uniforms = {
		uTime: { value: 0 },
		uTexture: { value: new THREE.TextureLoader().load('./microtopographic.webp') },
		uColor: { value: new THREE.Color('rgb(252, 252, 252)') },
		uColor2: { value: new THREE.Color('rgb(255, 0, 0)') }
	};

	const material2 = new THREE.ShaderMaterial({
		uniforms: material2uniforms,
		// 頂点シェーダー
		vertexShader: /* glsl */ `
        varying vec2 vUv;// fragmentShaderに渡すためのvarying変数
        varying vec3 vPosition;
        uniform float uTime;
        varying vec3 vNormal;
        varying mat4 vModelMatrix;

        layout(location = 0) in vec3 aPos; // 頂点の位置

        void main() {
            vUv = uv;
            vPosition = position;
            vNormal = normal;
            vModelMatrix = modelMatrix;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
`,

		// フラグメントシェーダー
		fragmentShader: /* glsl */ `
            //uniform 変数としてテクスチャのデータを受け取る
            uniform sampler2D u_texture;
            // vertexShaderで処理されて渡されるテクスチャ座標
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUv;
            varying mat4 vModelMatrix;
            uniform vec3 uColor;
            uniform vec3 uColor2;
            uniform float uTime;
            void main()
                {
                float coefficient = 1.2;
                float power = 1.0;
                vec3 glowColor = uColor;

                vec3 worldPosition = (vModelMatrix * vec4(vPosition, 1.0)).xyz;
                vec3 cameraToVertex = normalize(worldPosition - cameraPosition);
                float intensity = pow(coefficient + dot(cameraToVertex, normalize(vNormal)), power);
                if(vPosition.y < 1.0){
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                } else {
                    gl_FragColor = vec4(glowColor, 1.0) * intensity;
                }

        // 等高線
        float contourInterval = 10.0; // 等高線の間隔
        float lineWidth = 1.0; // 等高線の線の幅
        float edgeWidth = 0.9; // 等高線の境界の幅（スムージング用）

        // 時間に基づいた変動を加えたY位置
        float yPos = vPosition.y - uTime; // 速度は調整可能

        // 等高線の位置を計算
        float contourValue = mod(yPos, contourInterval);
        // 等高線のアルファ値を計算
        float alpha = smoothstep(lineWidth - edgeWidth, lineWidth, contourValue) - smoothstep(lineWidth, lineWidth + edgeWidth, contourValue);

        // 等高線の色
        vec3 contourColor = uColor2; // 赤色

        // 地形の色
        vec3 terrainColor = uColor; // グレー色

        // 等高線か地形かによって色を決定
        vec3 color = mix(terrainColor, contourColor, alpha);

        vec3 color2 = mix(color, glowColor, 0.5);

        gl_FragColor = vec4(color2, 1.0)  * intensity;

            gl_FragColor = vec4(color, 1.0)  * intensity;

                    }
        `,
		transparent: true
	});

	const createdDemMesh = async (tileurl: string) => {
		if (!tileurl) return;
		// const tileurl = 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/14/14423/6458.png';
		const tileData = await imageToflatArray(tileurl);

		// ピクセル解像度
		const dx = 10;
		const dy = 10;

		// ラスターの高さと幅を取得
		const tiffWidth = 256;
		const tiffHeight = 256;

		// 新しい幅と高さ（余分に1ピクセル追加）
		const newWidth = tiffWidth + 2;
		const newHeight = tiffHeight + 2;

		// 新しいDEMデータを作成し、全ての高さを0に初期化
		const newDemData = new Float32Array(newWidth * newHeight).fill(0);

		// DEMデータを計算してコピー
		tileData.forEach((_, index) => {
			if (index % 4 !== 0) return; // RGBAのうちR成分に対してのみ処理を行う

			const pixelIndex = index / 4;
			const i = Math.floor(pixelIndex / tiffWidth);
			const j = pixelIndex % tiffWidth;

			// rgbの値を取得
			const r = tileData[index];
			const g = tileData[index + 1];
			const b = tileData[index + 2];

			// 高さを計算
			const rgb = r * 65536.0 + g * 256.0 + b;
			const h = rgb < 8388608.0 ? rgb * 0.01 : (rgb - 16777216.0) * 0.01;

			// newDemDataに余白を考慮して格納
			newDemData[(i + 1) * newWidth + (j + 1)] = h;
		});

		// ラスターの中心座標を取得
		const [ulx, uly] = [0, 0];
		const centerX = ulx + (tiffWidth / 2) * dx;
		const centerY = uly - (tiffHeight / 2) * dy;
		const center = [centerX, centerY];

		// Geometryの作成
		const geometry = new THREE.BufferGeometry();

		// ラスターの中心座標を原点にするためのオフセット
		const xOffset = (newWidth * dx) / 2;
		const zOffset = (newHeight * dy) / 2;

		// DEMの値の最小値を計算
		const minValue = newDemData.reduce((min, value) => Math.min(min, value), Infinity);

		console.log(minValue);

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

		// インデックスの計算
		const indices = Array.from({ length: (newHeight - 1) * (newWidth - 1) }, (_, idx) => {
			const i = Math.floor(idx / (newWidth - 1));
			const j = idx % (newWidth - 1);
			const a = i * newWidth + j;
			const b = a + newWidth;
			const c = a + 1;
			const d = b + 1;

			return [a, b, c, b, d, c];
		}).flat();

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
		scene.add(mesh);
	};

	onMount(async () => {
		const sizes = {
			width: canvas.clientWidth,
			height: canvas.clientHeight
		};

		// シーンの作成
		scene = new THREE.Scene();

		// カメラ
		const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100000);
		camera.position.set(-190, 280, -350);
		scene.add(camera);

		// カメラの設定
		camera.aspect = sizes.width / sizes.height;
		camera.updateProjectionMatrix();

		// コントロール
		const orbitControls = new OrbitControls(camera, canvas);
		orbitControls.enableDamping = true;
		orbitControls.enableZoom = false;
		// orbitControls.maxDistance = 1000;

		const zoomControls = new TrackballControls(camera, canvas);
		zoomControls.noPan = true;
		zoomControls.noRotate = true;
		zoomControls.noZoom = false;
		zoomControls.zoomSpeed = 0.5;

		// レンダラー
		const renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			alpha: true
		});
		renderer.setSize(sizes.width, sizes.height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// ヘルパー
		const axesHelper = new THREE.AxesHelper(1000);
		scene.add(axesHelper);

		// 画面リサイズ時にキャンバスもリサイズ
		const onResize = () => {
			// サイズを取得
			const width = canvas.clientWidth;
			const height = canvas.clientHeight;

			// レンダラーのサイズを調整する
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setSize(width, height);

			// カメラのアスペクト比を正す
			camera.aspect = sizes.width / sizes.height;
			camera.updateProjectionMatrix();
		};
		window.addEventListener('resize', onResize);

		// テクスチャ

		// アニメーション
		const animate = () => {
			requestAnimationFrame(animate);

			const target = orbitControls.target;
			orbitControls.update();
			zoomControls.target.set(target.x, target.y, target.z);
			zoomControls.update();
			renderer.render(scene, camera);
			if (material2uniforms) {
				material2uniforms.uTime.value += 0.3;
			}
		};
		animate();
	});

	$: createdDemMesh(targetDemData);
</script>

<!-- <div class="custom-canvas-back"></div> -->
<canvas class="" bind:this={canvas}></canvas>

<style>
	canvas {
		background-image: radial-gradient(#382c6e, #000000);

		border-radius: 10px 0 0 0;
		right: 0;
		bottom: 0;
		position: absolute;
		width: 600px;
		height: 600px;
	}
</style>
