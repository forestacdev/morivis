<script lang="ts">
	import { isSide } from '$lib/store/store';
	import type { Side } from '$lib/types/ui';
	import Icon from '@iconify/svelte';

	const toggleMenu = (key: Side) => {
		if (key === $isSide) {
			isSide.set(null);
		} else {
			isSide.set(key);
		}
	};
</script>

<div class="absolute left-2 top-2 z-10 flex h-full w-[70px] flex-col gap-2 text-sm">
	<button
		on:click={() => toggleMenu('base')}
		class="bg-color-base grid h-[70px] w-full place-items-center rounded-md p-2"
		><Icon
			icon="material-symbols:map-outline"
			width="30"
			height="30"
			class="custom-side-button-active"
		/></button
	>
	<button
		on:click={() => toggleMenu('raster')}
		class="bg-color-base grid h-[70px] w-full place-items-center rounded-md p-2"
		><Icon icon="bx:layer" width="30" height="30" /></button
	>
	<button
		on:click={() => toggleMenu('vector')}
		class="bg-color-base grid h-[70px] w-full place-items-center rounded-md p-2"
		><Icon icon="bx:layer" width="30" height="30" /></button
	>
	<button
		on:click={() => toggleMenu('info')}
		class="bg-color-base grid h-[70px] w-full place-items-center rounded-md p-2"
		><Icon icon="bx:layer" width="30" height="30" /></button
	>
</div>

<style>
</style>
