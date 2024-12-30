<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';

	let path;

	onMount(() => {
		gsap.to(path, {
			duration: 1,
			attr: {
				d: 'M100 0 L180 180 L20 180 Z'
			},
			ease: 'power2.inOut'
		});
	});
</script>

<svg id="triangle" width="200" height="200" viewBox="0 0 200 200">
	<path bind:this={path} d="M100 90 L180 180 L20 180 Z" fill="#3E46FD" />
</svg>
