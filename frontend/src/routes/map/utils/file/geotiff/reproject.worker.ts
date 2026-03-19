/**
 * 再投影ワーカー
 *
 * ソース座標系のラスターデータをWGS84上のピクセルにリサンプリングして
 * PNG画像として出力する。
 *
 * 入力:
 *   - rasters: Float32Array（フラット化されたバンドデータ）
 *   - size: バンド数
 *   - srcWidth, srcHeight: ソース画像のサイズ
 *   - srcBbox: ソース座標系でのbbox [minX, minY, maxX, maxY]
 *   - dstWidth, dstHeight: 出力画像のサイズ
 *   - dstBbox: WGS84でのbbox [minLng, minLat, maxLng, maxLat]
 *   - projDef: proj4定義文字列（ソース座標系）
 *   - type: 'single' | 'multi'
 *   - colorArray: カラーマップ（Uint8Array）
 *   - その他: bandIndex, min, max, redIndex, greenIndex, blueIndex, etc.
 */

import proj4 from 'proj4';

import vertexShaderSource from './shaders/vertex_reproject.glsl?raw';
import fsReprojectSingleSource from './shaders/fragment_reproject_single.glsl?raw';
import fsReprojectMultiSource from './shaders/fragment_reproject_multi.glsl?raw';

// --- WebGL helpers ---

