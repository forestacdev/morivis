<script lang="ts">
	import gsap from 'gsap';
	import { onMount } from 'svelte';

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

<div
	class="custom-side pointer-events-none absolute left-[0px] top-[80px] z-50 flex h-full flex-col gap-[20px] p-[6px] text-sm"
></div>

<style>
</style>
