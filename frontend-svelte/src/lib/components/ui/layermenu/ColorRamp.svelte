<script lang="ts">
	import { onMount } from 'svelte';
	import fragmentShaderSource from '$lib/components/ui/layermenu/shader/fragment.frag';
	import vertexShaderSource from '$lib/components/ui/layermenu/shader/vertex.vert';
	let canvas: HTMLCanvasElement | null = null;
	export let colorMap: string;

	onMount(() => {
		function createShader(gl, type, source) {
			const shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
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
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				console.error('Program link error:', gl.getProgramInfoLog(program));
				return null;
			}
			return program;
		}

		const gl = canvas.getContext('webgl');

		if (!gl) {
			console.error('WebGL not supported');
		}

		// シェーダーの作成
		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
		const program = createProgram(gl, vertexShader, fragmentShader);

		// プログラムを使用
		gl.useProgram(program);

		// 頂点バッファを作成 (フルスクリーン四角形)
		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		// 頂点属性を有効化
		const positionLocation = gl.getAttribLocation(program, 'a_position');
		gl.enableVertexAttribArray(positionLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

		// キャンバスの高さをuniform変数に送信
		const uHeightLocation = gl.getUniformLocation(program, 'u_height');
		gl.uniform1f(uHeightLocation, canvas.height);

		// 描画
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// 三角形ストリップで描画
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	});
</script>

<canvas bind:this={canvas} class="h-[400px] w-[50px]"></canvas>

<style>
</style>
