<script lang="ts">
	import { onDestroy } from 'svelte';
	import { scale } from 'svelte/transition';

	import { isProcessing } from '$routes/stores/ui';

	const MIN_VISIBLE_MS = 500;

	let visible = $state(false);
	let shownAt = 0;
	let hideTimer: ReturnType<typeof setTimeout> | null = null;

	const clearHideTimer = () => {
		if (hideTimer === null) return;
		clearTimeout(hideTimer);
		hideTimer = null;
	};

	const unsubscribe = isProcessing.subscribe((value) => {
		if (value) {
			clearHideTimer();
			shownAt = Date.now();
			visible = true;
			return;
		}

		if (!visible) return;

		const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
		if (remaining === 0) {
			visible = false;
			return;
		}

		hideTimer = setTimeout(() => {
			visible = false;
			hideTimer = null;
		}, remaining);
	});

	onDestroy(() => {
		clearHideTimer();
		unsubscribe();
	});
</script>

{#if visible}
	<div class="fixed top-0 left-0 z-[9999] h-dvh w-full bg-black/50">
		<div class="flex h-full w-full items-center justify-center">
			<div class="loader" transition:scale={{ duration: 200 }}></div>
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
