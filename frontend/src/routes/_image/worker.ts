import vertexShaderSource from './shader/vertex.glsl?raw';
import fsMulchSource from './shader/fragment_mulch.glsl?raw';
import fsShingleSource from './shader/fragment_shingle.glsl?raw';

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

/**
 * R/G/B の各バンドの Uint8Array を 2D テクスチャ配列（TEXTURE_2D_ARRAY）用の RGBA フォーマットに変換
 * @param bands - 各バンドのデータ（例： [rasterR, rasterG, rasterB]）
 * @param width - ラスター幅
 * @param height - ラスター高さ
 * @returns RGBA 格納の Uint8Array（深さ = bands.length）
 */
const combineBandsToTexture2DArrayData = (
	bands: Uint8Array[],
	width: number,
	height: number
): Uint8Array => {
	const depth = bands.length;
	const sizePerLayer = width * height * 4; // RGBA
	const output = new Uint8Array(sizePerLayer * depth);

	for (let z = 0; z < depth; z++) {
		const band = bands[z];
		const offsetZ = z * sizePerLayer;

		for (let i = 0; i < width * height; i++) {
			const val = band[i];
			const offset = offsetZ + i * 4;

			// グレースケールとして R/G/B に同じ値、Aは常に255
			output[offset + 0] = val;
			output[offset + 1] = val;
			output[offset + 2] = val;
			output[offset + 3] = 255;
		}
	}

	return output;
};

const encodeToTerrainRGB = (elevation: number): [number, number, number] => {
	const val = Math.round((elevation + 10000) * 10);
	const r = (val >> 16) & 0xff;
	const g = (val >> 8) & 0xff;
	const b = val & 0xff;
	return [r, g, b];
};

const combineBandsToTexture2DArrayDemData = (
	bands: Float32Array[], // DEMが1バンド
	width: number,
	height: number
): Uint8Array => {
	const size = width * height * 4; // RGBA
	const output = new Uint8Array(size);
	const band = bands[0]; // DEMは1バンドのみを想定

	for (let i = 0; i < width * height; i++) {
		const elevation = band[i];
		const [r, g, b] = encodeToTerrainRGB(elevation);
		const offset = i * 4;

		output[offset + 0] = r;
		output[offset + 1] = g;
		output[offset + 2] = b;
		output[offset + 3] = 255; // A
	}

	return output;
};

self.onmessage = async (e) => {
	const { rasters, type } = e.data;

	// ラスターの高さと幅を取得
	const width = rasters.width;
	const height = rasters.height;

	try {
		const canvas = new OffscreenCanvas(width, height);
		const gl = canvas.getContext('webgl2');
		if (!gl) {
			console.error('WebGL not supported');
			return new ImageBitmap();
		}

		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		let fragmentShader;

		if (type === 'single') {
			fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsShingleSource);
		} else if (type === 'multi') {
			fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsMulchSource);
		}
		if (!vertexShader || !fragmentShader) return new ImageBitmap();

		const program = createProgram(gl, vertexShader, fragmentShader);
		if (!program) return new ImageBitmap();

		gl.useProgram(program);

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

		let textureArrayData;
		if (type === 'single') {
			textureArrayData = combineBandsToTexture2DArrayDemData(
				rasters as Float32Array[],
				width,
				height
			);
			const uBandIndexLoc = gl.getUniformLocation(program, 'u_bandIndex');
			gl.uniform1i(uBandIndexLoc, 0);
		}
		if (type === 'multi') {
			textureArrayData = combineBandsToTexture2DArrayData(rasters as Uint8Array[], width, height);
			const uRedIndexLoc = gl.getUniformLocation(program, 'u_redIndex');
			const uGreenIndexLoc = gl.getUniformLocation(program, 'u_greenIndex');
			const uBlueIndexLoc = gl.getUniformLocation(program, 'u_blueIndex');
			gl.uniform1i(uRedIndexLoc, 0); // バンド4（index = 3）
			gl.uniform1i(uGreenIndexLoc, 1); // バンド3
			gl.uniform1i(uBlueIndexLoc, 2); // バンド2
		}

		const texture = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);

		gl.texImage3D(
			gl.TEXTURE_2D_ARRAY,
			0,
			gl.RGBA,
			width,
			height,
			3, // depth = number of bands
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			textureArrayData
		);

		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.generateMipmap(gl.TEXTURE_2D_ARRAY); // これがないと表示されない

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		// ✅ OffscreenCanvas から Blob を作成
		const blob = await canvas.convertToBlob({ type: 'image/png' });

		// ✅ Blob → DataURL に変換（main thread に送るため）
		const reader = new FileReader();
		reader.onloadend = () => {
			const dataUrl = reader.result as string;
			self.postMessage({ dataUrl });
		};
		reader.readAsDataURL(blob);

		// self.postMessage({ imageBitmap: canvas.transferToImageBitmap() });
	} catch (e) {
		console.error(e);
	}
};
