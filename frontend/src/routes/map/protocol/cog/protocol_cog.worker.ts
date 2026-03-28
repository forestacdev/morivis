/**
 * COG Tile Protocol Worker
 *
 * メインスレッドからTerrarium形式のバンドテクスチャ（ImageBitmap）を受け取り、
 * WebGL2でカラーマップ適用またはRGB合成して結果をPNG/ImageBitmapで返す。
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
	positionBuffer: WebGLBuffer;
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

const createProgram = (
	gl: WebGL2RenderingContext,
	vsSource: string,
	fsSource: string
): WebGLProgram => {
	const vs = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fs = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
	if (!vs || !fs) throw new Error('Failed to compile shaders');

	const program = gl.createProgram();
	if (!program) throw new Error('Failed to create program');
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
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

	const positionBuffer = gl.createBuffer()!;
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW
	);

	ctx = { canvas, gl, singleProgram, multiProgram, positionBuffer, texturePool: new Map() };
	glContexts.set(tileSize, ctx);
	return ctx;
};

const setupAttributes = (gl: WebGL2RenderingContext, program: WebGLProgram) => {
	const posLoc = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
};

const bindTexture = (
	ctx: GLContext,
	unitIndex: number,
	uniformName: string,
	program: WebGLProgram,
	image: ImageBitmap | Uint8Array,
	isColorMap: boolean
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

	if (isColorMap) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 256, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, image as Uint8Array);
	} else {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image as ImageBitmap);
	}

	if (isNew) {
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
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
		// single mode
		bandTexture,
		colorMapArray,
		min,
		max,
		// multi mode
		bandR,
		bandG,
		bandB,
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

		if (mode === 'single') {
			const program = ctx.singleProgram;
			gl.useProgram(program);
			setupAttributes(gl, program);

			// uniforms
			gl.uniform1f(gl.getUniformLocation(program, 'u_min'), min);
			gl.uniform1f(gl.getUniformLocation(program, 'u_max'), max);

			// textures
			let unit = 0;
			bindTexture(ctx, unit++, 'u_band_texture', program, bandTexture, false);
			bindTexture(ctx, unit++, 'u_color_map', program, colorMapArray, true);
		} else {
			// multi
			const program = ctx.multiProgram;
			gl.useProgram(program);
			setupAttributes(gl, program);

			gl.uniform1f(gl.getUniformLocation(program, 'u_r_min'), rMin);
			gl.uniform1f(gl.getUniformLocation(program, 'u_r_max'), rMax);
			gl.uniform1f(gl.getUniformLocation(program, 'u_g_min'), gMin);
			gl.uniform1f(gl.getUniformLocation(program, 'u_g_max'), gMax);
			gl.uniform1f(gl.getUniformLocation(program, 'u_b_min'), bMin);
			gl.uniform1f(gl.getUniformLocation(program, 'u_b_max'), bMax);

			let unit = 0;
			bindTexture(ctx, unit++, 'u_band_r', program, bandR, false);
			bindTexture(ctx, unit++, 'u_band_g', program, bandG, false);
			bindTexture(ctx, unit++, 'u_band_b', program, bandB, false);
		}

		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

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
