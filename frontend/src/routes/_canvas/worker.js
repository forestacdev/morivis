self.onmessage = function (e) {
	const offscreen = e.data.canvas;
	const gl = offscreen.getContext('webgl');

	// 頂点シェーダー
	const vertexShaderSource = `
    attribute vec4 a_position;
    void main() {
      gl_Position = a_position;
    }
  `;

	// 時間によって色が変わるフラグメントシェーダー
	const fragmentShaderSource = `
    precision mediump float;
    uniform float u_time;
    void main() {
      float r = abs(sin(u_time));
      float g = abs(sin(u_time + 2.0));
      float b = abs(sin(u_time + 4.0));
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

	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	const program = createProgram(gl, vertexShader, fragmentShader);

	const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
	const timeUniformLocation = gl.getUniformLocation(program, 'u_time');

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	gl.useProgram(program);
	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

	const startTime = Date.now();

	function draw() {
		const now = Date.now();
		const elapsed = (now - startTime) / 1000; // 秒

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(program);
		gl.uniform1f(timeUniformLocation, elapsed);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	// Worker内では setInterval が使える（RAF は使えない）
	setInterval(draw, 16); // 約60fps
};
