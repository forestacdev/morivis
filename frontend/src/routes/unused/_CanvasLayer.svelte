<script lang="ts">
	import Icon from '@iconify/svelte';
	import turfBbox from '@turf/bbox';
	import turfDissolve from '@turf/dissolve';
	import turfUnion from '@turf/union';
	import earcut from 'earcut'; // earcutをインポート
	import { set } from 'es-toolkit/compat';
	import type { FeatureCollection, Feature } from 'geojson';
	import type {
		CanvasSourceSpecification,
		CanvasSource,
		MapGeoJSONFeature,
		LngLatLike,
		LngLatBounds
	} from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onMount } from 'svelte';

	import fragmentShaderSource from '$routes/CanvasLayer/shader/fragment.glsl?raw';
	import vertexShaderSource from '$routes/CanvasLayer/shader/vertex.glsl?raw';
	import { selectedHighlightData, type SelectedHighlightData } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import { convertToGeoJSONCollection } from '$routes/utils/geojson';

	let element = $state<HTMLCanvasElement | null>(null);
	let { canvasSource = $bindable() }: { canvasSource: CanvasSourceSpecification } = $props();
	let vertices = [];
	let indices = [];
	let resolution = [];
	let geojson = $state<FeatureCollection | null>(null);
	let color: [number, number, number, number] = [0.0, 1.0, 0.0, 0.5];

	onMount(() => {
		if (!element) return;

		const gl: WebGL2RenderingContext | null = element.getContext('webgl2', { alpha: true });
		if (!gl) {
			console.error('WebGL2 is not supported');
			return;
		}

		let startTime = performance.now(); // アニメーション開始時間

		const initializeWebGL = (): void => {
			gl.viewport(0, 0, element!.width, element!.height);
			gl.clearColor(0.0, 0.0, 0.0, 0.0); // 透明な背景
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		};

		const createPolygonBuffer = (vertices: number[]): WebGLBuffer | null => {
			const buffer = gl.createBuffer();
			if (!buffer) {
				console.error('Failed to create buffer');
				return null;
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			return buffer;
		};

		const drawPolygon = (
			vertices: number[],
			indices: number[],
			resolution: number[],
			color: [number, number, number, number]
		): void => {
			const vertexBuffer = createPolygonBuffer(vertices);
			if (!vertexBuffer) return;

			const createShader = (type: number, source: string): WebGLShader | null => {
				const shader = gl.createShader(type);
				if (!shader) {
					console.error('Failed to create shader');
					return null;
				}
				gl.shaderSource(shader, source);
				gl.compileShader(shader);

				if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
					console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
					gl.deleteShader(shader);
					return null;
				}
				return shader;
			};

			const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
			const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
			if (!vertexShader || !fragmentShader) return;

			const program = gl.createProgram();
			if (!program) {
				console.error('Failed to create program');
				return;
			}

			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.linkProgram(program);

			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				console.error('Program link error:', gl.getProgramInfoLog(program));
				gl.deleteProgram(program);
				return;
			}

			gl.useProgram(program);

			const positionLocation = gl.getAttribLocation(program, 'a_position');
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

			const colorLocation = gl.getUniformLocation(program, 'u_color');
			gl.uniform4f(colorLocation, ...color);

			const timeLocation = gl.getUniformLocation(program, 'u_time');
			gl.uniform1f(timeLocation, (performance.now() - startTime) / 1000);

			// 解像度を渡す
			const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
			gl.uniform2f(resolutionLocation, resolution[0], resolution[1]);

			const indexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

			gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
		};

		const resetAndDrawPolygon = (_geojson: FeatureCollection): void => {
			console.log('resetAndDrawPolygon');
			const map = mapStore.getMap();
			if (!map) return;

			const bbox = turfBbox(_geojson);
			const west = bbox[0];
			const south = bbox[1];
			const east = bbox[2];
			const north = bbox[3];

			const lngSpan = east - west; // 経度の幅
			const latSpan = north - south; // 緯度の幅

			// 座標変換関数
			const normalize = (lng: number, lat: number): [number, number] => {
				const x = ((lng - west) / lngSpan) * 2 - 1; // -1 ~ 1 に変換
				const y = ((lat - south) / latSpan) * 2 - 1; // -1 ~ 1 に変換
				return [x, y];
			};

			console.log('geojson', _geojson);
			const geometry = _geojson.features[0].geometry;

			if (geometry.type === 'Polygon') {
				// 頂点データを生成
				const coordinates = geometry.coordinates;

				vertices = coordinates[0].map(([lng, lat]) => normalize(lng, lat)).flat();
				// // Earcutを使用してトライアングレーション
				indices = earcut(vertices);

				const xValues = vertices.filter((_, i) => i % 2 === 0); // x座標だけ抽出
				const yValues = vertices.filter((_, i) => i % 2 === 1); // y座標だけ抽出

				const minX = Math.min(...xValues);
				const maxX = Math.max(...xValues);
				const minY = Math.min(...yValues);
				const maxY = Math.max(...yValues);

				const width = maxX - minX;
				const height = maxY - minY;
				const resolution = [width, height];
				// const vertices = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];

				// キャンバスをクリア
				gl.clear(gl.COLOR_BUFFER_BIT);

				// // 多角形を描画
				drawPolygon(vertices, indices, resolution, color); // 半透明の緑色
			}
		};

		const animation = () => {
			requestAnimationFrame(animation);
			gl.clear(gl.COLOR_BUFFER_BIT);
			drawPolygon(vertices, indices, resolution, color);
		};

		initializeWebGL();
		animation();

		const setHighlightData = (_selectedHighlightData: SelectedHighlightData) => {
			const map = mapStore.getMap();
			if (!map) return;

			const features = map.queryRenderedFeatures({
				layers: [_selectedHighlightData.layerEntry.id]
			});

			if (!features || features.length === 0) return;

			const data = convertToGeoJSONCollection(features, _selectedHighlightData.featureId as number);

			if (data.features.length === 0) return;

			if (data.features.length > 1) {
				geojson = turfDissolve(data);
			} else {
				geojson = data;
			}
		};

		selectedHighlightData.subscribe((_selectedHighlightData) => {
			if (!_selectedHighlightData) return;
			setHighlightData(_selectedHighlightData);
		});

		// Mapboxイベントに基づいて多角形を更新
		mapStore.onMooveEnd((e) => {
			if (!$selectedHighlightData) return;
			setHighlightData($selectedHighlightData);
		});

		$effect(() => {
			if (!geojson) return;
			const bbox = turfBbox(geojson);

			const coordinates = [
				[bbox[0], bbox[3]],
				[bbox[2], bbox[3]],
				[bbox[2], bbox[1]],
				[bbox[0], bbox[1]]
			];

			canvasSource = {
				type: 'canvas',
				canvas: 'canvas-layer',
				coordinates: coordinates as CanvasSource['coordinates']
			};
			const map = mapStore.getMap();
			if (!map) return;
			const mySource = map.getSource('canvasSource') as CanvasSource;
			mySource.setCoordinates(coordinates as CanvasSource['coordinates']);
			resetAndDrawPolygon(geojson);
		});
	});
</script>

<canvas class="hidden" bind:this={element} id="canvas-layer" width="1000" height="1000"
	>Canvas not supported</canvas
>

<style>
</style>
