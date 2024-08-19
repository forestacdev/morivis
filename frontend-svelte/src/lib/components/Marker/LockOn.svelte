<script setup lang="ts">
	// export let lngLat: [number, number];	import { createEventDispatcher } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	const handleButtonClick = (event) => {
		event.stopPropagation(); // クリックイベントの伝播を止める
		dispatch('click', event);
	};
</script>

<button on:click={handleButtonClick} class="custom-anime relative flex max-w-md flex-col gap-4 p-3">
	<Icon icon="f7:scope" width="50" height="50" class="custom-anime" />
</button>

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
