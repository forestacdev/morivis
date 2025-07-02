<script lang="ts">
	import Icon from '@iconify/svelte';
	import { gsap } from 'gsap';
	import { Draggable } from 'gsap/Draggable';
	import { onMount } from 'svelte';

	import { mapStore } from '$routes/stores/map';

	let container: HTMLElement;
	let value: number = $state(1);

	gsap.registerPlugin(Draggable);

	onMount(() => {
		if (!container) return;

		mapStore.onZoom((zoom) => {
			if (zoom) {
				value = zoom;
			}
		});
	});

	const setMapZoom = (e: Event) => {
		if (!e.target) return;
		const zoom = (e.target as HTMLInputElement).value;
		const map = mapStore.getMap();
		if (!map) return;
		map.setZoom(Number(zoom));
	};

	const zoomIn = () => {
		const map = mapStore.getMap();
		if (!map) return;
		map.zoomIn();
	};

	const zoomOut = () => {
		const map = mapStore.getMap();
		if (!map) return;
		map.zoomOut();
	};
</script>

<div
	bind:this={container}
	class="flex origin-center items-center justify-center gap-2 rounded-lg border-2 border-gray-500 px-[10px] py-4"
>
	<button onclick={zoomOut} class="grid place-items-center">
		<Icon icon="typcn:minus" class=" h-6 w-6 text-base" />
	</button>
	<button onclick={zoomIn} class="grid place-items-center">
		<Icon icon="typcn:plus" class="h-6 w-6  text-base" />
	</button>
</div>

<style>
</style>
