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

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();

	let emblaMainCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselOptions: EmblaOptionsType = {
		loop: true,
		dragFree: false
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

	let dataEntries = $derived.by(() => {
		return geoDataEntries.filter((data) => !$activeLayerIdsStore.includes(data.id));
	});

	let isHover = $state(false);

	const addData = (id: string) => {
		activeLayerIdsStore.add(id);
	};
</script>

<div class="relative flex w-full flex-col gap-2 rounded-lg bg-black p-4">
	<div class="text-base">関連データ</div>
	<div
		use:emblaCarouselSvelte={{
			plugins: emblaMainCarouselPlugins,
			options: emblaMainCarouselOptions
		}}
		class="overflow-hidden"
		onemblaInit={onInitEmblaMainCarousel}
	>
		<div class="flex">
			{#each dataEntries as dataEntry (dataEntry.id)}
				<button
					onclick={() => (showDataEntry = dataEntry)}
					class="flex min-w-0 flex-[0_0_100%] text-white"
				>
					<div class="group relative flex aspect-square w-1/2 shrink-0 overflow-hidden rounded-lg">
						<RecommendedDataImage {dataEntry} />
					</div>
					<div class="mt-4 text-center text-lg">
						{dataEntry.metaData.name}
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
</style>
