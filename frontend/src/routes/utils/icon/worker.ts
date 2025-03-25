import vertexShaderSource from './shader/vertex.glsl?raw';
import fragmentShaderSource from './shader/fragment.glsl?raw';

const loadImage = async (src: string): Promise<ImageBitmap> => {
	const response = await fetch(src);
	if (!response.ok) {
		throw new Error('Failed to fetch image');
	}
	const blob = await response.blob();
	return await createImageBitmap(blob);
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

const canvas = new OffscreenCanvas(432, 512);
const gl = canvas.getContext('webgl2');

self.onmessage = async (e) => {
	const { id, url } = e.data;
	try {
		const image = await loadImage(url);

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
		const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');

		const imageResolutionUniformLocation = gl.getUniformLocation(program, 'u_imageResolution');
		gl.uniform2f(imageResolutionUniformLocation, image.width, image.height);

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
			gl.STATIC_DRAW
		);

		gl.enableVertexAttribArray(positionAttributeLocation);
		gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

		gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

		// テクスチャの作成と読み込み
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// テクスチャのパラメータ設定
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		// gl.generateMipmap(gl.TEXTURE_2D);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		self.postMessage({ id, imageBitmap: canvas.transferToImageBitmap() });
	} catch (e) {
		console.error(e);
	}
};
