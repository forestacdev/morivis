import fragmentShaderSource from '$routes/components/effect/screen/shaders/fragment.glsl?raw';
import vertexShaderSource from '$routes/components/effect/screen/shaders/vertex.glsl?raw';
import type { Map } from 'maplibre-gl';

export const screenShaderLayer = {
	id: 'screen-shader-layer',
	type: 'custom',
	renderingMode: '2d',
	_gl: null as WebGL2RenderingContext | null,
	_start: 0 as number,
	_program: null as WebGLProgram | null,
	_a_position: null as number | null,
	_u_time: null as WebGLUniformLocation | null,
	_vertexBuffer: null as WebGLBuffer | null,

	onAdd(map: Map, gl: WebGL2RenderingContext) {
		// 頂点データ：NDCで四角形を構成（-1〜1の範囲）
		const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

		const vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		function compileShader(type: number, source: string): WebGLShader {
			const shader = gl.createShader(type)!;
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw new Error('Shader compile error: ' + gl.getShaderInfoLog(shader));
			}
			return shader;
		}

		const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

		const program = gl.createProgram()!;
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
		}

		const a_position = gl.getAttribLocation(program, 'a_position');
		const u_time = gl.getUniformLocation(program, 'u_time');

		// 保持しておく
		this._gl = gl;
		this._program = program;
		this._a_position = a_position;
		this._u_time = u_time;
		this._vertexBuffer = vertexBuffer;
		this._start = performance.now();
	},

	render(gl: WebGL2RenderingContext, _matrix) {
		const now = performance.now();
		const time = (now - this._start) / 1000;

		gl.useProgram(this._program);
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND); // ✅ ブレンドを有効化
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // ✅ 通常のアルファブレンド
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.enableVertexAttribArray(this._a_position as number);
		gl.vertexAttribPointer(this._a_position as number, 2, gl.FLOAT, false, 0, 0);

		gl.uniform1f(this._u_time, time);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}
};
