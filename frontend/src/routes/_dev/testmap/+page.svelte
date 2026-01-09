<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';

	onMount(() => {
		// テスト用スタイル設定

		const initialStyle = {
			version: 8,
			sources: {
				// テスト1: アルファベット順vs初回出現順
				'z-source': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: 'Z-First'
				},
				'a-source': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: 'A-Second'
				},
				'm-source': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: 'M-Third'
				},
				// テスト2: 数字vs文字
				'num-source-1': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: '1-Number'
				},
				'num-source-2': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: '9-Number'
				},
				// テスト3: HTMLタグ vs プレーンテキスト (同じベース文字)
				'plain-x': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: 'X-Data'
				},
				'html-x': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: '<a href="https://x.com">X-Data</a>'
				},
				// テスト4: ケーススensitive
				'lower-case': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: 'b-lowercase'
				},
				'upper-case': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: 'B-UPPERCASE'
				},
				// テスト5: 記号・特殊文字
				'symbol-source': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: '©Symbol-First'
				},
				'space-source': {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] },
					attribution: ' Space-Start'
				}
			},
			layers: [
				{ id: 'z-layer', type: 'circle', source: 'z-source', paint: { 'circle-radius': 3 } },
				{ id: 'a-layer', type: 'circle', source: 'a-source', paint: { 'circle-radius': 3 } },
				{ id: 'm-layer', type: 'circle', source: 'm-source', paint: { 'circle-radius': 3 } },
				{
					id: 'num-layer-1',
					type: 'circle',
					source: 'num-source-1',
					paint: { 'circle-radius': 3 }
				},
				{
					id: 'num-layer-2',
					type: 'circle',
					source: 'num-source-2',
					paint: { 'circle-radius': 3 }
				},
				{ id: 'plain-x-layer', type: 'circle', source: 'plain-x', paint: { 'circle-radius': 3 } },
				{ id: 'html-x-layer', type: 'circle', source: 'html-x', paint: { 'circle-radius': 3 } },
				{ id: 'lower-layer', type: 'circle', source: 'lower-case', paint: { 'circle-radius': 3 } },
				{ id: 'upper-layer', type: 'circle', source: 'upper-case', paint: { 'circle-radius': 3 } },
				{
					id: 'symbol-layer',
					type: 'circle',
					source: 'symbol-source',
					paint: { 'circle-radius': 3 }
				},
				{ id: 'space-layer', type: 'circle', source: 'space-source', paint: { 'circle-radius': 3 } }
			]
		};

		// マップ初期化

		const map = new maplibregl.Map({
			container: 'map',
			style: initialStyle as any,
			center: [139.767052, 35.681167],
			zoom: 12
		});
	});
</script>

<div id="map" class="absolute top-0 h-dvh w-full"></div>
