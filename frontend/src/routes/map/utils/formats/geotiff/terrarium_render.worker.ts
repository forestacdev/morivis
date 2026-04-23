/**
 * Terrarium レンダー Worker
 *
 * キャッシュ済み Terrarium PNG (ImageBitmap) からテクスチャを読み、
 * シェーダーでデコード→色マッピングして最終画像を生成する。
 *
 * 初回呼び出し時に ImageBitmap をテクスチャにアップロードし、
 * 以降のスタイル変更ではユニフォーム値のみ更新して再描画する。
 */

import vertexShaderSource from './shaders/vertex.glsl?raw';
import fsSingleSource from './shaders/fragment_terrarium_single.glsl?raw';
import fsMultiSource from './shaders/fragment_terrarium_multi.glsl?raw';

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

// --- WebGL state ---

let gl: WebGL2RenderingContext | null = null;
const canvas = new OffscreenCanvas(256, 256);
let programs: { single: WebGLProgram; multi: WebGLProgram } | null = null;
let positionBuffer: WebGLBuffer | null = null;

// エントリごとのテクスチャキャッシュ
const textureCache = new Map<
	string,
	{
		texture: WebGLTexture;
		width: number;
		height: number;
		bandCount: number;
	}
>();

const initWebGL = () => {
	gl = canvas.getContext('webgl2');
	if (!gl) throw new Error('WebGL2 not supported');

	gl.getExtension('EXT_color_buffer_float');

	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fsSingle = createShader(gl, gl.FRAGMENT_SHADER, fsSingleSource);
	const fsMulti = createShader(gl, gl.FRAGMENT_SHADER, fsMultiSource);

	if (!vertexShader || !fsSingle || !fsMulti) {
		throw new Error('Failed to create shaders');
	}

	programs = {
		single: createProgram(gl, vertexShader, fsSingle) as WebGLProgram,
		multi: createProgram(gl, vertexShader, fsMulti) as WebGLProgram
	};

	// 頂点バッファ（共通）
	positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
		gl.STATIC_DRAW
	);
};

/**
 * ImageBitmap 配列を TEXTURE_2D_ARRAY にアップロードする
 */
const uploadBandTextures = (
	entryId: string,
	images: ImageBitmap[],
	width: number,
	height: number
) => {
	if (!gl) return;

	// 既存テクスチャがあれば削除
	const existing = textureCache.get(entryId);
	if (existing) {
		gl.deleteTexture(existing.texture);
	}

	const texture = gl.createTexture();
	if (!texture) return;

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);

	// TEXTURE_2D_ARRAY のストレージ確保
	gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, width, height, images.length);

	// 各バンドの ImageBitmap をスライスにアップロード
	for (let i = 0; i < images.length; i++) {
		gl.texSubImage3D(
			gl.TEXTURE_2D_ARRAY,
			0,
			0,
			0,
			i,
			width,
			height,
			1,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			images[i]
		);
	}

	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	textureCache.set(entryId, { texture, width, height, bandCount: images.length });
};

/**
 * カラーマップテクスチャをバインド
 */
const bindColorMapTexture = (program: WebGLProgram, colorArray: Uint8Array, unit: number) => {
	if (!gl) return;

	const texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(gl.getUniformLocation(program, 'u_color_map'), unit);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 256, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, colorArray);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
};

// --- Message types ---

interface RenderMessage {
	entryId: string;
	type: 'single' | 'multi';
	// 初回のみ: ImageBitmap 配列
	images?: ImageBitmap[];
	width: number;
	height: number;
	// カラーマップ（single モード用）
	colorArray?: Uint8Array;
	// single モード（min/max は CPU側で正規化済み: 0〜1）
	bandIndex?: number;
	min?: number;
	max?: number;
	// multi モード（各チャンネルの min/max も正規化済み: 0〜1）
	redIndex?: number;
	greenIndex?: number;
	blueIndex?: number;
	redMin?: number;
	redMax?: number;
	greenMin?: number;
	greenMax?: number;
	blueMin?: number;
	blueMax?: number;
	// 4326→メルカトル再投影
	reproject4326?: boolean;
	bboxDisplay?: [number, number, number, number]; // 表示側bbox（クリップ済み）度数
	bboxSource?: [number, number, number, number]; // ソーステクスチャのbbox（元の範囲）度数
	outputWidth?: number; // 再投影時の出力サイズ
	outputHeight?: number;
	// エントリ削除
	action?: 'release';
}

