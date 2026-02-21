import { convertCanvasToResult } from '../farbling';
import fsSource from './shader/fragment.glsl?raw';
import vsSource from './shader/vertex.glsl?raw';

interface GLContext {
	canvas: OffscreenCanvas;
	gl: WebGL2RenderingContext;
	program: WebGLProgram;
	positionBuffer: WebGLBuffer;
	heightMapLocation: WebGLUniformLocation;
	demTypeLocation: WebGLUniformLocation;
}

const glContexts = new Map<number, GLContext>();

const initWebGL = (canvas: OffscreenCanvas): GLContext => {
	const gl = canvas.getContext('webgl2');
	if (!gl) {
		throw new Error('WebGL not supported');
	}

	const loadShader = (
		gl: WebGL2RenderingContext,
		type: number,
		source: string
	): WebGLShader | null => {
		const shader = gl.createShader(type);
		if (!shader) {
			console.error('Unable to create shader');
			return null;
		}
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	};

	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
	if (!vertexShader || !fragmentShader) {
		throw new Error('Failed to load shaders');
	}

	const program = gl.createProgram();
	if (!program) {
		throw new Error('Failed to create program');
	}
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
		throw new Error('Failed to link program');
	}

	const positionBuffer = gl.createBuffer();
	if (!positionBuffer) {
		throw new Error('Failed to create position buffer');
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	const positionLocation = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	const heightMapLocation = gl.getUniformLocation(program, 'u_height_map');
	const demTypeLocation = gl.getUniformLocation(program, 'u_dem_type');
	if (!heightMapLocation || !demTypeLocation) {
		throw new Error('Failed to get uniform locations');
	}

	return { canvas, gl, program, positionBuffer, heightMapLocation, demTypeLocation };
};

const getOrCreateContext = (tileSize: number): GLContext => {
	let ctx = glContexts.get(tileSize);
	if (!ctx) {
		const canvas = new OffscreenCanvas(tileSize, tileSize);
		ctx = initWebGL(canvas);
		glContexts.set(tileSize, ctx);
	}
	return ctx;
};

self.onmessage = async (e) => {
	const { id, image, demTypeNumber, tileSize = 256 } = e.data;

	try {
		const ctx = getOrCreateContext(tileSize);
		const { canvas, gl, program, heightMapLocation, demTypeLocation } = ctx;

		gl.viewport(0, 0, tileSize, tileSize);

		const heightMap = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, heightMap);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.useProgram(program);
		gl.uniform1i(heightMapLocation, 0);
		gl.uniform1f(demTypeLocation, demTypeNumber); // demTypeを設定

		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		const result = await convertCanvasToResult(canvas);
		if (result instanceof ImageBitmap) {
			self.postMessage({ id: id, imageBitmap: result }, { transfer: [result] });
		} else {
			const buffer = await result.arrayBuffer();
			self.postMessage({ id: id, buffer });
		}
	} catch (error) {
		if (error instanceof Error) {
			self.postMessage({ id: id, error: error.message });
		}
	}
};
