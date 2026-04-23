<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
	import Autoplay from 'embla-carousel-autoplay';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { onDestroy, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import RecommendedDataImage from './RecommendedDataImage.svelte';

	import { ICONS } from '$lib/icons';
	import { geoDataEntries } from '$routes/map/data/entries';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { Region } from '$routes/map/data/types/location';
	import { isBBoxOverlapping } from '$routes/map/utils/map/bbox';
	import { checkMobileWidth } from '$routes/map/utils/platform/viewport';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { showDataMenu } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		isLayerDragging: boolean;
		isDeleteOverlayActive: boolean;
		setRecommendedDataDragging: (value: boolean) => void;
	}

	let {
		showDataEntry = $bindable(),
		isLayerDragging,
		isDeleteOverlayActive = $bindable(),
		setRecommendedDataDragging
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);

	let emblaMainCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselOptions: EmblaOptionsType = {
		loop: true,
		dragFree: false,
		align: 'center',
		containScroll: 'trimSnaps', // スナップを調整
		duration: 25,
		slidesToScroll: 1, // 1つずつスクロール
		startIndex: 0,
		watchDrag: false
	};
	let emblaMainCarouselPlugins: EmblaPluginType[] = [
		Autoplay({
			delay: 5000, // 5秒間隔
			// stopOnMouseEnter: true, // マウスホバー時に停止
			playOnInit: true // 初期化時に自動再生開始
		})
	];

	let selectedIndex = $state(0);

	// const onThumbnailClick = (index: number) => {
	// 	if (!emblaMainCarousel || !emblaThumbnailCarousel) return;
	// 	emblaMainCarousel.scrollTo(index);
	// };

	const onSelect = () => {
		if (!emblaMainCarousel) return;
		selectedIndex = emblaMainCarousel.selectedScrollSnap();
	};

	const onInitEmblaMainCarousel = (event: CustomEvent<EmblaCarouselType>) => {
		emblaMainCarousel = event.detail;
		emblaMainCarousel.on('select', onSelect).on('reInit', onSelect).on('autoplay:select', onSelect);

		emblaMainCarousel = event.detail;
		onSelect();

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

	// ホイールイベント用の変数
	let carouselElement: HTMLElement | undefined = $state();

	// マウスホイールイベントハンドラー
	const handleWheel = (event: WheelEvent) => {
		if (!emblaMainCarousel) return;

		const { deltaY } = event;
		const threshold = 10;

		if (Math.abs(deltaY) > threshold) {
			event.preventDefault();
			if (deltaY > 0) {
				emblaMainCarousel.scrollNext();
			} else {
				emblaMainCarousel.scrollPrev();
			}
		}
	};

	onDestroy(() => {
		if (carouselElement) {
			carouselElement.removeEventListener('wheel', handleWheel);
		}
	});

	// 優先度を決める関数
	const getLocationPriority = (location: Region): number => {
		// より具体的な地名ほど高い優先度（小さい数値）

		if (location === '森林文化アカデミー') return 120; // 最低優先度
		if (location === '世界') return 110; // 最低優先度
		if (location === '全国') return 100; // 最低優先度
		if (
			location.includes('県') ||
			location.includes('府') ||
			location.includes('都') ||
			location.includes('道')
		) {
			return 10; // 都道府県レベル：高優先度
		}
		if (
			location.includes('市') ||
			location.includes('区') ||
			location.includes('町') ||
			location.includes('村')
		) {
			return 5; // 市区町村レベル：最高優先度
		}
		if (location.includes('地方') || location.includes('地区') || location.includes('エリア')) {
			return 50; // 地方レベル：中優先度
		}
		return 30; // その他：中程度の優先度
	};

	let mapBounds = $state<[number, number, number, number] | null>(null);

	mapStore.onStateChange((state) => {
		mapBounds = state.bbox;
	});

	const LIMIT = 15;

	let dataEntries = $derived.by(() => {
		if (!mapBounds) return [];
		return geoDataEntries
			.filter((data) => !$activeLayerIdsStore.includes(data.id))
			.filter((data) =>
				isBBoxOverlapping(mapBounds as [number, number, number, number], data.metaData.bounds)
			)

			.sort((a, b) => {
				const priorityA = getLocationPriority(a.metaData.location);
				const priorityB = getLocationPriority(b.metaData.location);

				// 優先度が同じ場合は、名前でソート
				if (priorityA === priorityB) {
					return a.metaData.name.localeCompare(b.metaData.name, 'ja');
				}

				return priorityA - priorityB; // 小さい数値（高優先度）が先に来る
			})
			.slice(0, LIMIT);
	});

	$effect(() => {
		// データエントリーが更新されたときに、選択されたインデックスが範囲内か確認
		if (dataEntries.length) {
			selectedIndex = 0; // 範囲外の場合は最初のアイテムにリセット
		}
	});

	const addData = (dataEntry: GeoDataEntry) => {
		if (checkMobileWidth()) {
			activeLayerIdsStore.add(dataEntry.id);
			return;
		} else {
			showDataEntry = dataEntry;
		}
	};

	const onDragStart = (e: DragEvent, dataEntry: GeoDataEntry) => {
		if (!e.dataTransfer) return;
		e.dataTransfer.effectAllowed = 'copy';
		e.dataTransfer.setData('application/x-entry-id', dataEntry.id);
		setRecommendedDataDragging(true);
	};

	const onDragEnd = () => {
		setRecommendedDataDragging(false);
	};

	const handleDeleteDragOver = (e: DragEvent) => {
		if (!e.dataTransfer?.types.includes('application/x-entry-id')) return;
		e.preventDefault();
		e.stopPropagation();
		isDeleteOverlayActive = true;
		e.dataTransfer.dropEffect = 'move';
	};

	const handleDeleteDragLeave = (e: DragEvent) => {
		if (!(e.currentTarget instanceof HTMLElement)) return;
		const relatedTarget = e.relatedTarget;
		if (relatedTarget instanceof Node && e.currentTarget.contains(relatedTarget)) return;
		isDeleteOverlayActive = false;
	};

	const handleDeleteDrop = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		isDeleteOverlayActive = false;

		const entryId = e.dataTransfer?.getData('application/x-entry-id');
		if (!entryId || !activeLayerIdsStore.has(entryId)) return;

		activeLayerIdsStore.remove(entryId);
	};

	$effect(() => {
		if (isLayerDragging) return;
		isDeleteOverlayActive = false;
	});
