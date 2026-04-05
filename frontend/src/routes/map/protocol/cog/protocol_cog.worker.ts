/**
 * COG Tile Protocol Worker
 *
 * メインスレッドから生バンドデータ（Float32Array）を受け取り、
 * Terrariumエンコード + WebGL2でカラーマップ適用/リプロジェクションして返す。
 */
import { convertCanvasToResult } from '../farbling';
import fsSingle from './shader/fragment_single.glsl?raw';
import fsMulti from './shader/fragment_multi.glsl?raw';
import vsSource from './shader/vertex.glsl?raw';

interface GLContext {
	canvas: OffscreenCanvas;
	gl: WebGL2RenderingContext;
	singleProgram: WebGLProgram;
	multiProgram: WebGLProgram;
	texturePool: Map<number, WebGLTexture>;
}

const glContexts = new Map<number, GLContext>();

const loadShader = (
	gl: WebGL2RenderingContext,
	type: number,
	source: string
): WebGLShader | null => {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error('Shader compile error:', gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
};

const createProgram = (gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram => {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vs);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fs);
	if (!vertexShader || !fragmentShader) throw new Error('Failed to compile shaders');

	const program = gl.createProgram();
	if (!program) throw new Error('Failed to create program');
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
	}
	return program;
};

const getOrCreateContext = (tileSize: number): GLContext => {
	let ctx = glContexts.get(tileSize);
	if (ctx) return ctx;

	const canvas = new OffscreenCanvas(tileSize, tileSize);
	const gl = canvas.getContext('webgl2');
	if (!gl) throw new Error('WebGL2 not supported');

	const singleProgram = createProgram(gl, vsSource, fsSingle);
	const multiProgram = createProgram(gl, vsSource, fsMulti);

	ctx = { canvas, gl, singleProgram, multiProgram, texturePool: new Map() };
	glContexts.set(tileSize, ctx);
	return ctx;
};

/** 生バンドデータをTerrariumエンコードしてRGBAピクセルを返す */
const encodeBandToTerrarium = (
	band: ArrayLike<number>,
	width: number,
	height: number,
	dataMin: number,
	dataMax: number,
	nodata: number | null
): Uint8ClampedArray => {
	const rgba = new Uint8ClampedArray(width * height * 4);
	const range = dataMax - dataMin;
	const invRange = range !== 0 ? 65535 / range : 0;

	for (let i = 0; i < band.length; i++) {
		const v = band[i];
		const idx = i * 4;

		if ((nodata !== null && v === nodata) || !isFinite(v)) {
			rgba[idx] = 0;
			rgba[idx + 1] = 0;
			rgba[idx + 2] = 0;
			rgba[idx + 3] = 0;
			continue;
		}

		const normalized = (v - dataMin) * invRange;
		rgba[idx] = Math.floor(normalized / 256); // R
		rgba[idx + 1] = Math.floor(normalized) % 256; // G
		rgba[idx + 2] = Math.floor((normalized % 1) * 256); // B
		rgba[idx + 3] = 255; // A
	}

	return rgba;
};

const bindTextureFromRGBA = (
	ctx: GLContext,
	unitIndex: number,
	uniformName: string,
	program: WebGLProgram,
	rgba: Uint8ClampedArray,
	width: number,
	height: number
) => {
	const { gl, texturePool } = ctx;
	const textureUnit = gl.TEXTURE0 + unitIndex;

	let texture = texturePool.get(unitIndex) ?? null;
	const isNew = !texture;
	if (isNew) {
		texture = gl.createTexture()!;
		texturePool.set(unitIndex, texture);
	}

	gl.activeTexture(textureUnit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(gl.getUniformLocation(program, uniformName), unitIndex);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);

	if (isNew) {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	}
};

const bindColorMapTexture = (
	ctx: GLContext,
	unitIndex: number,
	uniformName: string,
	program: WebGLProgram,
	colorMapArray: Uint8Array
) => {
	const { gl, texturePool } = ctx;
	const textureUnit = gl.TEXTURE0 + unitIndex;

	let texture = texturePool.get(unitIndex) ?? null;
	const isNew = !texture;
	if (isNew) {
		texture = gl.createTexture()!;
		texturePool.set(unitIndex, texture);
	}

	gl.activeTexture(textureUnit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(gl.getUniformLocation(program, uniformName), unitIndex);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 256, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, colorMapArray);

	if (isNew) {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	}
};

