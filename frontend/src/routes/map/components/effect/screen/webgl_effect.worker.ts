import fragmentShaderSource from '$routes/map/components/effect/screen/shaders/fragment.glsl?raw';
import vertexShaderSource from '$routes/map/components/effect/screen/shaders/vertex.glsl?raw';

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let time: WebGLUniformLocation | null = null;
let texture: WebGLTexture | null = null;
let resolution: WebGLUniformLocation | null = null;
let animationFlagUniformLocation: WebGLUniformLocation | null = null;

// アニメーション制御用の変数
let animationId: number | null = null;
let isAnimating = false;
let currentAnimationFlag = 0;
let animationStartTime = 0;
let currentTransitionStartTime = 0;

// 遅延停止タイマー管理
let delayedStopTimerId: number | null = null;

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

// delay用のヘルパー関数
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// アニメーションを開始する関数
const startAnimation = (startTime: number) => {
	if (isAnimating) return;

	// 既存の遅延停止タイマーがあればキャンセル
	cancelDelayedStop();

	isAnimating = true;
	animationStartTime = startTime;
	currentTransitionStartTime = startTime;
	if (import.meta.env.DEV) {
		console.log('Animation started');
	}

	const draw = () => {
		const now = performance.now();
		// 現在のトランジション開始時点からの経過時間
		const elapsed = (now - currentTransitionStartTime) / 1000;

		if (!gl || !isAnimating) {
			console.error('WebGL context not available or animation stopped');
			return;
		}

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(program);
		gl.uniform1f(time, elapsed);
		gl.uniform2f(resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		// アニメーション実行中は次フレームを予約
		if (isAnimating) {
			animationId = self.requestAnimationFrame(draw);
		}
	};

	animationId = self.requestAnimationFrame(draw);
};

// アニメーションを停止する関数
const stopAnimation = () => {
	// 遅延停止タイマーもキャンセル
	cancelDelayedStop();

	if (animationId !== null) {
		self.cancelAnimationFrame(animationId);
		animationId = null;
	}
	isAnimating = false;

	if (import.meta.env.DEV) {
		console.log('Animation stopped');
	}
};

// 遅延停止タイマーをキャンセルする関数
const cancelDelayedStop = () => {
	if (delayedStopTimerId !== null) {
		clearTimeout(delayedStopTimerId);
		delayedStopTimerId = null;
		if (import.meta.env.DEV) {
			console.log('Delayed stop timer cancelled');
		}
	}
};

// 遅延停止関数（改良版）
const stopAnimationDelay = async (delayMs: number = 1500) => {
	// 既存の遅延停止タイマーをキャンセル
	cancelDelayedStop();

	if (import.meta.env.DEV) {
		console.log(`Starting delayed stop timer (${delayMs}ms)`);
	}

	// 新しいタイマーを設定
	delayedStopTimerId = self.setTimeout(() => {
		if (animationId !== null) {
			self.cancelAnimationFrame(animationId);
			animationId = null;
		}
		isAnimating = false;
		delayedStopTimerId = null;

		if (import.meta.env.DEV) {
			console.log('Animation stopped after delay');
		}
	}, delayMs);
};

// 1回だけ描画する関数（静的状態用）
const drawOnce = () => {
	if (!gl) {
		console.error('WebGL context not available');
		return;
	}

	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.useProgram(program);
	gl.uniform1f(time, 0); // 静的状態では時間は0
	gl.uniform2f(resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

// アニメーション状態を取得する関数（デバッグ用）
const getAnimationStatus = () => {
	return {
		isAnimating,
		currentAnimationFlag,
		hasDelayedStopTimer: delayedStopTimerId !== null,
		animationId: animationId !== null
	};
};

self.onmessage = (e) => {
	const startTime = performance.now();
	const { type, canvas, width, height } = e.data;

	if (type === 'init') {
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

		// まずプログラムを使用状態にする
		gl.useProgram(program);

		const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
		time = gl.getUniformLocation(program, 'time');
		resolution = gl.getUniformLocation(program, 'resolution');
		animationFlagUniformLocation = gl.getUniformLocation(program, 'animationFlag');
		gl.uniform1f(animationFlagUniformLocation, 0.0);
		currentAnimationFlag = 0;

		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

		const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

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

		// 初期状態は1回だけ描画
		drawOnce();

		self.postMessage({ type: 'initialized' });
	} else if (type === 'resize') {
		const { width, height } = e.data;
		if (!gl) {
			console.error('WebGL context not available');
			return;
		}

		// アニメーションをクリーンに停止
		stopAnimation();

		gl.canvas.width = width;
		gl.canvas.height = height;
		gl.viewport(0, 0, width, height);
		gl.useProgram(program);
		gl.uniform1f(animationFlagUniformLocation, 0);
		currentAnimationFlag = 0;

		// リサイズ後は1回だけ描画
		drawOnce();
	} else if (type === 'transition') {
		const { animationFlag } = e.data;
		if (!gl || !animationFlagUniformLocation) {
			console.error('WebGL context or uniform location not available');
			return;
		}

		if (import.meta.env.DEV) {
			console.log(`Transition request: ${animationFlag}, current status:`, getAnimationStatus());
		}

		gl.useProgram(program);
		gl.uniform1f(animationFlagUniformLocation, animationFlag);
		currentAnimationFlag = animationFlag;

		// 新しいトランジション開始時に時間をリセット
		currentTransitionStartTime = performance.now();

		if (animationFlag === 1) {
			// 出現アニメーション開始
			if (!isAnimating) {
				startAnimation(currentTransitionStartTime);
			}
		} else if (animationFlag === -1) {
			// 消失アニメーション開始
			if (!isAnimating) {
				startAnimation(currentTransitionStartTime);
			}
			// 遅延停止を設定（既存のタイマーは自動でキャンセルされる）
			stopAnimationDelay(1500);
		}
	} else if (type === 'stop') {
		// 強制停止用（必要に応じて）
		stopAnimation();
		currentAnimationFlag = 0;
		if (gl && animationFlagUniformLocation) {
			gl.useProgram(program);
			gl.uniform1f(animationFlagUniformLocation, 0);
			drawOnce();
		}
	} else if (type === 'status') {
		// デバッグ用: 現在のアニメーション状態を返す
		self.postMessage({
			type: 'status_response',
			status: getAnimationStatus()
		});
	}
};
