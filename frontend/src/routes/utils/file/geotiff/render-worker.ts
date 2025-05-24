import vertexShaderSource from './shader/vertex.glsl?raw';
import fsMulchSource from './shader/fragment_mulch.glsl?raw';
import fsShingleSource from './shader/fragment_shingle.glsl?raw';

const combineFloatBandsToTexture2DArray = (
	bands: Float32Array[],
	width: number,
	height: number
): Float32Array => {
	const depth = bands.length;
	const layerSize = width * height;
	const output = new Float32Array(layerSize * depth);

	// ループを最小限にする（境界チェック不要なら forEachでもOK）
	for (let z = 0; z < depth; ++z) {
		const band = bands[z];
		if (band.length !== layerSize) {
			throw new Error(`Band ${z} has incorrect length: ${band.length}`);
		}
		output.set(band, z * layerSize);
	}

	return output;
};
const convertUint8BandsToFloat32 = (bands: Uint8Array[]): Float32Array[] => {
	return bands.map((band) => new Float32Array(band));
};

const convertBandsToFloat32Texture2DArray = (
	bands: (Uint8Array | Uint16Array | Float32Array)[],
	width: number,
	height: number
): Float32Array => {
	const depth = bands.length;
	const layerSize = width * height;
	const output = new Float32Array(layerSize * depth);

	for (let z = 0; z < depth; ++z) {
		const band = bands[z];
		if (band.length !== layerSize) {
			throw new Error(`Band ${z} has incorrect length: ${band.length}`);
		}

		for (let i = 0; i < layerSize; ++i) {
			output[z * layerSize + i] = band[i]; // 全ての TypedArray で動作
		}
	}

	return output;
};

const bindTextures = (
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	image: Uint8Array,
	unit: number
) => {
	// テクスチャをバインド
	const texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + unit); // 現在のテクスチャユニットをアクティブ
	gl.bindTexture(gl.TEXTURE_2D, texture);

	const location = gl.getUniformLocation(program, 'u_elevationMap');
	gl.uniform1i(location, unit);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 256, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, image as Uint8Array);

	// ラッピングとフィルタリングの設定
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
};

// シェーダーをコンパイルしてプログラムをリンク
const createShader = (
	gl: WebGLRenderingContext,
	type: number,
	source: string
): WebGLShader | null => {
	const shader = gl.createShader(type);
	if (!shader) return null;

	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
};

const createProgram = (
	gl: WebGLRenderingContext,
	vertexShader: WebGLShader,
	fragmentShader: WebGLShader
): WebGLProgram | null => {
	const program = gl.createProgram();
	if (!program) return null;

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Program linking failed:', gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}
	return program;
};
let gl: WebGL2RenderingContext | null = null;
const canvas = new OffscreenCanvas(256, 256);
let programs: { single: WebGLProgram; multi: WebGLProgram } | null = null;
const initWebGL = (canvas: OffscreenCanvas) => {
	gl = canvas.getContext('webgl2');
	if (!gl) {
		throw new Error('WebGL not supported');
	}

	const ext = gl.getExtension('EXT_color_buffer_float');
	if (!ext) {
		console.error('Float texture not supported');
	}
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShingleShader = createShader(gl, gl.FRAGMENT_SHADER, fsShingleSource);
	const fragmentMulchShader = createShader(gl, gl.FRAGMENT_SHADER, fsMulchSource);

	if (!vertexShader || !fragmentShingleShader || !fragmentMulchShader) {
		throw new Error('Failed to create shaders');
	}
	programs = {
		single: createProgram(gl, vertexShader, fragmentShingleShader) as WebGLProgram,
		multi: createProgram(gl, vertexShader, fragmentMulchShader) as WebGLProgram
	};
};

self.onmessage = async (e) => {
	const { rasters, size, type, min, max, width, height, colorArray } = e.data;

	try {
		// const canvas = new OffscreenCanvas(width, height);
		// const gl = canvas.getContext('webgl2');
		if (!gl) {
			initWebGL(canvas);
		}

		if (!gl) {
			throw new Error('WebGL initialization failed');
		}

		// サイズ変更したい場合
		canvas.width = width;
		canvas.height = height;
		gl.viewport(0, 0, canvas.width, canvas.height);

		const program = programs[type];

		gl.useProgram(program);
		gl.clearColor(0, 0, 0, 0);

		const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
			gl.STATIC_DRAW
		);

		gl.enableVertexAttribArray(positionAttributeLocation);
		gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

		const texture = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);

		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		// unit16array
		gl.texImage3D(
			gl.TEXTURE_2D_ARRAY,
			0,
			gl.R32F,
			width,
			height,
			size,
			0,
			gl.RED,
			gl.FLOAT,
			rasters
		);

		if (type === 'single') {
			const uBandIndexLoc = gl.getUniformLocation(program, 'u_bandIndex');
			gl.uniform1i(uBandIndexLoc, 0);

			const uMinLoc = gl.getUniformLocation(program, 'u_min');
			const uMaxLoc = gl.getUniformLocation(program, 'u_max');
			gl.uniform1f(uMinLoc, min);
			gl.uniform1f(uMaxLoc, max);
		}
		if (type === 'multi') {
			const uRedIndexLoc = gl.getUniformLocation(program, 'u_redIndex');
			const uGreenIndexLoc = gl.getUniformLocation(program, 'u_greenIndex');
			const uBlueIndexLoc = gl.getUniformLocation(program, 'u_blueIndex');
			gl.uniform1i(uRedIndexLoc, 0); // バンド4（index = 3）
			gl.uniform1i(uGreenIndexLoc, 1); // バンド3
			gl.uniform1i(uBlueIndexLoc, 2); // バンド2

			const uMinLoc = gl.getUniformLocation(program, 'u_min');
			const uMaxLoc = gl.getUniformLocation(program, 'u_max');
			gl.uniform1f(uMinLoc, min);
			gl.uniform1f(uMaxLoc, max);
		}

		bindTextures(gl, program, colorArray, 1);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		const blob = await canvas.convertToBlob({ type: 'image/png' });
		self.postMessage({ blob }); // worker から転送
	} catch (e) {
		console.error(e);
	}
};
