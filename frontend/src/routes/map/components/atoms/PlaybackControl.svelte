<script lang="ts">
	import { onDestroy } from 'svelte';
	import { slide } from 'svelte/transition';

	import RangeSlider from './RangeSlider.svelte';

	interface Props {
		disabled?: boolean;
		playbackSpeed?: number;
		onTick?: () => void | Promise<void>;
	}

	let { disabled = false, playbackSpeed = $bindable(1200), onTick }: Props = $props();

	let isPlaying = $state(false);
	let autoplayTimeout: ReturnType<typeof setTimeout> | null = null;
	const playbackIntervalMs = $derived(2001 - playbackSpeed);

	const clearAutoplayTimer = () => {
		if (autoplayTimeout) {
			clearTimeout(autoplayTimeout);
			autoplayTimeout = null;
		}
	};

	const stopPlayback = () => {
		clearAutoplayTimer();
		isPlaying = false;
	};

	const scheduleAutoplayTick = () => {
		clearAutoplayTimer();
		if (!isPlaying || disabled) return;

		autoplayTimeout = setTimeout(async () => {
			if (!isPlaying || disabled) return;
			await onTick?.();
			scheduleAutoplayTick();
		}, playbackIntervalMs);
	};

	const togglePlayback = () => {
		if (disabled) return;
		if (isPlaying) {
			stopPlayback();
			return;
		}
		isPlaying = true;
		scheduleAutoplayTick();
	};

	$effect(() => {
		if (!isPlaying) return;
		scheduleAutoplayTick();
	});

	$effect(() => {
		if (disabled && isPlaying) {
			stopPlayback();
		}
	});

	onDestroy(() => {
		clearAutoplayTimer();
	});
</script>

<div class="flex items-center justify-center gap-2">
	<button
		type="button"
		class="bg-sub flex w-[30px] aspect-square cursor-pointer items-center justify-center gap-1 rounded-full p-1 text-sm text-white select-none hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
		aria-label={isPlaying ? '停止' : '再生'}
		{disabled}
		onclick={togglePlayback}
	>
		{#if isPlaying}
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
				<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
			</svg>
			
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
				<path fill="currentColor" d="M8 5v14l11-7z" />
			</svg>
			
		{/if}
	</button>
</div>

{#if isPlaying}
	<div transition:slide class="pt-2">
		<RangeSlider
			label={`再生速度 (${Math.round((1000 / playbackIntervalMs) * 10) / 10} コマ/秒)`}
			bind:value={playbackSpeed}
			min={1}
			max={2000}
			step={1}
		/>
	</div>
{/if}
