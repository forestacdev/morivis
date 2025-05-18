import vertexShaderSource from './shader/vertex.glsl?raw';
import fragmentShaderSource from './shader/fragment.glsl?raw';

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

// function createGrayTexture(
// 	gl: WebGL2RenderingContext,
// 	data: Uint8Array,
// 	width: number,
// 	height: number
// ): WebGLTexture {
// 	const texture = gl.createTexture();
// 	gl.bindTexture(gl.TEXTURE_2D, texture);

// 	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
// 	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
// 	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
// 	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

// 	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
// 	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RED, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, data);

// 	return texture!;
// }

const createGrayTexture = (
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	width: number,
	height: number,
	data: Uint8Array,
	unit: number,
	name: string
) => {
	const tex = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RED, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, data);
	gl.uniform1i(gl.getUniformLocation(program, name), unit);
};

const createGrayTextureBitmap = (
	gl: WebGL2RenderingContext,
	program: WebGLProgram,

	bitmap: ImageBitmap,
	unit: number,
	name: string
) => {
	const texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	// gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.uniform1i(gl.getUniformLocation(program, name), unit);
	gl.generateMipmap(gl.TEXTURE_2D);
};

self.onmessage = async (e) => {
	const { bitmapR, bitmapG, bitmapB, width, height, rasterR, rasterG, rasterB } = e.data;
	try {
		const canvas = new OffscreenCanvas(width, height);
		const gl = canvas.getContext('webgl2');
		if (!gl) {
			console.error('WebGL not supported');
			return new ImageBitmap();
		}

		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
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

		// createGrayTexture(gl, program, width, height, rasterR, 0, 'u_textureR');
		// createGrayTexture(gl, program, width, height, rasterG, 1, 'u_textureG');
		// createGrayTexture(gl, program, width, height, rasterB, 2, 'u_textureB');

		createGrayTextureBitmap(gl, program, bitmapR, 0, 'u_textureBitmapR');
		createGrayTextureBitmap(gl, program, bitmapG, 1, 'u_textureBitmapG');
		createGrayTextureBitmap(gl, program, bitmapB, 2, 'u_textureBitmapB');

		// テクスチャの作成と読み込み
		// const texture = gl.createTexture();
		// gl.bindTexture(gl.TEXTURE_2D, texture);

		// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// gl.bindTexture(gl.TEXTURE_2D, texture);
		// gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmapR);
		// gl.uniform1i(gl.getUniformLocation(program, 'u_textureBitmapR'), 0);
		// gl.generateMipmap(gl.TEXTURE_2D);

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
