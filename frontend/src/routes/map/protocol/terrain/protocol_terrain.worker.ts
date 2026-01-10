import fsSource from './shader/fragment.glsl?raw';
import vsSource from './shader/vertex.glsl?raw';

let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let heightMapLocation: WebGLUniformLocation | null = null;
let demTypeLocation: WebGLUniformLocation | null = null;

const initWebGL = (canvas: OffscreenCanvas) => {
	gl = canvas.getContext('webgl2');
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

	program = gl.createProgram();
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

	positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	const positionLocation = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	heightMapLocation = gl.getUniformLocation(program, 'u_height_map');
	demTypeLocation = gl.getUniformLocation(program, 'u_dem_type');
};

const canvas = new OffscreenCanvas(256, 256);

self.onmessage = async (e) => {
	const { id, image, demTypeNumber } = e.data;

	try {
		if (!gl) {
			initWebGL(canvas);
		}

		if (!gl || !program || !positionBuffer || !heightMapLocation) {
			throw new Error('WebGL initialization failed');
		}

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

		const blob = await canvas.convertToBlob();
		if (!blob) {
			throw new Error('Failed to convert canvas to blob');
		}
		const buffer = await blob.arrayBuffer();
		self.postMessage({ id: id, buffer });
	} catch (error) {
		if (error instanceof Error) {
			self.postMessage({ id: id, error: error.message });
		}
	}
};
