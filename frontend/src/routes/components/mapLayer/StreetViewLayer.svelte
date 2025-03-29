<script module lang="ts">
	export const streetViewSources = {
		street_view_sources: {
			type: 'vector',
			url: 'pmtiles://./streetView/THETA360.pmtiles'
		}
	};
	export const streetViewLineLayer = {
		// ストリートビューのライン
		id: '@street_view_line_layer',
		type: 'line',
		source: 'street_view_sources',
		'source-layer': 'THETA360_line',
		paint: {
			'line-color': '#08fa00',
			'line-width': 10,
			'line-opacity': 0.5,
			'line-blur': 0.5
		},
		layout: {
			visibility: 'none',
			'line-cap': 'round',
			'line-join': 'round'
		}
	};

	export const streetViewCircleLayer = {
		// ストリートビューのポイント
		id: '@street_view_circle_layer',
		type: 'circle',
		source: 'street_view_sources',
		'source-layer': 'THETA360',
		minzoom: 15,
		layout: {
			visibility: 'none'
		},
		paint: {
			'circle-color': [
				'case',
				['boolean', ['feature-state', 'hover'], false],
				'#00fad0', // ホバー中
				'#08fa00' // 通常時
			],
			'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 20, 12],
			'circle-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.8, 0.6],
			'circle-stroke-width': 2,
			'circle-stroke-color': '#ffffff',
			'circle-stroke-opacity': 0.5,
			'circle-blur': 0.3
		}
	};
</script>

<script lang="ts">
	import type { MapMouseEvent, MapLayerMouseEvent } from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { onDestroy } from 'svelte';

	import { isStreetView, showStreetViewLayer } from '$routes/store';
	import { mapStore } from '$routes/store/map';

	interface Props {
		map: maplibregl.Map;
	}

	let { map }: Props = $props();

	mapStore.onInitialized((map) => {});

	let hoveredId: number | null = null;

	const onMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
		if (!e.features || e.features.length === 0) return;

		// 前のhoverをリセット
		if (hoveredId !== null) {
			map.setFeatureState(
				{ source: 'street_view_sources', sourceLayer: 'THETA360', id: hoveredId },
				{ hover: false }
			);
		}

		hoveredId = e.features[0].id as number;
		map.setFeatureState(
			{ source: 'street_view_sources', sourceLayer: 'THETA360', id: hoveredId },
			{ hover: true }
		);
		map.getCanvas().style.cursor = 'pointer';
	};

	const onMouseLeave = () => {
		if (hoveredId !== null) {
			map.setFeatureState(
				{ source: 'street_view_sources', sourceLayer: 'THETA360', id: hoveredId },
				{ hover: false }
			);
			hoveredId = null;
		}
		map.getCanvas().style.cursor = '';
	};

	showStreetViewLayer.subscribe((value) => {
		if (!map.getLayer('@street_view_line_layer') || !map.getLayer('@street_view_circle_layer'))
			return;
		if (value) {
			map.setLayoutProperty('@street_view_line_layer', 'visibility', 'visible');
			map.setLayoutProperty('@street_view_circle_layer', 'visibility', 'visible');
			// 登録
			map.on('mousemove', '@street_view_circle_layer', onMouseMove);
			map.on('mouseleave', '@street_view_circle_layer', onMouseLeave);
		} else {
			map.setLayoutProperty('@street_view_line_layer', 'visibility', 'none');
			map.setLayoutProperty('@street_view_circle_layer', 'visibility', 'none');

			// 解除
			map.off('mousemove', '@street_view_circle_layer', onMouseMove);
			map.off('mouseleave', '@street_view_circle_layer', onMouseLeave);
		}
	});

	onDestroy(() => {
		const map = mapStore.getMap();
		if (!map) return;
	});
</script>

<div></div>

<style>
</style>
