<script lang="ts">
	import Icon from '@iconify/svelte';

	import { onMount } from 'svelte';

	import { isTerrain3d } from '$routes/stores/map';

	const toggle3d = (e: any) => {
		isTerrain3d.set(!$isTerrain3d);
	};

	let element = $state<HTMLButtonElement | null>(null);
	// let rotation = $state<number>(0);

	onMount(() => {
		if (!element) return;
	});
</script>

<button
	bind:this={element}
	onclick={toggle3d}
	class="pointer-events-auto grid shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
>
	<Icon icon={'ic:round-terrain'} class="h-10 w-10 {$isTerrain3d ? 'text-accent' : 'text-base'}" />
</button>

<style>
</style>
