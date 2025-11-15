<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { onDestroy } from 'svelte';

	import { showStreetViewLayer } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		map: maplibregl.Map;
	}

	let { map }: Props = $props();

	mapStore.onInitialized((map) => {});

	let hoveredId: number | null = null;

	const onMouseMove = (e: maplibregl.MapLayerMouseEvent, sourceLayer: string) => {
		if (!e.features || e.features.length === 0) return;

		// 前のhoverをリセット
		if (hoveredId !== null) {
			map.setFeatureState(
				{ source: 'street_view_sources', sourceLayer: sourceLayer, id: hoveredId },
				{ hover: false }
			);
		}

		hoveredId = e.features[0].id as number;
		map.setFeatureState(
			{ source: 'street_view_sources', sourceLayer: sourceLayer, id: hoveredId },
			{ hover: true }
		);
		map.getCanvas().style.cursor = 'pointer';
	};

	const onMouseLeave = (sourceLayer: string) => {
		if (hoveredId !== null) {
			map.setFeatureState(
				{ source: 'street_view_sources', sourceLayer: sourceLayer, id: hoveredId },
				{ hover: false }
			);
			hoveredId = null;
		}
		map.getCanvas().style.cursor = '';
	};

	showStreetViewLayer.subscribe((value) => {
		if (value) {
			// 登録
			map.on('mousemove', '@street_view_line_layer', (e) => onMouseMove(e, 'THETA360_line'));
			map.on('mouseleave', '@street_view_line_layer', (_e) => onMouseLeave('THETA360_line'));

			map.on('mousemove', '@street_view_circle_layer', (e) => onMouseMove(e, 'THETA360'));
			map.on('mouseleave', '@street_view_circle_layer', (_e) => onMouseLeave('THETA360'));
		} else {
			// 解除
			map.off('mousemove', '@street_view_line_layer', (e) => onMouseMove(e, 'THETA360_line'));
			map.off('mouseleave', '@street_view_line_layer', (_e) => onMouseLeave('THETA360_line'));

			map.off('mousemove', '@street_view_circle_layer', (e) => onMouseMove(e, 'THETA360'));
			map.off('mouseleave', '@street_view_circle_layer', (_e) => onMouseLeave('THETA360'));
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
