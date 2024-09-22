import fsSource from './shader/fragment.frag';
import vsSource from './shader/vertex.vert';
import { COLOR_MAP_TYPE } from '$lib/data/raster/dem';
import type { ColorMapTypeKey } from '$lib/data/raster/dem';

let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let positionBuffer: WebGLBuffer | null = null;
let heightMapLocation: WebGLUniformLocation | null = null;
let demTypeLocation: WebGLUniformLocation | null = null;

const calculateLightDirection = (azimuth: number, altitude: number) => {
	// 方位角と高度をラジアンに変換
	const azimuthRad = (azimuth * Math.PI) / 180;
	const altitudeRad = (altitude * Math.PI) / 180;

	// 光の方向ベクトルを計算
	const x = Math.cos(altitudeRad) * Math.sin(azimuthRad);
	const y = Math.sin(altitudeRad);
	const z = -Math.cos(altitudeRad) * Math.cos(azimuthRad); // 北がZ軸の負の方向

	return [x, y, z];
};

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
			console.error(
				'An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader)
			);
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
	const positionLocation = gl.getAttribLocation(program, 'aPosition');
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	heightMapLocation = gl.getUniformLocation(program, 'heightMap');
	demTypeLocation = gl.getUniformLocation(program, 'demType');
};

const canvas = new OffscreenCanvas(256, 256);

self.onmessage = async (e) => {
	const { url, image, demTypeNumber, uniformsData } = e.data;

	const { evolution, slope, shadow, aspect } = uniformsData;
	const evolutionModeInt = evolution.visible ? 1 : 0;
	const slopeModeInt = slope.visible ? 1 : 0;
	const shadowModeInt = shadow.visible ? 1 : 0;
	const aspectModeInt = aspect.visible ? 1 : 0;

	const evolutionOpacity = evolution.opacity;
	const slopeOpacity = slope.opacity;
	const shadowOpacity = shadow.opacity;
	const aspectOpacity = aspect.opacity;

	const evolutionColorMapInt = COLOR_MAP_TYPE[evolution.colorMap as ColorMapTypeKey];
	const aspectColorMapInt = COLOR_MAP_TYPE[aspect.colorMap as ColorMapTypeKey];
	const slopeColorMapInt = COLOR_MAP_TYPE[slope.colorMap as ColorMapTypeKey];

	const lightDirection = calculateLightDirection(shadow.azimuth, shadow.altitude);

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
		gl.uniform1i(demTypeLocation, demTypeNumber); // demTypeを設定

		// モード
		gl.uniform1i(gl.getUniformLocation(program, 'evolutionMode'), evolutionModeInt);
		gl.uniform1i(gl.getUniformLocation(program, 'slopeMode'), slopeModeInt);
		gl.uniform1i(gl.getUniformLocation(program, 'shadowMode'), shadowModeInt);
		gl.uniform1i(gl.getUniformLocation(program, 'aspectMode'), aspectModeInt);

		// 透過度
		gl.uniform1f(gl.getUniformLocation(program, 'evolutionAlpha'), evolutionOpacity);
		gl.uniform1f(gl.getUniformLocation(program, 'slopeAlpha'), slopeOpacity);
		gl.uniform1f(gl.getUniformLocation(program, 'shadowStrength'), shadowOpacity);
		gl.uniform1f(gl.getUniformLocation(program, 'aspectAlpha'), aspectOpacity);

		// カラーマップ
		gl.uniform1i(gl.getUniformLocation(program, 'evolutionColorMap'), evolutionColorMapInt);
		gl.uniform1i(gl.getUniformLocation(program, 'slopeColorMap'), slopeColorMapInt);
		gl.uniform1i(gl.getUniformLocation(program, 'aspectColorMap'), aspectColorMapInt);

		// 標高値の最大値と最小値
		gl.uniform1f(gl.getUniformLocation(program, 'maxHeight'), evolution.max);
		gl.uniform1f(gl.getUniformLocation(program, 'minHeight'), evolution.min);

		// 光の方向
		gl.uniform3fv(gl.getUniformLocation(program, 'lightDirection'), lightDirection);

		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		const blob = await canvas.convertToBlob();
		if (!blob) {
			throw new Error('Failed to convert canvas to blob');
		}
		const reader = new FileReader();
		reader.onloadend = () => {
			self.postMessage({ id: url, buffer: reader.result });
		};
		reader.readAsArrayBuffer(blob);
	} catch (error) {
		if (error instanceof Error) {
			if (error.name === 'AbortError') {
				self.postMessage({ id: url, error: 'Request aborted' });
			} else {
				self.postMessage({ id: url, error: error.message });
			}
		}
	}
};
