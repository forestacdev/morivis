<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import { showStreetViewLayer } from '$routes/store';

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
	class="grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center p-2"
>
	<Icon
		icon="fluent:video-360-20-regular"
		class="h-8 w-8 {$showStreetViewLayer ? 'text-accent' : 'text-base'}"
	/>
</button>

<style>
</style>
