<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import { showStreetViewLayer } from '$routes/store/layers';

	const toggleLayer = () => {
		showStreetViewLayer.set(!$showStreetViewLayer);
	};

	let element = $state<HTMLButtonElement | null>(null);

	onMount(() => {
		if (!element) return;
	});
</script>

<button
	bind:this={element}
	onclick={toggleLayer}
	class="pointer-events-auto grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center p-2"
>
	<Icon
		icon="fa6-solid:street-view"
		class="h-7 w-7 {$showStreetViewLayer ? 'text-accent' : 'text-base'}"
	/>
</button>

<style>
</style>
