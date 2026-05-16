<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
	import Autoplay from 'embla-carousel-autoplay';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { onDestroy } from 'svelte';

	import Accordion from '../../atoms/Accordion.svelte';

	import { ICONS } from '$lib/icons';
	import type {
		RasterEntry,
		RasterImageEntry,
		RasterCategoricalStyle,
		RasterBaseMapStyle,
		RasterDemStyle,
		RasterTiffStyle,
		RasterCadStyle
	} from '$routes/map/data/types/raster';
	import {
		getRasterDimension,
		getRasterDimensionRuntimeUpdates
	} from '$routes/map/utils/raster/dimension-runtime';
	import { getRasterTiffImageSource } from '$routes/map/utils/sources';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: RasterEntry<
			| RasterCategoricalStyle
			| RasterBaseMapStyle
			| RasterDemStyle
			| RasterTiffStyle
			| RasterCadStyle
		>;
		showDimensionOption: boolean;
	}

	let { layerEntry = $bindable(), showDimensionOption = $bindable() }: Props = $props();

	let dimension = $derived(getRasterDimension(layerEntry));
	let dimensionState = $derived(layerEntry.state?.dimension);

	let emblaMainCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselOptions: EmblaOptionsType = {
		loop: true,
		dragFree: false,
		align: 'center',
		containScroll: 'trimSnaps', // スナップを調整
		duration: 25,
		slidesToScroll: 1, // 1つずつスクロール
		startIndex: 0
	};
	// let emblaThumbnailCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselPlugins: EmblaPluginType[] = [
		Autoplay({
			delay: 1000,
			// stopOnMouseEnter: true, // マウスホバー時に停止
			playOnInit: false // 初期化時に自動再生開始
		})
	];
	let isSyncingInitialScroll = $state(false);
	let imageUpdateRequestId = 0;

	$effect(() => {
		if (!dimension || dimensionState) return;

		layerEntry.state = {
			...layerEntry.state,
			dimension: {
				currentIndex: 0
			}
		};
	});

	const onSelect = async () => {
		if (!emblaMainCarousel || !dimension || isSyncingInitialScroll) return;
		const currentIndex = emblaMainCarousel.selectedScrollSnap();
		const requestId = ++imageUpdateRequestId;
		layerEntry.state = {
			...layerEntry.state,
			dimension: {
				currentIndex
			}
		};

		// style 全更新は重いので、差し替え可能な raster source だけを直接更新する。
		const runtimeUpdates = getRasterDimensionRuntimeUpdates(layerEntry);
		runtimeUpdates.forEach((update) => {
			if (update.type === 'tiles') {
				mapStore.setTiles(update.sourceId, update.tiles);
				return;
			}

			mapStore.setData(update.sourceId, update.data);
		});

		if (layerEntry.style.type !== 'tiff' || layerEntry.format.type !== 'image') return;

		const imageSource = await getRasterTiffImageSource(
			layerEntry as RasterImageEntry<RasterTiffStyle>
		);
		if (
			!imageSource ||
			requestId !== imageUpdateRequestId ||
			layerEntry.state?.dimension?.currentIndex !== currentIndex
		) {
			return;
		}

		mapStore.setImage(`${layerEntry.id}_source`, {
			url: imageSource.url,
			coordinates: imageSource.coordinates
		});
	};

	// const onSelect = () => {
	// 	if (!emblaMainCarousel || !layerEntry.style.dimension) return;
	// 	const currentIndex = emblaMainCarousel.selectedScrollSnap();
	// 	const sourceId = `${layerEntry.id}_source`;
	// 	const timeValue = layerEntry.style.dimension.values[currentIndex];
	// 	if (timeValue) {
	// 		const tileUrl = layerEntry.format.url.replace('{morivis:dimension}', timeValue);
	// 		mapStore.setTiles(sourceId, [tileUrl]);
	// 	}
	// };

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

	let isPlaying = $state(false);

	const toggleAutoplay = () => {
		if (!emblaMainCarousel) return;
		const autoplay = emblaMainCarousel.plugins()?.autoplay as
			| { play: () => void; stop: () => void; isPlaying: () => boolean }
			| undefined;
		if (!autoplay) return;

		if (autoplay.isPlaying()) {
			autoplay.stop();
			isPlaying = false;
		} else {
			autoplay.play();
			isPlaying = true;
		}
	};

	// ホイールイベント用の変数
	let carouselElement: HTMLElement | undefined = $state();
	let wheelTimeout: ReturnType<typeof setTimeout> | null = null;
	let isWheelScrolling = $state(false);

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

			// スクロール状態の管理
			isWheelScrolling = true;
			if (wheelTimeout) clearTimeout(wheelTimeout);
			wheelTimeout = setTimeout(() => {
				isWheelScrolling = false;
			}, 150);
		}
	};

	onDestroy(() => {
		if (carouselElement) {
			carouselElement.removeEventListener('wheel', handleWheel);
		}
		if (wheelTimeout) {
			clearTimeout(wheelTimeout);
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
		<div class="relative flex flex-col gap-4">
			<div class="flex items-center gap-1">
				<div
					use:emblaCarouselSvelte={{
						plugins: emblaMainCarouselPlugins,
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
			<div
				class="group pointer-events-none absolute flex h-full w-full items-center justify-between px-1"
			>
				<button
					onclick={onClickPrev}
					class="bg-main/70 pointer-events-auto z-10 grid h-8 w-8 cursor-pointer place-items-center items-center rounded-full text-white shadow-md transition-opacity duration-150"
					aria-label="前へ"
				>
					<Icon icon={ICONS.arrowLeft} class="h-6 w-6" />
				</button>

				<button
					onclick={onClickNext}
					class="bg-main/70 pointer-events-auto z-10 grid h-8 w-8 cursor-pointer place-items-center items-center rounded-full text-white shadow-md transition-opacity duration-150"
					aria-label="次へ"
				>
					<Icon icon={ICONS.arrowRight} class="h-6 w-6" />
				</button>
			</div>
		</div>
		{#if dimension.type === 'time'}
			<div class="flex items-center justify-center gap-2 pt-3">
				<button
					onclick={toggleAutoplay}
					class="bg-sub flex w-[200px] cursor-pointer items-center justify-center gap-1 rounded-full p-1 text-sm text-white hover:bg-white/10"
					aria-label={isPlaying ? '停止' : '再生'}
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
		{/if}
	</Accordion>
{/if}
