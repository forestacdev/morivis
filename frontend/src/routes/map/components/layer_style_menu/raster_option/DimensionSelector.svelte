<script lang="ts">
	import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { onDestroy } from 'svelte';

	import Accordion from '../../atoms/Accordion.svelte';
	import PlaybackControl from '../../atoms/PlaybackControl.svelte';
	import TimeRuler from '../../atoms/TimeRuler.svelte';

	import {
		createDimensionController,
		getDimension,
		type DimensionEnabledEntry
	} from '$routes/map/utils/runtime/temporal-dimension';
	import { isMobile } from '$routes/stores/ui';

	interface Props {
		layerEntry: DimensionEnabledEntry;
		showDimensionOption: boolean;
	}

	let { layerEntry = $bindable(), showDimensionOption = $bindable() }: Props = $props();

	let dimension = $derived(getDimension(layerEntry));
	let dimensionState = $derived(layerEntry.state?.dimension);

	let emblaMainCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselOptions: EmblaOptionsType = {
		loop: true,
		dragFree: false,
		align: 'center',
		// 項目が少なくloopが無効になっても、先頭・末尾を中央にそろえる。
		containScroll: false,
		duration: 25,
		slidesToScroll: 1, // 1つずつスクロール
		startIndex: 0
	};
	let isSyncingInitialScroll = $state(false);
	const dimensionController = createDimensionController(() => layerEntry);
	let selectionRequestId = 0;
	let isUpdatingDimension = $state(false);
	let playbackSpeed = $state(1200);

	$effect(() => {
		if (!dimension || dimensionState) return;

		// 時間軸を持つレイヤーは、開いた時点で最初のコマを選択状態にしておく。
		layerEntry.state = {
			...layerEntry.state,
			dimension: {
				currentIndex: 0
			}
		};
	});

	const applyDimensionIndex = async (currentIndex: number) => {
		const request = ++selectionRequestId;
		isUpdatingDimension = true;
		try {
			await dimensionController.select(currentIndex);
		} finally {
			if (request === selectionRequestId) isUpdatingDimension = false;
		}
	};

	// PC の Embla 選択変更は、そのまま applyDimensionIndex に流す。
	const onSelect = async () => {
		if (!emblaMainCarousel || !dimension || isSyncingInitialScroll) return;
		await applyDimensionIndex(emblaMainCarousel.selectedScrollSnap());
	};

	const onInitEmblaMainCarousel = (event: CustomEvent<EmblaCarouselType>) => {
		emblaMainCarousel = event.detail;
		if (dimension) {
			// Embla 初期化直後は 0 番の select が走りやすいので、
			// 先に currentIndex へ合わせる間だけ runtime update を止める。
			isSyncingInitialScroll = true;
			emblaMainCarousel.scrollTo(dimensionState?.currentIndex ?? 0, true);
			queueMicrotask(() => {
				isSyncingInitialScroll = false;
			});
		}
		emblaMainCarousel.on('select', onSelect).on('reInit', onSelect);

		// ホイールイベントリスナーを追加
		if (carouselElement) {
			carouselElement.addEventListener('wheel', handleWheel, { passive: false });
		}
	};

	const onClickNext = () => {
		if (!emblaMainCarousel) return;
		emblaMainCarousel.scrollNext();
	};
	const onClickPrev = () => {
		if (!emblaMainCarousel) return;
		emblaMainCarousel.scrollPrev();
	};

	const handlePlaybackTick = async () => {
		if (!emblaMainCarousel || isUpdatingDimension) return;
		emblaMainCarousel.scrollNext();
	};

	// ホイールイベント用の変数
	let carouselElement: HTMLElement | undefined = $state();

	// マウスホイールイベントハンドラー
	const handleWheel = (event: WheelEvent) => {
		if (!emblaMainCarousel) return;

		// 縦スクロールのみ対応（横スクロールも対応したい場合は deltaX も使用）
		const { deltaY } = event;

		// スクロール感度の調整（数値を大きくすると敏感になる）
		const threshold = 10;

		if (Math.abs(deltaY) > threshold) {
			event.preventDefault(); // ページのスクロールを防ぐ

			if (deltaY > 0) {
				// 下方向スクロール = 次へ
				emblaMainCarousel.scrollNext();
			} else {
				// 上方向スクロール = 前へ
				emblaMainCarousel.scrollPrev();
			}
		}
	};

	onDestroy(() => {
		dimensionController.dispose();
		if (carouselElement) {
			carouselElement.removeEventListener('wheel', handleWheel);
		}
	});

	const formatTimeValue = (value: string): string => {
		// 年のみ: "2026"
		if (/^\d{4}$/.test(value)) return `${Number(value)}年`;
		// 年月のみ: "2026-01"
		const ym = value.match(/^(\d{4})-(\d{2})$/);
		if (ym) return `${Number(ym[1])}年${Number(ym[2])}月`;
		// 日付のみ: "2026-01-15"
		const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (ymd) return `${Number(ymd[1])}年${Number(ymd[2])}月${Number(ymd[3])}日`;

		// ISO 8601 (T含む): "2026-01-01T00:00:00Z"
		const date = new Date(value);
		if (isNaN(date.getTime())) return value;

		const y = date.getUTCFullYear();
		const m = date.getUTCMonth() + 1;
		const d = date.getUTCDate();
		const h = date.getUTCHours();
		const min = date.getUTCMinutes();

		if (h === 0 && min === 0) {
			return d === 1 ? `${y}年${m}月` : `${y}年${m}月${d}日`;
		}
		return `${y}年${m}月${d}日 ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
	};

	const getTimeLabel = (value: string, index: number): string => {
		const labels = dimension?.labels;
		return labels?.[index] ?? formatTimeValue(value);
	};
</script>

{#if dimension}
	<Accordion
		label={dimension.placeholder ?? '時間'}
		icon={dimension.type === 'time' ? 'mdi:clock-outline' : 'carbon:category'}
		bind:value={showDimensionOption}
	>
		{#if $isMobile && dimension.type === 'time'}
			<TimeRuler
				{dimension}
				currentIndex={dimensionState?.currentIndex ?? 0}
				disabled={isUpdatingDimension}
				showPlayback
				bind:playbackSpeed
				onPreview={applyDimensionIndex}
				onCommit={applyDimensionIndex}
			/>
		{:else}
			<div class="flex flex-col gap-4">
				<div class="flex items-center gap-1">
					<div
						use:emblaCarouselSvelte={{
							plugins: [],
							options: emblaMainCarouselOptions
						}}
						bind:this={carouselElement}
						class="min-w-0 flex-1 overflow-hidden"
						onemblaInit={onInitEmblaMainCarousel}
					>
						<div class="flex gap-2 px-2">
							{#each dimension.values as timeValue, i (timeValue)}
								<div
									class="bg-main-accent flex h-full flex-[0_0_70%] cursor-grab items-center justify-center rounded p-3 text-white select-none"
								>
									{getTimeLabel(timeValue, i)}
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
			{#if dimension.type === 'time'}
				<div class="pt-3">
					<PlaybackControl
						disabled={isUpdatingDimension}
						bind:playbackSpeed
						onPrevious={onClickPrev}
						onNext={onClickNext}
						onTick={handlePlaybackTick}
					/>
				</div>
			{/if}
		{/if}
	</Accordion>
{/if}