const createShader = (
	gl: WebGL2RenderingContext,
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
	gl: WebGL2RenderingContext,
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

const bindColorMapTexture = (
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	image: Uint8Array,
	unit: number
) => {
	const texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	const location = gl.getUniformLocation(program, 'u_elevationMap');
	gl.uniform1i(location, unit);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 256, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
};

// --- UV map generation ---

/**
 * 出力画像（WGS84 bbox）の各ピクセルについて、
 * ソース座標系上の位置を計算し、ソース画像上のUV座標に変換する。
 *
 * 返すFloat32Arrayは [u, v, u, v, ...] の形式で dstWidth * dstHeight * 2 要素。
 */
const generateUVMap = (
	dstWidth: number,
	dstHeight: number,
	dstBbox: [number, number, number, number],
	srcBbox: [number, number, number, number],
	projDef: string
): Float32Array => {
	const uvMap = new Float32Array(dstWidth * dstHeight * 2);

	const [dstMinLng, dstMinLat, dstMaxLng, dstMaxLat] = dstBbox;
	const [srcMinX, srcMinY, srcMaxX, srcMaxY] = srcBbox;
	const srcRangeX = srcMaxX - srcMinX;
	const srcRangeY = srcMaxY - srcMinY;

	const converter = proj4('EPSG:4326', projDef);

	for (let row = 0; row < dstHeight; row++) {
		// 出力画像のY軸: 上が北（row=0が最大緯度）
		const lat = dstMaxLat - (row / (dstHeight - 1)) * (dstMaxLat - dstMinLat);

		for (let col = 0; col < dstWidth; col++) {
			const lng = dstMinLng + (col / (dstWidth - 1)) * (dstMaxLng - dstMinLng);

			// WGS84 → ソース座標系に順変換
			const [srcX, srcY] = converter.forward([lng, lat]);

			// ソースbbox上のUV座標に正規化
			const u = (srcX - srcMinX) / srcRangeX;
			const v = 1.0 - (srcY - srcMinY) / srcRangeY; // Y軸反転（テクスチャ座標系）

			const idx = (row * dstWidth + col) * 2;
			uvMap[idx] = u;
			uvMap[idx + 1] = v;
		}
	}

	return uvMap;
};

// --- WebGL state ---
let gl: WebGL2RenderingContext | null = null;
const canvas = new OffscreenCanvas(256, 256);
let programs: { single: WebGLProgram; multi: WebGLProgram } | null = null;

const initWebGL = () => {
	gl = canvas.getContext('webgl2');
	if (!gl) throw new Error('WebGL2 not supported');

	gl.getExtension('EXT_color_buffer_float');

	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fsSingle = createShader(gl, gl.FRAGMENT_SHADER, fsReprojectSingleSource);
	const fsMulti = createShader(gl, gl.FRAGMENT_SHADER, fsReprojectMultiSource);

	if (!vertexShader || !fsSingle || !fsMulti) {
		throw new Error('Failed to create reproject shaders');
	}

	programs = {
		single: createProgram(gl, vertexShader, fsSingle) as WebGLProgram,
		multi: createProgram(gl, vertexShader, fsMulti) as WebGLProgram
	};
};

// --- Main message handler ---

self.onmessage = async (e) => {
	const {
		rasters,
		size,
		type,
		srcWidth,
		srcHeight,
		srcBbox,
		dstWidth,
		dstHeight,
		dstBbox,
		projDef,
		colorArray,
		min,
		max,
		bandIndex,
		redIndex,
		greenIndex,
		blueIndex,
		redMin,
		redMax,
		greenMin,
		greenMax,
		blueMin,
		blueMax
	} = e.data;

	try {
		if (!gl) initWebGL();
		if (!gl || !programs) throw new Error('WebGL initialization failed');

		// 出力サイズ設定
		canvas.width = dstWidth;
		canvas.height = dstHeight;
		gl.viewport(0, 0, dstWidth, dstHeight);

		const program = programs[type as keyof typeof programs];
		gl.useProgram(program);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// --- 頂点バッファ ---
		const positionLoc = gl.getAttribLocation(program, 'a_position');
		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
			gl.STATIC_DRAW
		);
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

		// --- テクスチャ0: ラスターデータ（TEXTURE_2D_ARRAY） ---
		const rasterTex = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, rasterTex);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage3D(
			gl.TEXTURE_2D_ARRAY,
			0,
			gl.R32F,
			srcWidth,
			srcHeight,
			size,
			0,
			gl.RED,
			gl.FLOAT,
			rasters
		);
		const texArrayLoc = gl.getUniformLocation(program, 'u_texArray');
		gl.uniform1i(texArrayLoc, 0);

		// --- テクスチャ2: UVマップ ---
		const uvMap = generateUVMap(dstWidth, dstHeight, dstBbox, srcBbox, projDef);
		const uvTex = gl.createTexture();
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, uvTex);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RG32F,
			dstWidth,
			dstHeight,
			0,
			gl.RG,
			gl.FLOAT,
			uvMap
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		const uvMapLoc = gl.getUniformLocation(program, 'u_uvMap');
		gl.uniform1i(uvMapLoc, 2);

		// --- ユニフォーム設定 ---
		if (type === 'single') {
			gl.uniform1i(gl.getUniformLocation(program, 'u_bandIndex'), bandIndex ?? 0);
			gl.uniform1f(gl.getUniformLocation(program, 'u_min'), min);
			gl.uniform1f(gl.getUniformLocation(program, 'u_max'), max);
			// カラーマップテクスチャ（unit 1）
			bindColorMapTexture(gl, program, colorArray, 1);
		} else if (type === 'multi') {
			gl.uniform1i(gl.getUniformLocation(program, 'u_redIndex'), redIndex ?? 0);
			gl.uniform1i(gl.getUniformLocation(program, 'u_greenIndex'), greenIndex ?? 1);
			gl.uniform1i(gl.getUniformLocation(program, 'u_blueIndex'), blueIndex ?? 2);
			gl.uniform1f(gl.getUniformLocation(program, 'u_redMin'), redMin ?? 0);
			gl.uniform1f(gl.getUniformLocation(program, 'u_redMax'), redMax ?? 255);
			gl.uniform1f(gl.getUniformLocation(program, 'u_greenMin'), greenMin ?? 0);
			gl.uniform1f(gl.getUniformLocation(program, 'u_greenMax'), greenMax ?? 255);
			gl.uniform1f(gl.getUniformLocation(program, 'u_blueMin'), blueMin ?? 0);
			gl.uniform1f(gl.getUniformLocation(program, 'u_blueMax'), blueMax ?? 255);
		}

		// --- 描画 ---
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		const blob = await canvas.convertToBlob({ type: 'image/png' });
		self.postMessage({ blob });

		// クリーンアップ
		gl.deleteTexture(rasterTex);
		gl.deleteTexture(uvTex);
		gl.deleteBuffer(positionBuffer);
	} catch (err) {
		console.error(err);
		self.postMessage({ error: err instanceof Error ? err.message : String(err) });
	}
};
