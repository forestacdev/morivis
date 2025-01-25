<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
	let canvas = $state<HTMLCanvasElement | null>(null);
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;

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

		const demData = await imageToflatArray('./dem.png');

		console.log(demData);

		// return;

		// ピクセル解像度
		const dx = 1;
		const dy = 1;

		const newWidth = demData.width;
		const newHeight = demData.height;

		// 新しいDEMデータを作成し、全ての高さを0に初期化
		const newDemData = new Float32Array(newWidth * newHeight).fill(0);

		// DEMデータを計算してコピー
		demData.data.forEach((_, index) => {
			if (index % 3 !== 0) return; // RGBAのうちR成分に対してのみ処理を行う

			const pixelIndex = index / 3;
			const i = Math.floor(pixelIndex / newWidth);
			const j = pixelIndex % newWidth;

			// rgbの値を取得
			const r = demData.data[index];
			const g = demData.data[index + 1];
			const b = demData.data[index + 2];

			const scale = 0.2;

			// 高さを計算 rgb
			const h = (-10000 + (r * 256 * 256 + g * 256 + b) * 0.1) * scale;
			newDemData[pixelIndex] = h;
		});

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
		if (!canvas) return;
		// シーンの作成
		scene = new THREE.Scene();

		// カメラ
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);

		camera.position.set(100, 100, 100);
		scene.add(camera);

		// キャンバス
		const context = canvas.getContext('webgl2') as WebGL2RenderingContext;

		// コントロール
		const orbitControls = new OrbitControls(camera, canvas);
		orbitControls.enableDamping = true;
		orbitControls.enablePan = false;
		orbitControls.enableZoom = false;

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
		const gridHelper = new THREE.GridHelper(200, 100);
		scene.add(gridHelper);
		gridHelper.position.y = -5;

		const radius = 10;
		const sectors = 16;
		const rings = 80;
		const divisions = 64;

		const helper = new THREE.PolarGridHelper(radius, sectors, rings, divisions);
		scene.add(helper);

		// ヘルパー方向
		const axesHelper = new THREE.AxesHelper(100);
		scene.add(axesHelper);

		createdDemMesh();

		// アニメーション
		const animate = () => {
			requestAnimationFrame(animate);

			orbitControls.update();
			zoomControls.update();

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

	<div class="h-full w-full">
		<a href="/map">
			<div class="relative h-full rounded-lg">
				<div
					class="absolute left-1/2 top-1/2 z-10 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-lg bg-opacity-0 hover:bg-black hover:bg-opacity-20"
				>
					<div class="flex h-full w-full items-center justify-center">
						<span class="text-[30px] font-bold text-white [text-shadow:_0px_0px_10px_#000]"
							>Let's take a look at the map.</span
						>
					</div>
				</div>
			</div>
		</a>
	</div>
</div>
