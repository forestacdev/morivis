import type { image } from 'html2canvas/dist/types/css/types/image';
import fsSource from './shader/fragment.glsl?raw';
import vsSource from './shader/vertex.glsl?raw';

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

const bindTextures = (
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	textures: { [name: string]: { image: ImageBitmap | Uint8Array; type: 'height' | 'colormap' } }
) => {
	let textureUnit = gl.TEXTURE0;

	Object.entries(textures).forEach(([uniformName, { image, type }]) => {
		// テクスチャをバインド
		const texture = gl.createTexture();
		gl.activeTexture(textureUnit); // 現在のテクスチャユニットをアクティブ
		gl.bindTexture(gl.TEXTURE_2D, texture);

		const location = gl.getUniformLocation(program, uniformName);
		gl.uniform1i(location, textureUnit - gl.TEXTURE0);

		if (type === 'height') {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image as ImageBitmap);
		} else {
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGB,
				256,
				1,
				0,
				gl.RGB,
				gl.UNSIGNED_BYTE,
				image as Uint8Array
			);
		}

		// ラッピングとフィルタリングの設定
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		textureUnit += 1; // 次のテクスチャユニットへ
	});
};

type UniformValue = {
	type: '1f' | '1i' | '4fv' | '3fv'; // 型指定
	value: number | Float32Array | Int32Array | number[];
};

type Uniforms = {
	[name: string]: UniformValue;
};

const setUniforms = (
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	uniforms: Uniforms
): void => {
	for (const [name, { type, value }] of Object.entries(uniforms)) {
		const location = gl.getUniformLocation(program, name);
		if (location !== null) {
			(gl as any)[`uniform${type}`](location, value);
		}
	}
};

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

const canvas = new OffscreenCanvas(256, 256);

self.onmessage = async (e) => {
	const {
		tileId,
		center,
		left,
		right,
		top,
		bottom,
		demTypeNumber,
		modeNumber,
		mode,
		max,
		min,
		elevationColorArray,
		tile,
		encodeType
	} = e.data;

	try {
		if (!gl) {
			initWebGL(canvas);
		}

		if (!gl || !program || !positionBuffer) {
			throw new Error('WebGL initialization failed');
		}

		// シェーダーを別のもにする
		gl.useProgram(program);

		if (mode === 'relief') {
			const uniforms: Uniforms = {
				u_dem_type: { type: '1f', value: demTypeNumber },
				u_mode: { type: '1f', value: modeNumber },
				u_max_height: { type: '1f', value: max },
				u_min_height: { type: '1f', value: min }
			};

			setUniforms(gl, program, uniforms);

			// テクスチャ
			bindTextures(gl, program, {
				u_height_map_center: { image: center, type: 'height' },
				u_color_map: { image: elevationColorArray, type: 'colormap' }
			});
		} else if (mode === 'slope' || mode === 'curvature') {
			const uniforms: Uniforms = {
				u_dem_type: { type: '1f', value: demTypeNumber },
				u_mode: { type: '1f', value: modeNumber },
				u_max_slope: { type: '1f', value: max },
				u_min_slope: { type: '1f', value: min },
				u_tile_y: { type: '1f', value: tile.y },
				u_tile_z: { type: '1f', value: tile.z }
			};

			setUniforms(gl, program, uniforms);

			// テクスチャ
			bindTextures(gl, program, {
				u_height_map_center: { image: center, type: 'height' },
				u_height_map_left: { image: left, type: 'height' },
				u_height_map_right: { image: right, type: 'height' },
				u_height_map_top: { image: top, type: 'height' },
				u_height_map_bottom: { image: bottom, type: 'height' },
				u_color_map: { image: elevationColorArray, type: 'colormap' }
			});
		} else if (mode === 'aspect') {
			const uniforms: Uniforms = {
				u_dem_type: { type: '1f', value: demTypeNumber },
				u_mode: { type: '1f', value: modeNumber },
				u_max_aspect: { type: '1f', value: max },
				u_min_aspect: { type: '1f', value: min },
				u_tile_y: { type: '1f', value: tile.y },
				u_tile_z: { type: '1f', value: tile.z }
			};

			setUniforms(gl, program, uniforms);

			// テクスチャ
			bindTextures(gl, program, {
				u_height_map_center: { image: center, type: 'height' },
				u_height_map_left: { image: left, type: 'height' },
				u_height_map_right: { image: right, type: 'height' },
				u_height_map_top: { image: top, type: 'height' },
				u_height_map_bottom: { image: bottom, type: 'height' },
				u_color_map: { image: elevationColorArray, type: 'colormap' }
			});
		}

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
	} catch (error) {
		if (error instanceof Error) {
			self.postMessage({ id: tileId, error: error.message });
		}
	}
};
