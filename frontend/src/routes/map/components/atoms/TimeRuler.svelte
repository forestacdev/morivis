<script lang="ts">
	import { onMount } from 'svelte';

	import PlaybackControl from '$routes/map/components/atoms/PlaybackControl.svelte';
	import type { SharedDiscreteDimension } from '$routes/map/data/types';

	interface Props {
		dimension: SharedDiscreteDimension;
		currentIndex: number;
		disabled?: boolean;
		showPlayback?: boolean;
		playbackSpeed?: number;
		onPreview?: (index: number) => void | Promise<void>;
		onCommit?: (index: number) => void | Promise<void>;
	}

	let {
		dimension,
		currentIndex,
		disabled = false,
		showPlayback = false,
		playbackSpeed = $bindable(1200),
		onPreview,
		onCommit
	}: Props = $props();

	const tickSpacingPx = 18;
	const shortTickHeight = 14;
	const mediumTickHeight = 22;
	const longTickHeight = 34;
	const dragThresholdPx = 4;
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

	const getTimeLabel = (index: number) => {
		if (index < 0 || index >= dimension.values.length) return '';
		return dimension.labels?.[index] ?? formatTimeValue(dimension.values[index]);
	};

	// ルーラーの描画状態と、ドラッグ中にだけ使う基準値。
	let viewportElement: HTMLDivElement | undefined = $state();
	let viewportWidth = $state(0);
	let dragOffsetPx = $state(0);
	let activePointerId: number | null = null;
	let pointerStartX = 0;
	let pointerStartOffsetPx = 0;
	let dragBaseIndex = $state<number | null>(null);
	let lastPreviewedIndex: number | null = null;

	// currentIndex をそのまま追うと、preview 更新中に基準がずれる。
	// ドラッグ開始時の index を固定して、そこから相対移動で previewIndex を求める。
	const referenceIndex = $derived(dragBaseIndex ?? currentIndex);
	const previewIndex = $derived.by(() => {
		const rawIndex = referenceIndex - dragOffsetPx / tickSpacingPx;
		return clamp(Math.round(rawIndex), 0, Math.max(dimension.values.length - 1, 0));
	});
	const currentLabel = $derived(getTimeLabel(previewIndex));
	// 左右に1件ずつ余分に置き、同じ日付の要素を残したまま横へ移動する。
	const labelIndices = $derived(
		Array.from({ length: 5 }, (_, offset) => previewIndex + offset - 2)
	);
	const centerX = $derived(viewportWidth / 2);
	// 全目盛りは描かず、現在位置の前後だけを描画して DOM 数を抑える。
	const visibleRadius = $derived(Math.max(Math.ceil(viewportWidth / tickSpacingPx / 2) + 6, 12));
	const visibleIndices = $derived.by(() => {
		const start = Math.max(previewIndex - visibleRadius, 0);
		const end = Math.min(previewIndex + visibleRadius, Math.max(dimension.values.length - 1, 0));
		return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
	});

	const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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

	const getTickX = (index: number) =>
		centerX + (index - referenceIndex) * tickSpacingPx + dragOffsetPx;

	// commit は「確定値」。ドラッグ用の一時状態を戻してから親へ通知する。
	const commitIndex = async (index: number) => {
		const clampedIndex = clamp(index, 0, Math.max(dimension.values.length - 1, 0));
		dragOffsetPx = 0;
		dragBaseIndex = null;
		lastPreviewedIndex = null;
		await onCommit?.(clampedIndex);
	};

	// ドラッグ開始時点の index と座標を保持する。
	const beginDrag = (clientX: number) => {
		dragBaseIndex = currentIndex;
		lastPreviewedIndex = currentIndex;
		pointerStartX = clientX;
		pointerStartOffsetPx = dragOffsetPx;
	};

	// 入力座標から dragOffset を更新し、previewIndex が変わった瞬間だけ親へ知らせる。
	const updateDrag = (clientX: number) => {
		const deltaX = clientX - pointerStartX;
		if (Math.abs(deltaX) < dragThresholdPx) return;
		const nextOffsetPx = pointerStartOffsetPx + deltaX;
		dragOffsetPx = nextOffsetPx;

		if (dragBaseIndex == null) return;

		const nextIndex = clamp(
			Math.round(dragBaseIndex - nextOffsetPx / tickSpacingPx),
			0,
			Math.max(dimension.values.length - 1, 0)
		);

		// move ごとに発火せず、中央カーソルが次の目盛りへ跨いだ瞬間だけ preview を流す。
		if (lastPreviewedIndex === nextIndex) return;
		lastPreviewedIndex = nextIndex;
		void onPreview?.(nextIndex);
	};

	// タッチもPointerで扱い、1回の操作を重複して開始・確定しない。
	const handlePointerDown = (event: PointerEvent) => {
		if (disabled || activePointerId !== null || !event.isPrimary || event.button !== 0) return;
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

	const stepIndex = async (delta: number) => {
		if (disabled) return;
		await commitIndex(currentIndex + delta);
	};

	// キーボードでは 1 ステップずつ移動する。
	const handleKeyDown = async (event: KeyboardEvent) => {
		if (disabled) return;
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			await stepIndex(-1);
			return;
		}
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			await stepIndex(1);
		}
	};

	const handlePlaybackTick = async () => {
		const nextIndex = currentIndex >= dimension.values.length - 1 ? 0 : currentIndex + 1;
		await commitIndex(nextIndex);
	};

	onMount(() => {
		if (!viewportElement) return;

		// 画面幅に応じて可視範囲の目盛り数を計算し直す。
		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			viewportWidth = entry.contentRect.width;
		});

		resizeObserver.observe(viewportElement);

		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<div class="flex flex-col gap-4">
	<div class="min-w-0 text-center">
		<div class="text-xs text-white/60">{dimension.placeholder ?? '時間'}</div>
		<div class="time-labels">
			{#each labelIndices as index (index)}
				<div
					class={['time-label', index === previewIndex && 'is-current']}
					style:--label-offset={index - previewIndex}
					style:opacity={Math.abs(index - previewIndex) > 1 ? 0 : index === previewIndex ? 1 : 0.6}
					aria-hidden={Math.abs(index - previewIndex) > 1}
				>
					{getTimeLabel(index) || '—'}
				</div>
			{/each}
		</div>
	</div>

	<!-- 時間ルーラー -->
	<div
		bind:this={viewportElement}
		class="time-ruler relative h-16 w-full overflow-hidden rounded-2xl bg-black"
		role="slider"
		tabindex={disabled ? undefined : 0}
		aria-label={dimension.placeholder ?? '時間'}
		aria-orientation="horizontal"
		aria-valuemin={0}
		aria-valuemax={Math.max(dimension.values.length - 1, 0)}
		aria-valuenow={previewIndex}
		aria-valuetext={currentLabel}
		aria-disabled={disabled}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerEnd}
		onpointercancel={handlePointerEnd}
		onkeydown={handleKeyDown}
	>
		<div
			class="pointer-events-none absolute inset-y-3 left-1/2 z-20 w-[2px] -translate-x-1/2 rounded-full bg-main-accent"
		></div>

		{#each visibleIndices as index (index)}
			<div
				class="pointer-events-none absolute bottom-4 -translate-x-1/2"
				style:left={`${getTickX(index)}px`}
			>
				<div
					class={`w-[2px] rounded-full ${index === previewIndex ? 'bg-main-accent' : 'bg-white/75'}`}
					style:height={`${getTickHeight(index)}px`}
				></div>
			</div>
		{/each}
	</div>

	{#if showPlayback}
		<PlaybackControl
			{disabled}
			bind:playbackSpeed
			onPrevious={() => stepIndex(-1)}
			onNext={() => stepIndex(1)}
			onTick={handlePlaybackTick}
		/>
	{/if}
</div>

<style>
	.time-labels {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		column-gap: 0.5rem;
		align-items: start;
		min-height: 2.75rem;
		margin-top: 0.5rem;
		overflow: hidden;
	}

	.time-label {
		grid-area: 1 / 2;
		min-width: 0;
		color: white;
		font-size: 0.75rem;
		line-height: 1.625;
		overflow-wrap: anywhere;
		text-wrap: balance;
		transform: translateX(calc(var(--label-offset) * (100% + 0.5rem)));
		transition:
			transform 180ms ease-out,
			opacity 180ms ease-out;
	}

	.time-label.is-current {
		font-weight: 600;
	}

	@media (prefers-reduced-motion: reduce) {
		.time-label {
			transition: none;
		}
	}

	.time-ruler {
		touch-action: none;
	}
</style>
