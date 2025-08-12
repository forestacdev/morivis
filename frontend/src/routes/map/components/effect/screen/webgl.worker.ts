import fragmentShaderSource from '$routes/map/components/effect/screen/shaders/fragment.glsl?raw';
import vertexShaderSource from '$routes/map/components/effect/screen/shaders/vertex.glsl?raw';

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let time: WebGLUniformLocation | null = null;
let texture: WebGLTexture | null = null;
let resolution: WebGLUniformLocation | null = null;
let animationFlagUniformLocation: WebGLUniformLocation | null = null;
let animationId: number | null = null;
let isInitialized = false;

const createShader = (gl: WebGLRenderingContext, type: GLenum, source: string) => {
	const shader = gl.createShader(type);
	if (!shader) {
		console.error('Failed to create shader');
		return null;
	}
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!success) {
		console.error(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
};

const createProgram = (
	gl: WebGLRenderingContext,
	vertexShader: WebGLShader,
	fragmentShader: WebGLShader
) => {
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
};

self.onmessage = (e) => {
	const startTime = performance.now();
	const { type, canvas, width, height } = e.data;

	if (type === 'init') {
		// 既存のアニメーションを停止
		if (animationId !== null) {
			self.cancelAnimationFrame(animationId);
			animationId = null;
		}

		if (isInitialized) {
			console.warn('WebGL worker already initialized, skipping initialization');
			self.postMessage({ type: 'initialized' });
			return;
		}

		gl = canvas.getContext('webgl');

		if (!gl) {
			console.error('WebGL context not available');
			return;
		}

		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

		if (!vertexShader || !fragmentShader) {
			console.error('Failed to create shaders');
			return;
		}
		program = createProgram(gl, vertexShader, fragmentShader);

		if (!program) {
			console.error('Failed to create shader program');
			return;
		}

		const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
		time = gl.getUniformLocation(program, 'time');
		resolution = gl.getUniformLocation(program, 'resolution');
		animationFlagUniformLocation = gl.getUniformLocation(program, 'animationFlag');
		gl.uniform1f(animationFlagUniformLocation, 0.0);

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

		gl.canvas.width = width;
		gl.canvas.height = height;
		gl.viewport(0, 0, width, height);

		isInitialized = true;
		self.postMessage({ type: 'initialized' });

		// アニメーションループを開始（一度だけ）
		startAnimationLoop(startTime);
	} else if (type === 'resize') {
		const { width, height } = e.data;
		if (!gl) {
			console.error('WebGL context not available');
			return;
		}
		gl.canvas.width = width;
		gl.canvas.height = height;
		gl.viewport(0, 0, width, height);
		gl.uniform1f(animationFlagUniformLocation, 0);
	} else if (type === 'transition') {
		const { animationFlag } = e.data;
		if (!gl || !animationFlagUniformLocation) {
			console.error('WebGL context or uniform location not available');
			return;
		}
		gl.useProgram(program);
		gl.uniform1f(animationFlagUniformLocation, animationFlag);
	}
};

const startAnimationLoop = (startTime: number) => {
	const draw = () => {
		const now = performance.now();
		const elapsed = (now - startTime) / 1000;

		if (!gl) {
			console.error('WebGL context not available');
			return;
		}

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(program);

		gl.uniform1f(time, elapsed);
		gl.uniform2f(resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		// 次フレームを予約
		animationId = self.requestAnimationFrame(draw);
	};

	// 初回呼び出し
	animationId = self.requestAnimationFrame(draw);
};
