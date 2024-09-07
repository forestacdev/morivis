<script lang="ts">
	import { onMount } from 'svelte';
	import { isSide } from '$lib/store/store';
	import type { Side } from '$lib/types/ui';
	import Icon from '@iconify/svelte';
	import Logo from '$lib/components/Logo.svelte';
	import gsap from 'gsap';

	const toggleMenu = (key: Side) => {
		if (key === $isSide) {
			isSide.set(null);
		} else {
			isSide.set(key);
		}
	};

	onMount(() => {
		// isSide.set('base');
	});
</script>

<Logo />
<div
	class="custom-side pointer-events-none absolute left-[0px] top-[80px] z-10 flex h-full flex-col gap-[20px] p-[6px] text-sm"
>
	<button on:click={() => toggleMenu('search')} class="btn-side"
		><Icon icon="lets-icons:search" width="30" height="30" class="" /></button
	>
	<button on:click={() => toggleMenu('layer')} class="btn-side"
		><Icon icon="bx:layer-plus" width="30" height="30" class="" /></button
	>
	<button on:click={() => toggleMenu('vector')} class="btn-side"
		><Icon icon="bxs:layer-plus" width="30" height="30" class="" /></button
	>
	<button on:click={() => toggleMenu('settings')} class="btn-side btn-side"
		><Icon
			icon="material-symbols-light:settings-outline"
			width="30"
			height="30"
			class=""
		/></button
	>
	<button on:click={() => toggleMenu('info')} class="btn-side"
		><Icon icon="material-symbols:info-outline" width="30" height="30" class="" /></button
	>
</div>

<style>
	/* .custom-side {
		background: rgb(41, 41, 41);
		background: linear-gradient(90deg, rgba(41, 41, 41, 1) 0%, rgba(255, 255, 255, 0) 100%);
	} */
	.btn-side {
		@apply pointer-events-auto grid h-[50px] w-[50px] place-items-center rounded-full bg-[#000000] bg-opacity-[0.5] p-2 text-white transition-all duration-200;
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
	}

	/* .btn-side:hover {
		@apply w-[190px] rotate-0 bg-opacity-100;
	} */
</style>
