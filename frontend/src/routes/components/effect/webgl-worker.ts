let texture: WebGLTexture | null = null;
let lastTextureCanvas: OffscreenCanvas | null = null;
let startTime: number;
let gl: WebGLRenderingContext | null = null;
let timeUniformLocation: WebGLUniformLocation | null = null;
let program: WebGLProgram | null = null;

// 頂点シェーダー
const vertexShaderSource = `
    attribute vec4 a_position;
    varying vec2 v_texcoord;
    void main() {
      gl_Position = a_position;
    }
  `;

// 時間によって色が変わるフラグメントシェーダー
const fragmentShaderSource = `
    precision mediump float;
    uniform float u_time;
    uniform sampler2D u_texture;
    varying vec2 v_texcoord;
    void main() {
      vec4 texColor = texture2D(u_texture, v_texcoord);
      float r = abs(sin(u_time));
      float g = abs(sin(u_time + 2.0));
      float b = abs(sin(u_time + 4.0));
      gl_FragColor = texColor;
    gl_FragColor = vec4(r, g, b, 1.0);
    }
  `;

function createShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!success) {
		console.error(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	const success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!success) {
		console.error(gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

self.onmessage = function (e) {
	const startTime = performance.now();
	const { type, canvas } = e.data;

	if (type === 'init') {
		gl = canvas.getContext('webgl');
		if (!gl) {
			console.error('WebGL context not available');
			return;
		}

		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
		program = createProgram(gl, vertexShader, fragmentShader);

		const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
		timeUniformLocation = gl.getUniformLocation(program, 'u_time');

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

		const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		gl.useProgram(program);
		gl.enableVertexAttribArray(positionAttributeLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

		texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	} else if (type === 'updateTexture') {
		const { canvas } = e.data;
		lastTextureCanvas = canvas;
	}

	function draw() {
		const now = performance.now();
		const elapsed = (now - startTime) / 1000;

		if (!gl) {
			console.error('WebGL context not available');
			return;
		}

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(program);
		gl.uniform1f(timeUniformLocation, elapsed);

		if (texture && lastTextureCanvas) {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lastTextureCanvas);
		}
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		// 次フレームを予約
		self.requestAnimationFrame(draw);
	}

	// 初回呼び出し
	self.requestAnimationFrame(draw);
};
