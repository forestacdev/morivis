export const screenShaderLayer = {
	id: 'screen-shader-layer',
	type: 'custom',
	renderingMode: '2d',
	onAdd(map, gl) {
		// 頂点データ：NDCで四角形を構成（-1〜1の範囲）
		const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

		const vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		// 頂点シェーダー
		const vertexShaderSource = `
                attribute vec2 a_position;
                varying vec2 v_uv;
                void main() {
                    v_uv = a_position * 0.5 + 0.5;
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
                `;

		// フラグメントシェーダー（ここに任意のエフェクトを入れる）
		const fragmentShaderSource = `
                precision mediump float;
                varying vec2 v_uv;
                uniform float u_time;
                void main() {
                    vec3 color = vec3(0.5 + 0.5 * sin(u_time + v_uv.xyx * 10.0));
                    gl_FragColor = vec4(color, 0.1);
                }
                `;

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
		(this as any)._gl = gl;
		(this as any)._program = program;
		(this as any)._a_position = a_position;
		(this as any)._u_time = u_time;
		(this as any)._vertexBuffer = vertexBuffer;
		(this as any)._start = performance.now();
	},

	render(gl, matrix) {
		const now = performance.now();
		const time = (now - (this as any)._start) / 1000;

		gl.useProgram((this as any)._program);
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND); // ✅ ブレンドを有効化
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // ✅ 通常のアルファブレンド
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

		gl.bindBuffer(gl.ARRAY_BUFFER, (this as any)._vertexBuffer);
		gl.enableVertexAttribArray((this as any)._a_position);
		gl.vertexAttribPointer((this as any)._a_position, 2, gl.FLOAT, false, 0, 0);

		gl.uniform1f((this as any)._u_time, time);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}
};
