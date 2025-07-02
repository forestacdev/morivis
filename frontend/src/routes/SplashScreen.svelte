<script lang="ts">
	import { delay } from 'es-toolkit';
	import { map } from 'es-toolkit/compat';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import { mapStore } from './stores/map';

	let show = $state<boolean>(false);
	let container = $state<HTMLElement | null>(null);

	onMount(async () => {
		await delay(1500); // 2秒待機

		// ローディングを非表示にする
		mapStore.onInitialized((map) => {
			if (map) {
				map.on('load', () => {
					map.resize();
					show = false;
				});
			} else {
				map.resize();
				show = false;
			}
		});
	});
</script>

{#if show}
	<div bind:this={container} transition:fade={{ duration: 300 }} class="c-loading">
		<div class="spinner"></div>
		<enhanced:img
			src="$lib/assets/2001.svg"
			alt="Logo"
			class="absolute left-0 top-0 h-full w-full"
		/>
	</div>
{/if}

<style>
	/* ローディング */
	.c-loading {
		z-index: 9999;
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgb(52, 52, 52);
	}

	.spinner {
		width: 50px;
		height: 50px;
		border: 5px solid #f3f3f3; /* Light grey */
		border-top: 5px solid #3498db; /* Blue */
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
</style>
