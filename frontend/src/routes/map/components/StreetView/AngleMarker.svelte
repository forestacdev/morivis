<script lang="ts">
	import { onMount } from 'svelte';

	let { cameraBearing }: { cameraBearing: number } = $props();

	onMount(() => {});

	// $: console.log(makerPosition, cameraBearing);
</script>

<div class="pointer-events-none z-50 flex h-[100px] w-[100px]">
	<div class="custom-marker"></div>
</div>

<style>
	.custom-marker {
		width: 50px;
		height: 50px;
		rotate: 45deg;
		transform-origin: bottom right;
		background: rgb(255, 255, 255);
		background: linear-gradient(315deg, rgb(205, 223, 2) 0%, rgba(0, 250, 245, 0) 100%);
		border-top-left-radius: 50px;
	}
</style>
