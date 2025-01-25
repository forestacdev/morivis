<script lang="ts">
	import { GeolocateControl } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { mapStore } from '$map/store/map';

	let controlContainer: HTMLDivElement;

	onMount(() => {
		mapStore.onInitialized((map) => {
			if (map) {
				// 現在位置表示コントロール
				const geolocateControl = new GeolocateControl({
					positionOptions: {
						enableHighAccuracy: true
					},
					fitBoundsOptions: { maxZoom: 12 },
					trackUserLocation: true,
					showUserLocation: true
				});
				controlContainer.appendChild(geolocateControl.onAdd(map));
			}
		});
	});
</script>

<div class="absolute right-2 top-2" bind:this={controlContainer}></div>

<style>
</style>
