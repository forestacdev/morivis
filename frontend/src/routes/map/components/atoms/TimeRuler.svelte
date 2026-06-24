<script lang="ts">
	import { onMount } from 'svelte';

	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import type { SharedDiscreteDimension } from '$routes/map/data/types';

	interface Props {
		dimension: SharedDiscreteDimension;
		currentIndex: number;
		disabled?: boolean;
		showPlayback?: boolean;
		playbackSpeed?: number;
		onCommit?: (index: number) => void | Promise<void>;
	}

	let {
		dimension,
		currentIndex,
		disabled = false,
		showPlayback = false,
		playbackSpeed = $bindable(1200),
		onCommit
	}: Props = $props();

	const tickSpacingPx = 18;
	const shortTickHeight = 14;
	const mediumTickHeight = 22;
	const longTickHeight = 34;
	const dragThresholdPx = 4;

	let viewportElement: HTMLDivElement | undefined = $state();
	let viewportWidth = $state(0);
	let dragOffsetPx = $state(0);
	let isPlaying = $state(false);
	let autoplayTimeout: ReturnType<typeof setTimeout> | null = null;
	let activePointerId: number | null = null;
	let activeTouchId: number | null = null;
	let pointerStartX = 0;
	let pointerStartOffsetPx = 0;

	const playbackIntervalMs = $derived(2001 - playbackSpeed);
	const previewIndex = $derived.by(() => {
		const rawIndex = currentIndex - dragOffsetPx / tickSpacingPx;
		return clamp(Math.round(rawIndex), 0, Math.max(dimension.values.length - 1, 0));
	});
	const currentLabel = $derived(
		dimension.labels?.[previewIndex] ?? formatTimeValue(dimension.values[previewIndex] ?? '')
	);
	const centerX = $derived(viewportWidth / 2);
	const visibleRadius = $derived(Math.max(Math.ceil(viewportWidth / tickSpacingPx / 2) + 6, 12));
	const visibleIndices = $derived.by(() => {
		const start = Math.max(previewIndex - visibleRadius, 0);
		const end = Math.min(previewIndex + visibleRadius, Math.max(dimension.values.length - 1, 0));
		return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
	});

	const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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

	const isMajorTick = (index: number) => {
		if (dimension.type !== 'time') return index % 5 === 0;
		if (dimension.values.length > 720) return index % 60 === 0;
		if (dimension.values.length > 240) return index % 30 === 0;
		if (dimension.values.length > 120) return index % 10 === 0;
		if (dimension.values.length > 48) return index % 5 === 0;
		return index % 2 === 0;
	};

	const isMediumTick = (index: number) => {
		if (isMajorTick(index)) return false;
		if (dimension.values.length > 240) return index % 10 === 0;
		if (dimension.values.length > 120) return index % 5 === 0;
		return index % 1 === 0;
	};

	const getTickHeight = (index: number) => {
		if (isMajorTick(index)) return longTickHeight;
		if (isMediumTick(index)) return mediumTickHeight;
		return shortTickHeight;
	};

	const getTickX = (index: number) => centerX + (index - currentIndex) * tickSpacingPx + dragOffsetPx;

	const formatTimeValue = (value: string): string => {
		if (/^\d{4}$/.test(value)) return `${Number(value)}年`;
		const ym = value.match(/^(\d{4})-(\d{2})$/);
		if (ym) return `${Number(ym[1])}年${Number(ym[2])}月`;
		const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (ymd) return `${Number(ymd[1])}年${Number(ymd[2])}月${Number(ymd[3])}日`;

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;

		const y = date.getUTCFullYear();
		const m = date.getUTCMonth() + 1;
		const d = date.getUTCDate();
		const h = date.getUTCHours();
		const min = date.getUTCMinutes();

		if (h === 0 && min === 0) {
			return d === 1 ? `${y}年${m}月` : `${y}年${m}月${d}日`;
		}

		return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
	};

	const getTickLabel = (index: number) =>
		dimension.labels?.[index] ?? formatTimeValue(dimension.values[index] ?? '');

	const commitIndex = async (index: number) => {
		const clampedIndex = clamp(index, 0, Math.max(dimension.values.length - 1, 0));
		dragOffsetPx = 0;
		await onCommit?.(clampedIndex);
	};

	const beginDrag = (clientX: number) => {
		pointerStartX = clientX;
		pointerStartOffsetPx = dragOffsetPx;
	};

	const updateDrag = (clientX: number) => {
		const deltaX = clientX - pointerStartX;
		if (Math.abs(deltaX) < dragThresholdPx) return;
		dragOffsetPx = pointerStartOffsetPx + deltaX;
	};

	const handlePointerDown = (event: PointerEvent) => {
		if (disabled) return;
		activePointerId = event.pointerId;
		beginDrag(event.clientX);
		viewportElement?.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: PointerEvent) => {
		if (activePointerId !== event.pointerId) return;
		updateDrag(event.clientX);
	};

	const handlePointerEnd = async (event: PointerEvent) => {
		if (activePointerId !== event.pointerId) return;
		const nextIndex = previewIndex;
		activePointerId = null;
		viewportElement?.releasePointerCapture(event.pointerId);
		await commitIndex(nextIndex);
	};

	const handleTouchStart = (event: TouchEvent) => {
		if (disabled) return;
		const touch = event.changedTouches[0];
		if (!touch) return;
		activeTouchId = touch.identifier;
		beginDrag(touch.clientX);
	};

	const handleTouchMove = (event: TouchEvent) => {
		if (activeTouchId == null) return;
		const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeTouchId)
			?? Array.from(event.touches).find((item) => item.identifier === activeTouchId);
		if (!touch) return;
		event.preventDefault();
		updateDrag(touch.clientX);
	};

	const handleTouchEnd = async (event: TouchEvent) => {
		if (activeTouchId == null) return;
		const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeTouchId);
		if (!touch) return;
		activeTouchId = null;
		await commitIndex(previewIndex);
	};

	const stepIndex = async (delta: number) => {
		if (disabled) return;
		await commitIndex(currentIndex + delta);
	};

	const scheduleAutoplayTick = () => {
		clearAutoplayTimer();
		if (!isPlaying || disabled) return;

		autoplayTimeout = setTimeout(async () => {
			if (!isPlaying || disabled) return;
			const nextIndex = currentIndex >= dimension.values.length - 1 ? 0 : currentIndex + 1;
			await commitIndex(nextIndex);
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
		if (!showPlayback || !isPlaying) return;
		scheduleAutoplayTick();
	});

	$effect(() => {
		if (disabled && isPlaying) {
			stopPlayback();
		}
	});

	onMount(() => {
		if (!viewportElement) return;

		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			viewportWidth = entry.contentRect.width;
		});

		resizeObserver.observe(viewportElement);

		return () => {
			resizeObserver.disconnect();
			clearAutoplayTimer();
		};
	});
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<button
			type="button"
			class="bg-main/70 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="前へ"
			{disabled}
			onclick={() => stepIndex(-1)}
		>
			‹
		</button>
		<div class="min-w-0 px-3 text-center">
			<div class="text-xs text-white/60">{dimension.placeholder ?? '時間'}</div>
			<div class="truncate text-sm text-white">{currentLabel}</div>
		</div>
		<button
			type="button"
			class="bg-main/70 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="次へ"
			{disabled}
			onclick={() => stepIndex(1)}
		>
			›
		</button>
	</div>

	<div
		bind:this={viewportElement}
		class="time-ruler relative h-[84px] w-full overflow-hidden rounded-2xl bg-black/15"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerEnd}
		onpointercancel={handlePointerEnd}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		ontouchcancel={handleTouchEnd}
	>
		<div class="pointer-events-none absolute inset-y-3 left-1/2 z-20 w-[2px] -translate-x-1/2 rounded-full bg-main-accent"></div>
		<div class="pointer-events-none absolute right-0 bottom-0 left-0 h-9 bg-gradient-to-t from-black/20 to-transparent"></div>

		{#each visibleIndices as index (index)}
			<div
				class="pointer-events-none absolute bottom-4 flex -translate-x-1/2 flex-col items-center"
				style:left={`${getTickX(index)}px`}
			>
				<div
					class={`w-[2px] rounded-full ${index === previewIndex ? 'bg-main-accent' : 'bg-white/75'}`}
					style:height={`${getTickHeight(index)}px`}
				></div>
				{#if isMajorTick(index)}
					<div
						class={`mt-1 max-w-[84px] truncate text-[10px] leading-none ${index === previewIndex ? 'text-white' : 'text-white/60'}`}
					>
						{getTickLabel(index)}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if showPlayback}
		<div class="flex items-center justify-center gap-2">
			<button
				type="button"
				class="bg-sub flex w-[200px] cursor-pointer items-center justify-center gap-1 rounded-full p-1 text-sm text-white select-none hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={isPlaying ? '停止' : '再生'}
				{disabled}
				onclick={togglePlayback}
			>
				{#if isPlaying}
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
						<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
					</svg>
					停止
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
						<path fill="currentColor" d="M8 5v14l11-7z" />
					</svg>
					再生
				{/if}
			</button>
		</div>
		<div class="pt-2">
			<RangeSlider
				label={`再生速度 (${Math.round((1000 / playbackIntervalMs) * 10) / 10} コマ/秒)`}
				bind:value={playbackSpeed}
				min={1}
				max={2000}
				step={1}
			/>
		</div>
	{/if}
</div>

<style>
	.time-ruler {
		touch-action: none;
	}
</style>