</script>

{#if dataEntries.length > 0}
	<div
		transition:fade={{ duration: 150 }}
		class="relative flex w-full flex-col gap-2 rounded-lg select-none"
	>
		<div class="flex w-full items-center justify-end pl-2">
			<button
				onclick={() => showDataMenu.set(true)}
				class="group relative grid cursor-pointer place-items-center px-4 py-1 text-sm"
			>
				<div
					class="c-poyopoyo bg-accent group-hover:bg-base rounded-full p-4 px-20 text-transparent transition-colors duration-150"
				></div>
				<span class="absolute block text-base transition-colors duration-150 group-hover:text-black"
					>データ一覧を見る</span
				>
			</button>
		</div>
		<div class="relative">
			<!-- <div
				class="c-bg-fog-left pointer-events-none absolute bottom-0 left-0 z-10 h-full w-[50px]"
			></div> -->

			<div
				use:emblaCarouselSvelte={{
					plugins: emblaMainCarouselPlugins,
					options: emblaMainCarouselOptions
				}}
				bind:this={carouselElement}
				class="relative overflow-hidden"
				onemblaInit={onInitEmblaMainCarousel}
			>
				<div class="flex">
					{#each dataEntries as dataEntry, i (dataEntry.id)}
						<button
							draggable="true"
							ondragstart={(e) => onDragStart(e, dataEntry)}
							ondragend={onDragEnd}
							ondrop={(e) => e.stopPropagation()}
							onclick={() => addData(dataEntry)}
							onmouseenter={() => (hoveredIndex = i)}
							onmouseleave={() => (hoveredIndex = null)}
							class="transition-[width, transform, translate, scale, rotate, height, border-color] flex flex-[0_0_70%] origin-center translate-z-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg pt-1 pb-3 text-white duration-150
                                {hoveredIndex === i ? 'c-set-glow' : ''}"
						>
							<div
								class="relative flex aspect-video w-[95%] shrink-0 overflow-hidden rounded-lg border bg-black
                                {hoveredIndex === i ? 'border-accent' : 'border-sub'}"
							>
								<RecommendedDataImage {dataEntry} isSelected={selectedIndex === i} />
							</div></button
						>
					{/each}
				</div>
			</div>

			<!-- <div
				class="c-bg-fog-right pointer-events-none absolute right-0 bottom-0 z-10 h-full w-[50px]"
			></div> -->
		</div>
		{#if isLayerDragging}
			<div
				transition:fly={{ duration: 300, y: 50, delay: 100 }}
				role="button"
				tabindex="-1"
				aria-label="レイヤー削除エリア"
				class="absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 text-sm backdrop-blur-[1px] transition-colors duration-150
						{isDeleteOverlayActive ? 'border-red-500 bg-red-500/18 text-red-100' : ' bg-black/45 text-red-50'}"
				ondragover={handleDeleteDragOver}
				ondragleave={handleDeleteDragLeave}
				ondrop={handleDeleteDrop}
			>
				<div class="flex items-center justify-center gap-2 p-2">
					<Icon icon={ICONS.trash} class="h-8 w-8" />
					<div class="">ここにドロップで削除</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.c-set-glow {
		filter: drop-shadow(0 0 3px var(--color-accent));
	}

	.c-poyopoyo {
		animation: poyopoyo 2s ease-out infinite;
	}
	@keyframes poyopoyo {
		0%,
		40%,
		60%,
		80% {
			transform: scale(1);
		}
		50%,
		70% {
			transform: scale(0.95);
		}
	}
</style>
