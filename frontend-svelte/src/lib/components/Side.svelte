<script lang="ts">
	import { isSide } from '$lib/store/store';
	import type { Side } from '$lib/types/ui';
	import Icon from '@iconify/svelte';
	import Logo from '$lib/components/Logo.svelte';

	const toggleMenu = (key: Side) => {
		if (key === $isSide) {
			isSide.set(null);
		} else {
			isSide.set(key);
		}
	};
</script>

<Logo />
<div class="absolute left-[20px] top-[80px] z-10 flex flex-col gap-2 text-sm">
	<button on:click={() => toggleMenu('base')} class="btn-side"
		><Icon
			icon="material-symbols:map-outline"
			width="30"
			height="30"
			class="-rotate-45"
		/></button
	>
	<button on:click={() => toggleMenu('raster')} class="btn-side translate-x-[20px]"
		><Icon icon="bx:layer-plus" width="30" height="30" class="-rotate-45" /></button
	>
	<button on:click={() => toggleMenu('vector')} class="btn-side"
		><Icon icon="bxs:layer-plus" width="30" height="30" class="-rotate-45" /></button
	>
	<button on:click={() => toggleMenu('settings')} class="btn-side btn-side translate-x-[20px]"
		><Icon
			icon="material-symbols-light:settings-outline"
			width="30"
			height="30"
			class="-rotate-45"
		/></button
	>
	<button on:click={() => toggleMenu('info')} class="btn-side"
		><Icon
			icon="material-symbols:info-outline"
			width="30"
			height="30"
			class="-rotate-45"
		/></button
	>
</div>

<style>
</style>
