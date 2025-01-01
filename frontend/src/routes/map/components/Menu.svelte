<script lang="ts">
	import gsap from 'gsap';
	import { onMount } from 'svelte';
	import { Icon } from 'svelte-hero-icons';

	import { isSide } from '$map/store';

	const toggleMenu = (key) => {
		console.log('key:', key);
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

<div class="pointer-events-none absolute z-10 w-[200px] bg-white p-2">
	<Icon src={ArrowUp} size="32" />
	<button class="w-full bg-gray-200 p-2 text-left" on:click={() => toggleMenu('base')}>あ</button>
</div>

<style>
</style>
