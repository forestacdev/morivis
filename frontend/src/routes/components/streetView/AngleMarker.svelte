<script lang="ts">
	import { Marker } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import { isStreetView } from '$routes/store';

	interface Props {
		cameraBearing: number;
		angleMarker: Marker | null;
	}

	let { cameraBearing, angleMarker }: Props = $props();

	onMount(() => {});
</script>

<div class="c-player-marker z-50 grid scale-75 place-items-center">
	<svg xmlns="http://www.w3.org/2000/svg" width="73" height="73" fill="none"
		><path fill="#333" d="M36.5 2 59 64 36.5 50.5 14 64 36.5 2Z" /><path
			stroke="#333"
			d="M36.5 2 59 64 36.5 50.5 14 64 36.5 2Z"
		/></svg
	>
</div>

<style>
	/* カメラ角度マーカー */
	/* 現在地マーカー*/
	:root {
		--primary-color: #f6fe00;
	}
	.c-player-marker > svg {
		transform-origin: center;
		filter: drop-shadow(0 0 5px var(--primary-color));
	}
	.c-player-marker > svg > path {
		fill: var(--primary-color);
	}
</style>
