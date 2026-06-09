<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { onDestroy } from 'svelte';

	import Accordion from '../../atoms/Accordion.svelte';
	import RangeSlider from '../../atoms/RangeSlider.svelte';

	import { ICONS } from '$lib/icons';
	import type { ModelMeshEntry, MeshStyle } from '$routes/map/data/types/model';
	import type {
		RasterEntry,
		RasterImageEntry,
		RasterCategoricalStyle,
		RasterBaseMapStyle,
		RasterDemStyle,
		RasterTiffStyle,
		RasterCadStyle
	} from '$routes/map/data/types/raster';
	import type { VectorEntry, GeoJsonMetaData, TileMetaData } from '$routes/map/data/types/vector';
	import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
	import { getTopexCacheKey, getTwiCacheKey } from '$routes/map/utils/formats/geotiff';
	import {
		getRasterDimension,
		getRasterDimensionRuntimeUpdates
	} from '$routes/map/utils/raster/dimension-runtime';
	import { getRasterTiffImageSource } from '$routes/map/utils/sources';
	import {
		getVectorDimension,
		getVectorDimensionRuntimeUpdates
	} from '$routes/map/utils/vector/dimension-runtime';
	import { mapStore } from '$routes/stores/map';

	type DimensionEnabledRasterEntry = RasterEntry<
		RasterCategoricalStyle | RasterBaseMapStyle | RasterDemStyle | RasterTiffStyle | RasterCadStyle
	>;

	type DimensionEnabledVectorEntry = VectorEntry<GeoJsonMetaData | TileMetaData>;

	type DimensionEnabledEntry =
		| DimensionEnabledRasterEntry
		| DimensionEnabledVectorEntry
		| ModelMeshEntry<MeshStyle>;

	interface Props {
		layerEntry: DimensionEnabledEntry;
		showDimensionOption: boolean;
	}

	let { layerEntry = $bindable(), showDimensionOption = $bindable() }: Props = $props();

	const isRasterEntry = (entry: DimensionEnabledEntry): entry is DimensionEnabledRasterEntry =>
		entry.type === 'raster';

	const isSourceTemporalVectorEntry = (
		entry: DimensionEnabledEntry
	): entry is DimensionEnabledVectorEntry =>
		entry.type === 'vector' && Boolean(getVectorDimension(entry));

	const isTemporalMeshEntry = (entry: DimensionEnabledEntry): entry is ModelMeshEntry<MeshStyle> =>
		entry.type === 'model' &&
		entry.style.type === 'mesh' &&
		Boolean(entry.properties?.temporal?.dimension);

	const getDimension = (entry: DimensionEnabledEntry) => {
		if (isRasterEntry(entry)) return getRasterDimension(entry);
		if (isSourceTemporalVectorEntry(entry)) return getVectorDimension(entry);
		if (isTemporalMeshEntry(entry)) return entry.properties?.temporal?.dimension;
		return undefined;
	};

	let dimension = $derived(getDimension(layerEntry));
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
	let isSyncingInitialScroll = $state(false);
	let imageUpdateRequestId = 0;
	let isUpdatingDimension = $state(false);
	let playbackSpeed = $state(1200);
	const playbackIntervalMs = $derived(2001 - playbackSpeed);

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
		if (currentIndex === dimensionState?.currentIndex) return;
		const requestId = ++imageUpdateRequestId;

		if (isTemporalMeshEntry(layerEntry)) {
			isUpdatingDimension = true;
			try {
				await mapStore.setTemporalModelTimeStep(layerEntry, currentIndex);
			} finally {
				isUpdatingDimension = false;
			}
			return;
		}

		layerEntry.state = {
			...layerEntry.state,
			dimension: {
				currentIndex
			}
		};
		if (isSourceTemporalVectorEntry(layerEntry)) {
			const runtimeUpdates = await getVectorDimensionRuntimeUpdates(layerEntry);
			runtimeUpdates.forEach((update) => {
				mapStore.setData(update.sourceId, update.data);
			});
			return;
		}

		if (!isRasterEntry(layerEntry)) return;

		if (
			layerEntry.style.type === 'tiff' &&
			layerEntry.format.type === 'image' &&
			layerEntry.style.visualization.mode === 'single'
		) {
			layerEntry.style.visualization.uniformsData.single.index = 0;
			const currentRange = GeoTiffCache.getDataRanges(layerEntry.id)?.[0];
			if (currentRange) {
				layerEntry.style.visualization.uniformsData.single.min = currentRange.min;
				layerEntry.style.visualization.uniformsData.single.max = currentRange.max;
			}
		}

		if (
			layerEntry.style.type === 'tiff' &&
			layerEntry.format.type === 'image' &&
			layerEntry.style.visualization.mode === 'twi'
		) {
			const currentRange = GeoTiffCache.getDataRanges(getTwiCacheKey(layerEntry.id))?.[0];
			if (currentRange) {
				layerEntry.style.visualization.uniformsData.twi = {
					colorMap: layerEntry.style.visualization.uniformsData.twi?.colorMap ?? 'hsv',
					min: currentRange.min,
					max: currentRange.max
				};
			}
		}

		if (
			layerEntry.style.type === 'tiff' &&
			layerEntry.format.type === 'image' &&
			(layerEntry.style.visualization.mode === 'slope' ||
				layerEntry.style.visualization.mode === 'aspect' ||
				layerEntry.style.visualization.mode === 'tpi' ||
				layerEntry.style.visualization.mode === 'topex')
		) {
			const mode = layerEntry.style.visualization.mode;
			const currentRange =
				mode === 'slope'
					? { min: 0, max: 90 }
					: mode === 'aspect'
						? { min: 0, max: 360 }
						: mode === 'tpi'
							? { min: -1, max: 1 }
							: GeoTiffCache.getDataRanges(getTopexCacheKey(layerEntry.id))?.[0];
			if (currentRange) {
				layerEntry.style.visualization.uniformsData[mode] = {
					colorMap:
						layerEntry.style.visualization.uniformsData[mode]?.colorMap ??
						(mode === 'slope' ? 'salinity' : mode === 'aspect' ? 'rainbow-soft' : 'rdbu'),
					min: currentRange.min,
					max: currentRange.max
				};
			}
		}

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

	let autoplayTimeout: ReturnType<typeof setTimeout> | null = null;

	const clearAutoplayTimer = () => {
		if (autoplayTimeout) {
			clearTimeout(autoplayTimeout);
			autoplayTimeout = null;
		}
	};

	const scheduleAutoplayTick = () => {
		clearAutoplayTimer();
		if (!isPlaying || !emblaMainCarousel) return;

		autoplayTimeout = setTimeout(() => {
			if (!isPlaying || !emblaMainCarousel) return;
			if (!isUpdatingDimension) {
				emblaMainCarousel.scrollNext();
			}
			scheduleAutoplayTick();
		}, playbackIntervalMs);
	};

	const toggleAutoplay = () => {
		if (!emblaMainCarousel) return;

		if (isPlaying) {
			clearAutoplayTimer();
			isPlaying = false;
		} else {
			isPlaying = true;
			scheduleAutoplayTick();
		}
	};

	$effect(() => {
		const autoplayIntervalMs = playbackIntervalMs;
		if (!autoplayIntervalMs) return;
		if (!isPlaying) return;
		scheduleAutoplayTick();
	});

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
		clearAutoplayTimer();
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
			<div
				class="group pointer-events-none absolute flex h-full w-full items-center justify-between px-1"
			>
				<button
					onclick={onClickPrev}
					class="bg-main/70 pointer-events-auto z-10 grid h-8 w-8 cursor-pointer place-items-center items-center rounded-full text-white shadow-md transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="前へ"
					disabled={isUpdatingDimension}
				>
					<Icon icon={ICONS.arrowLeft} class="h-6 w-6" />
				</button>

				<button
					onclick={onClickNext}
					class="bg-main/70 pointer-events-auto z-10 grid h-8 w-8 cursor-pointer place-items-center items-center rounded-full text-white shadow-md transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="次へ"
					disabled={isUpdatingDimension}
				>
					<Icon icon={ICONS.arrowRight} class="h-6 w-6" />
				</button>
			</div>
		</div>
		{#if dimension.type === 'time'}
			<div class="flex items-center justify-center gap-2 pt-3">
				<button
					onclick={toggleAutoplay}
					class="bg-sub flex w-[200px] cursor-pointer items-center justify-center gap-1 rounded-full p-1 text-sm text-white select-none hover:bg-white/10"
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
	</Accordion>
{/if}
