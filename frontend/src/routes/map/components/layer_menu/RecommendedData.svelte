<script lang="ts">
	import { geoDataEntries } from '$routes/map/data';
	import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { fade } from 'svelte/transition';
	import Autoplay from 'embla-carousel-autoplay';
	import RecommendedDataImage from './RecommendedDataImage.svelte';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import { showNotification } from '$routes/stores/notification';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { mapStore } from '$routes/stores/map';
	import { isBBoxOverlapping } from '$routes/map/utils/map';
	import type { Region } from '$routes/map/data/types/location';
	import { flip } from 'svelte/animate';
	import { checkMobileWidth } from '$routes/map/utils/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();

	let emblaMainCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselOptions: EmblaOptionsType = {
		loop: true,
		dragFree: false,
		align: 'start',
		containScroll: 'trimSnaps', // スナップを調整
		slidesToScroll: 1, // 1つずつスクロール
		startIndex: 0
	};
	let emblaMainCarouselPlugins: EmblaPluginType[] = [
		Autoplay({
			delay: 5000, // 5秒間隔
			// stopOnMouseEnter: true, // マウスホバー時に停止
			playOnInit: true // 初期化時に自動再生開始
		})
	];

	let emblaThumbnailCarousel: EmblaCarouselType | undefined = $state();
	let emblaThumbnailCarouselOptions: EmblaOptionsType = {
		loop: true,
		containScroll: 'keepSnaps',
		dragFree: true
	};
	let emblaThumbnailCarouselPlugins: EmblaPluginType[] = [];
	let selectedIndex = $state(0);

	const onThumbnailClick = (index: number) => {
		if (!emblaMainCarousel || !emblaThumbnailCarousel) return;
		emblaMainCarousel.scrollTo(index);
	};

	const onSelect = () => {
		if (!emblaMainCarousel || !emblaThumbnailCarousel) return;
		selectedIndex = emblaMainCarousel.selectedScrollSnap();
		emblaThumbnailCarousel.scrollTo(selectedIndex);
	};

	const onInitEmblaMainCarousel = (event: CustomEvent<EmblaCarouselType>) => {
		emblaMainCarousel = event.detail;
		emblaMainCarousel.on('select', onSelect).on('reInit', onSelect);
	};

	const onInitEmblaThumbnailCarousel = (event: CustomEvent<EmblaCarouselType>) => {
		emblaThumbnailCarousel = event.detail;
	};

	const onClickNext = () => {
		if (!emblaMainCarousel) return;
		emblaMainCarousel.scrollNext();
	};
	const onClickPrev = () => {
		if (!emblaMainCarousel) return;
		emblaMainCarousel.scrollPrev();
	};

	// 優先度を決める関数
	const getLocationPriority = (location: Region): number => {
		// より具体的な地名ほど高い優先度（小さい数値）
		if (location === '全国') return 100; // 最低優先度
		if (location === '森林文化アカデミー') return 1; // 最低優先度
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

	let isHover = $state(false);

	const addData = (dataEntry: GeoDataEntry) => {
		if (checkMobileWidth()) {
			activeLayerIdsStore.add(dataEntry.id);
			return;
		} else {
			showDataEntry = dataEntry;
		}
	};
</script>

<div class="relative flex w-full flex-col gap-2 rounded-lg">
	<div class="text-base">おすすめデータ</div>
	<div
		use:emblaCarouselSvelte={{
			plugins: emblaMainCarouselPlugins,
			options: emblaMainCarouselOptions
		}}
		class="overflow-hidden"
		onemblaInit={onInitEmblaMainCarousel}
	>
		<div class="flex p-2">
			{#each dataEntries as dataEntry (dataEntry.id)}
				<button
					animate:flip={{ duration: 200 }}
					onclick={() => addData(dataEntry)}
					class="flex flex-[0_0_30%] cursor-pointer items-center justify-center overflow-hidden rounded-lg text-white"
				>
					<div
						class="group relative flex aspect-square w-[90%] shrink-0 overflow-hidden rounded-lg bg-black"
					>
						<RecommendedDataImage {dataEntry} />
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
</style>
