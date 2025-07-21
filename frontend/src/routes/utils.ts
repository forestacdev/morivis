import * as THREE from 'three';
import fragmentShader from './shaders/fragment.glsl?raw';
import vertexShader from './shaders/vertex.glsl?raw';

const nextPowerOfTwo = (value: number) => {
	return Math.pow(2, Math.ceil(Math.log2(value)));
};
// 文字テクスチャを生成
export const generateTexture = (
	text = 'morivis',
	fontSize = 1280,
	color = '#ffffff',
	fontFamily = 'Arial, sans-serif'
) => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		throw new Error('Failed to get canvas context');
	}
	// フォント設定
	ctx.font = `${fontSize}px ${fontFamily}`;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';

	// テキストサイズを測定
	const metrics = ctx.measureText(text);
	const width = Math.ceil(metrics.width) + 20; // パディング
	const height = fontSize + 20; // パディング

	// 2の累乗に調整（GPU最適化）
	const textureWidth = nextPowerOfTwo(width);
	const textureHeight = nextPowerOfTwo(height);

	// キャンバスサイズ設定
	canvas.width = textureWidth;
	canvas.height = textureHeight;

	// 背景をクリア（透明）
	ctx.clearRect(0, 0, textureWidth, textureHeight);

	// 背景を塗りつぶす（オプション）
	// ctx.fillStyle = 'rgba(1.0, 0, 0, 1.0)'; // 透明

	// フォント再設定（キャンバスサイズ変更でリセットされる）
	ctx.font = `${fontSize}px ${fontFamily}`;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillStyle = color;

	// アンチエイリアシング設定
	// ctx.textRenderingOptimization = 'optimizeQuality';

	// テキスト描画
	ctx.fillText(text, 10, 10);

	const image = ctx.getImageData(0, 0, canvas.width, canvas.height);

	// デバックでダウンロード
	// const dataUrl = canvas.toDataURL('image/png');
	// const link = document.createElement('a');
	// link.href = dataUrl;
	// link.download = 'text_texture.png';
	// document.body.appendChild(link);
	// link.click();
	// document.body.removeChild(link);

	return canvas;
};

export const uniforms = {
	time: { value: 0 },
	uColor: { value: new THREE.Color('rgb(252, 252, 252)') },
	uColor2: { value: new THREE.Color('rgb(0, 194, 36)') },

	resolution: {
		value: new THREE.Vector2(window.innerWidth, window.innerHeight)
	}
};

interface BuffarUniforms {
	screenCenter: { value: THREE.Vector2 };
	resolution: { value: THREE.Vector2 };
	screenTexture: { value: THREE.Texture | null };
	uTexture: { value: THREE.Texture };
	uTextureResolution: { value: THREE.Vector2 };
}

export const buffarUniforms: BuffarUniforms = {
	screenCenter: { value: new THREE.Vector2(0.5, 0.5) },
	resolution: {
		value: new THREE.Vector2(window.innerWidth, window.innerHeight)
	},
	screenTexture: { value: null },
	uTexture: {
		value: new THREE.CanvasTexture(generateTexture())
		// value: new THREE.TextureLoader().load(
		// 	'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmLRqJERpCe_a9JDwjDxjeWNu5IfQH32XOfg&s',
		// 	(texture) => {
		// 		// texture.minFilter = THREE.LinearFilter; // ミップマップを使用しない
		// 		// texture.magFilter = THREE.LinearFilter; // ミップマップを使用しない
		// 		texture.needsUpdate = true; // テクスチャの更新を通知
		// 	}
		// )
	},
	uTextureResolution: { value: new THREE.Vector2(1000, 750) }
};

const material = new THREE.ShaderMaterial({
	uniforms: uniforms,
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

export const createdDemMesh = async (): Promise<THREE.Mesh> => {
	const { data, width, height } = await imageToElevationArray('./terrainrgb.png', 0.15);

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
	const mesh = new THREE.Mesh(geometry, material);

	mesh.name = 'dem';
	geometry.computeVertexNormals(); // 法線の計算

	const matrix = new THREE.Matrix4().makeRotationY(Math.PI / -2);
	geometry.applyMatrix4(matrix);

	return mesh;
};
