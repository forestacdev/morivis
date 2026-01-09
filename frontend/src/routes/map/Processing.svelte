<script lang="ts">
	import { isProcessing } from '$routes/stores/ui';

	let container = $state<HTMLElement | null>(null);
</script>

{#if $isProcessing}
	<div bind:this={container} class="fixed top-0 left-0 z-[9999] h-dvh w-full bg-black/50">
		<div class="flex h-full w-full items-center justify-center">
			<div class="loader"></div>
		</div>
	</div>
{/if}

<style>
	.loader {
		border: 8px solid #f3f3f3; /* Light grey */
		border-top: 8px solid var(--color-accent); /* Blue */
		border-radius: 50%;
		width: 100px;
		height: 100px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
