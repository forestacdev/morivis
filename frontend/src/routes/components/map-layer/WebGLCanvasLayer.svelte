<script lang="ts">
	import Icon from '@iconify/svelte';
	import turfBbox from '@turf/bbox';
	import turfDissolve from '@turf/dissolve';
	import turfUnion from '@turf/union';
	import earcut from 'earcut'; // earcutをインポート
	import { set } from 'es-toolkit/compat';
	import type { FeatureCollection, Feature } from 'geojson';
	import { mat4 } from 'gl-matrix';
	import type {
		CanvasSourceSpecification,
		CanvasSource,
		MapGeoJSONFeature,
		LngLatLike,
		LngLatBounds,
		Map as MapLibreMap
	} from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onMount } from 'svelte';

	import fragmentShaderSource from './shader/fragment.glsl?raw';
	import vertexShaderSource from './shader/vertex.glsl?raw';

	import { selectedHighlightData, type SelectedHighlightData } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import { convertToGeoJSONCollection } from '$routes/utils/geojson';

	interface Props {
		map: MapLibreMap | null;
		canvasSource: CanvasSourceSpecification | null;
	}

	let element = $state<HTMLCanvasElement | null>(null);
	let { map, canvasSource = $bindable() }: Props = $props();

	const setCanvas = (_map: MapLibreMap) => {
		const bbox = _map.getBounds();
		const boxArray = [bbox._sw.lng, bbox._sw.lat, bbox._ne.lng, bbox._ne.lat];

		const coordinates = [
			[bbox._sw.lng, bbox._ne.lat],
			[bbox._ne.lng, bbox._ne.lat],
			[bbox._ne.lng, bbox._sw.lat],
			[bbox._sw.lng, bbox._sw.lat]
		];

		canvasSource = {
			type: 'canvas',
			canvas: 'canvas-layer',
			coordinates: coordinates as CanvasSource['coordinates']
		};

		const mySource = _map.getSource('webgl_canvas') as CanvasSource;
		mySource.setCoordinates(coordinates as CanvasSource['coordinates']);
	};

	onMount(() => {
		if (!element) return;
		if (!map) return;

		const gl: WebGL2RenderingContext | null = element.getContext('webgl2', { alpha: true });
		if (!gl) {
			console.error('WebGL2 is not supported');
			return;
		}

		let startTime = performance.now(); // アニメーション開始時間

		function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
			const shader = gl.createShader(type)!;
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw new Error(gl.getShaderInfoLog(shader)!);
			}
			return shader;
		}

		function createProgram(
			gl: WebGLRenderingContext,
			vShader: WebGLShader,
			fShader: WebGLShader
		): WebGLProgram {
			const program = gl.createProgram()!;
			gl.attachShader(program, vShader);
			gl.attachShader(program, fShader);
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				throw new Error(gl.getProgramInfoLog(program)!);
			}
			return program;
		}

		async function main() {
			if (!gl) throw new Error('WebGL not supported');

			const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
			const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
			const program = createProgram(gl, vertexShader, fragmentShader);
			gl.useProgram(program);
			const positionBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			const positions = new Float32Array([0, 0, 4096, 0, 0, 4096, 0, 4096, 4096, 0, 4096, 4096]);
			gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
			const positionLocation = gl.getAttribLocation(program, 'a_position');
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

			const texture = gl.createTexture();
			const image = new Image();
			image.crossOrigin = 'anonymous';
			image.src = 'https://cyberjapandata.gsi.go.jp/xyz/std/16/58200/25803.png';
			await image.decode();

			gl.activeTexture(gl.TEXTURE0); // 現在のテクスチャユニットをアクティブ
			gl.bindTexture(gl.TEXTURE_2D, texture);

			const location = gl.getUniformLocation(program, 'u_tile_tex');
			gl.uniform1i(location, 0);

			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

			// ラッピングとフィルタリングの設定
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

			// スクリーン変換用マトリクス（簡単に中央に描画）
			const uMatrix = gl.getUniformLocation(program, 'u_matrix');
			const matrix = mat4.create();
			mat4.ortho(matrix, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
			gl.uniformMatrix4fv(uMatrix, false, matrix);

			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}

		main().catch((error) => {
			console.error('Error initializing WebGL:', error);
		});

		map.on('moveend', () => {
			if (!map) return;
			setCanvas(map);
		});
	});

	$effect(() => {
		if (!map) return;
		setCanvas(map);
	});
</script>

<canvas class="hidden" bind:this={element} id="canvas-layer" width="1000" height="1000"
	>Canvas not supported</canvas
>

<style>
</style>
