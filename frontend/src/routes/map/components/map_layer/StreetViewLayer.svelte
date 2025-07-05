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
		if (value) {
			// 登録
			map.on('mousemove', '@street_view_circle_layer', onMouseMove);
			map.on('mouseleave', '@street_view_circle_layer', onMouseLeave);
		} else {
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
