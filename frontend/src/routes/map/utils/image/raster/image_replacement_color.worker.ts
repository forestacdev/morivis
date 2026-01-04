import fsSource from './shaders/fragment.glsl?raw';
import vsSource from './shaders/vertex.glsl?raw';
import chroma from 'chroma-js';

let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;

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

	gl.useProgram(program);

	positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
	gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	const positionLocation = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
};

const canvas = new OffscreenCanvas(512, 512);

self.onmessage = async (e) => {
	const { tileId, image, targetColor, replacementColor, encodeType } = e.data;
	try {
		if (!gl) {
			initWebGL(canvas);
		}

		if (canvas.width !== image.width || canvas.height !== image.height) {
			canvas.width = image.width;
			canvas.height = image.height;
		}

		if (!gl || !program || !positionBuffer) {
			throw new Error('WebGL initialization failed');
		}

		gl.useProgram(program);

		// テクスチャの作成と読み込み
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// 色の置換用のユニフォーム設定
		const targetColorLocation = gl.getUniformLocation(program, 'u_target_color');
		const replacementColorLocation = gl.getUniformLocation(program, 'u_replacement_color');
		const toleranceLocation = gl.getUniformLocation(program, 'u_tolerance');

		gl.uniform3fv(targetColorLocation, chroma(targetColor).gl().slice(0, 3));
		gl.uniform3fv(replacementColorLocation, chroma(replacementColor).gl().slice(0, 3));
		gl.uniform1f(toleranceLocation, 1.0); // 許容範囲

		// テクスチャのパラメータ設定
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		// gl.generateMipmap(gl.TEXTURE_2D);

		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		const blob = await canvas.convertToBlob();
		if (!blob) {
			throw new Error('Failed to convert canvas to blob');
		}

		if (encodeType === 'buffar') {
			const buffer = await blob.arrayBuffer();
			self.postMessage({ id: tileId, buffer });
		} else if (encodeType === 'blob') {
			self.postMessage({ id: tileId, blob });
		}
	} catch (e) {
		console.error(e);
	}
};
