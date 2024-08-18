<script setup lang="ts">
	// export let lngLat: [number, number];
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		console.log('lock-on');
	});
</script>

<div class="custom-anime relative flex max-w-md flex-col gap-4 p-3">
	<Icon icon="f7:scope" width="50" height="50" class="custom-anime" />
</div>

<style>
	.custom-anime {
		animation:
			rotate 8s infinite linear,
			in 0.3s both ease-in-out;
	}

	@keyframes rotate {
		0% {
			rotate: 0;
		}
		100% {
			rotate: 360deg;
		}
	}

	@keyframes in {
		0% {
			opacity: 0;
			scale: 2;
		}
		100% {
			opacity: 1;
			scale: 1;
		}
	}
</style>