self.onmessage = async (e) => {
	const msg = e.data as RenderMessage;

	// テクスチャ解放リクエスト
	if (msg.action === 'release') {
		const cached = textureCache.get(msg.entryId);
		if (cached && gl) {
			gl.deleteTexture(cached.texture);
		}
		textureCache.delete(msg.entryId);
		return;
	}

	try {
		if (!gl) initWebGL();
		if (!gl || !programs) throw new Error('WebGL initialization failed');

		// 初回: ImageBitmap をテクスチャにアップロード
		if (msg.images) {
			uploadBandTextures(msg.entryId, msg.images, msg.width, msg.height);
		}

		const cached = textureCache.get(msg.entryId);
		if (!cached) {
			throw new Error(`No texture cached for entry: ${msg.entryId}`);
		}

		// キャンバスサイズ設定（再投影時は出力サイズを使用）
		const outWidth = msg.outputWidth ?? cached.width;
		const outHeight = msg.outputHeight ?? cached.height;
		canvas.width = outWidth;
		canvas.height = outHeight;
		gl.viewport(0, 0, outWidth, outHeight);

		const program = programs[msg.type];
		gl.useProgram(program);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// 頂点バッファ
		const positionLoc = gl.getAttribLocation(program, 'a_position');
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

		// Terrarium バンドテクスチャ
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, cached.texture);
		gl.uniform1i(gl.getUniformLocation(program, 'u_terrarium_bands'), 0);

		// 4326→メルカトル再投影ユニフォーム
		gl.uniform1i(gl.getUniformLocation(program, 'u_reproject4326'), msg.reproject4326 ? 1 : 0);
		if (msg.bboxDisplay) {
			gl.uniform4f(
				gl.getUniformLocation(program, 'u_bbox_display'),
				msg.bboxDisplay[0],
				msg.bboxDisplay[1],
				msg.bboxDisplay[2],
				msg.bboxDisplay[3]
			);
		} else {
			gl.uniform4f(gl.getUniformLocation(program, 'u_bbox_display'), 0, 0, 0, 0);
		}
		if (msg.bboxSource) {
			gl.uniform4f(
				gl.getUniformLocation(program, 'u_bbox_source'),
				msg.bboxSource[0],
				msg.bboxSource[1],
				msg.bboxSource[2],
				msg.bboxSource[3]
			);
		} else {
			gl.uniform4f(gl.getUniformLocation(program, 'u_bbox_source'), 0, 0, 0, 0);
		}

		// ユニフォーム設定（min/max は CPU側で正規化済み: 0〜1）
		if (msg.type === 'single') {
			gl.uniform1i(gl.getUniformLocation(program, 'u_bandIndex'), msg.bandIndex ?? 0);
			gl.uniform1f(gl.getUniformLocation(program, 'u_min'), msg.min ?? 0);
			gl.uniform1f(gl.getUniformLocation(program, 'u_max'), msg.max ?? 1);
			if (msg.colorArray) {
				bindColorMapTexture(program, msg.colorArray, 1);
			}
		} else if (msg.type === 'multi') {
			gl.uniform1i(gl.getUniformLocation(program, 'u_redIndex'), msg.redIndex ?? 0);
			gl.uniform1i(gl.getUniformLocation(program, 'u_greenIndex'), msg.greenIndex ?? 1);
			gl.uniform1i(gl.getUniformLocation(program, 'u_blueIndex'), msg.blueIndex ?? 2);
			gl.uniform1f(gl.getUniformLocation(program, 'u_redMin'), msg.redMin ?? 0);
			gl.uniform1f(gl.getUniformLocation(program, 'u_redMax'), msg.redMax ?? 1);
			gl.uniform1f(gl.getUniformLocation(program, 'u_greenMin'), msg.greenMin ?? 0);
			gl.uniform1f(gl.getUniformLocation(program, 'u_greenMax'), msg.greenMax ?? 1);
			gl.uniform1f(gl.getUniformLocation(program, 'u_blueMin'), msg.blueMin ?? 0);
			gl.uniform1f(gl.getUniformLocation(program, 'u_blueMax'), msg.blueMax ?? 1);
		}

		// 描画
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		const blob = await canvas.convertToBlob({ type: 'image/png' });
		self.postMessage({ blob });
	} catch (err) {
		console.error(err);
		self.postMessage({ error: err instanceof Error ? err.message : String(err) });
	}
};
