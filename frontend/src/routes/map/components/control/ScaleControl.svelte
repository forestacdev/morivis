<script lang="ts">
	import { ScaleControl } from 'maplibre-gl';
	import type { Map } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { mapStore } from '$map/store/map';

	let controlContainer: HTMLDivElement;

	onMount(() => {
		const map = mapStore.getMap();
		if (map) {
			// スケールバーのコントロールを作成
			const scaleControl = new ScaleControl({
				maxWidth: 100,
				unit: 'metric'
			});

			// スケールバーのコントロールをマップに追加
			controlContainer.appendChild(scaleControl.onAdd(map));
		}
	});
</script>

<div class="absolute bottom-2 left-2" bind:this={controlContainer}></div>

<style>
</style>
