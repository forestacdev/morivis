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
	class="bg-main grid h-[50px] w-[50px] place-items-center rounded-full p-2"
>
	<Icon
		icon="fluent:video-360-20-regular"
		class="h-8 w-8 {$showStreetViewLayer ? 'text-accent' : 'text-base'}"
	/>
</button>

<style>
</style>
