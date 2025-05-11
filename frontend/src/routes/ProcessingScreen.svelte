<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import { isProcessing } from '$routes/store/ui';

	let container = $state<HTMLElement | null>(null);

	onMount(async () => {});
</script>

{#if $isProcessing}
	<div bind:this={container} transition:fade={{ duration: 200 }} class="c-loading">
		<div class="spinner"></div>
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
		background-color: rgb(52, 52, 52, 0.7);
	}

	.spinner {
		width: 100px;
		height: 100px;
		border: 5px solid #f3f3f3; /* Light grey */
		border-top: 5px solid var(--color-accent); /* Blue */
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
</style>