/** 三角形メッシュまたはフルスクリーンquadの頂点バッファを作成して描画 */
const drawMesh = (
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	triangles: { target: number[][]; source: number[][] }[] | null
) => {
	const posLoc = gl.getAttribLocation(program, 'a_position');
	const texLoc = gl.getAttribLocation(program, 'a_texcoord');

	if (triangles && triangles.length > 0) {
		// 三角形メッシュ: インターリーブ頂点配列 [posX, posY, texU, texV, ...]
		const vertexData: number[] = [];
		for (const tri of triangles) {
			for (let i = 0; i < 3; i++) {
				vertexData.push(tri.target[i][0], tri.target[i][1]);
				vertexData.push(tri.source[i][0], tri.source[i][1]);
			}
		}

		const buffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.DYNAMIC_DRAW);

		const stride = 4 * 4; // 4 floats * 4 bytes
		gl.enableVertexAttribArray(posLoc);
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
		if (texLoc >= 0) {
			gl.enableVertexAttribArray(texLoc);
			gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, stride, 2 * 4);
		}

		gl.drawArrays(gl.TRIANGLES, 0, triangles.length * 3);

		gl.deleteBuffer(buffer);
	} else {
		// フルスクリーンquad (0,0)-(1,1)
		const quadData = new Float32Array([
			// pos(x,y), tex(u,v)
			0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1
		]);

		const buffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);

		const stride = 4 * 4;
		gl.enableVertexAttribArray(posLoc);
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
		if (texLoc >= 0) {
			gl.enableVertexAttribArray(texLoc);
			gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, stride, 2 * 4);
		}

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		gl.deleteBuffer(buffer);
	}
};

let processingQueue: Promise<void> = Promise.resolve();

self.onmessage = (e) => {
	processingQueue = processingQueue.then(() => processMessage(e));
};

async function processMessage(e: MessageEvent) {
	const {
		tileId,
		mode,
		tileSize = 256,
		triangles,
		srcWidth,
		srcHeight,
		nodata,
		// single mode
		band,
		dataMin,
		dataMax,
		colorMapArray,
		min,
		max,
		// multi mode
		bandR,
		bandG,
		bandB,
		dataMinR,
		dataMaxR,
		dataMinG,
		dataMaxG,
		dataMinB,
		dataMaxB,
		rMin,
		rMax,
		gMin,
		gMax,
		bMin,
		bMax
	} = e.data;

	try {
		const ctx = getOrCreateContext(tileSize);
		const { canvas, gl } = ctx;
		gl.viewport(0, 0, tileSize, tileSize);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		if (mode === 'single') {
			const program = ctx.singleProgram;
			gl.useProgram(program);

			gl.uniform1f(gl.getUniformLocation(program, 'u_min'), min);
			gl.uniform1f(gl.getUniformLocation(program, 'u_max'), max);

			// Worker内でTerrariumエンコード
			const rgba = encodeBandToTerrarium(band, srcWidth, srcHeight, dataMin, dataMax, nodata);

			let unit = 0;
			bindTextureFromRGBA(ctx, unit++, 'u_band_texture', program, rgba, srcWidth, srcHeight);
			bindColorMapTexture(ctx, unit++, 'u_color_map', program, colorMapArray);

			drawMesh(gl, program, triangles);
		} else {
			const program = ctx.multiProgram;
			gl.useProgram(program);

			gl.uniform1f(gl.getUniformLocation(program, 'u_r_min'), rMin);
			gl.uniform1f(gl.getUniformLocation(program, 'u_r_max'), rMax);
			gl.uniform1f(gl.getUniformLocation(program, 'u_g_min'), gMin);
			gl.uniform1f(gl.getUniformLocation(program, 'u_g_max'), gMax);
			gl.uniform1f(gl.getUniformLocation(program, 'u_b_min'), bMin);
			gl.uniform1f(gl.getUniformLocation(program, 'u_b_max'), bMax);

			// Worker内でTerrariumエンコード（3バンド）
			const rgbaR = encodeBandToTerrarium(bandR, srcWidth, srcHeight, dataMinR, dataMaxR, nodata);
			const rgbaG = encodeBandToTerrarium(bandG, srcWidth, srcHeight, dataMinG, dataMaxG, nodata);
			const rgbaB = encodeBandToTerrarium(bandB, srcWidth, srcHeight, dataMinB, dataMaxB, nodata);

			let unit = 0;
			bindTextureFromRGBA(ctx, unit++, 'u_band_r', program, rgbaR, srcWidth, srcHeight);
			bindTextureFromRGBA(ctx, unit++, 'u_band_g', program, rgbaG, srcWidth, srcHeight);
			bindTextureFromRGBA(ctx, unit++, 'u_band_b', program, rgbaB, srcWidth, srcHeight);

			drawMesh(gl, program, triangles);
		}

		const result = await convertCanvasToResult(canvas);

		if (result instanceof ImageBitmap) {
			self.postMessage({ id: tileId, imageBitmap: result }, { transfer: [result] });
		} else {
			const buffer = await result.arrayBuffer();
			self.postMessage({ id: tileId, buffer });
		}
	} catch (error) {
		if (error instanceof Error) {
			self.postMessage({ id: tileId, error: error.message });
		}
	}
}
