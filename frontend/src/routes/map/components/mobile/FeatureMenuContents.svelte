<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { fade } from 'svelte/transition';
	import { propData } from '$routes/map/data/prop_data';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import AttributeItem from '../feature_menu/AttributeItem.svelte';

	interface Props {
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showSelectionMarker: boolean;
	}

	let {
		featureMenuData = $bindable(),
		layerEntries,
		showSelectionMarker = $bindable()
	}: Props = $props();

	let emblaMainCarousel: EmblaCarouselType | undefined = $state();
	let emblaMainCarouselOptions: EmblaOptionsType = {
		loop: true,
		dragFree: false
	};
	let emblaMainCarouselPlugins: EmblaPluginType[] = [];

	let emblaThumbnailCarousel: EmblaCarouselType | undefined = $state();
	let emblaThumbnailCarouselOptions: EmblaOptionsType = {
		loop: true,
		containScroll: 'keepSnaps',
		dragFree: true
	};
	let emblaThumbnailCarouselPlugins: EmblaPluginType[] = [];
	let selectedIndex = $state(0);

	function onThumbnailClick(index: number) {
		if (!emblaMainCarousel || !emblaThumbnailCarousel) return;
		emblaMainCarousel.scrollTo(index);
	}

	function onSelect() {
		if (!emblaMainCarousel || !emblaThumbnailCarousel) return;
		selectedIndex = emblaMainCarousel.selectedScrollSnap();
		emblaThumbnailCarousel.scrollTo(selectedIndex);
	}

	function onInitEmblaMainCarousel(event: CustomEvent<EmblaCarouselType>) {
		emblaMainCarousel = event.detail;
		emblaMainCarousel.on('select', onSelect).on('reInit', onSelect);
	}

	function onInitEmblaThumbnailCarousel(event: CustomEvent<EmblaCarouselType>) {
		emblaThumbnailCarousel = event.detail;
	}

	function onClickNext() {
		if (!emblaMainCarousel) return;
		emblaMainCarousel.scrollNext();
	}
	function onClickPrev() {
		if (!emblaMainCarousel) return;
		emblaMainCarousel.scrollPrev();
	}

	let targetLayer = $derived.by(() => {
		if (featureMenuData) {
			const layer = layerEntries.find(
				(entry) => featureMenuData && entry.id === featureMenuData.layerId
			);
			return layer;
		}
		return null;
	});

	let propId = $derived.by(() => {
		if (featureMenuData && featureMenuData.properties) {
			return featureMenuData.properties._prop_id;
		} else {
			return null;
		}
	});

	let data = $derived.by(() => {
		if (featureMenuData && featureMenuData.properties) {
			return propData[featureMenuData.properties._prop_id as string];
		} else {
			return null;
		}
	});

	let srcData = $derived.by(() => {
		if (data) {
			if (data.image) {
				return data.image;
			}
		}
		return null;
	});

	const edit = () => {
		if (targetLayer && targetLayer.type === 'vector') {
			selectedLayerId.set(targetLayer.id);
			isStyleEdit.set(true);
			featureMenuData = null; // Close the feature menu after editing
		}
	};

	// URLを省略する関数
	const truncateUrl = (url: string, maxLength = 50) => {
		if (url.length <= maxLength) return url;
		return url.substring(0, maxLength) + '...';
	};

	$effect(() => {
		if (!featureMenuData) {
			showSelectionMarker = false;
		}
	});
</script>

<!-- 画像 -->
{#if featureMenuData}
	<div class="relative w-full">
		{#if srcData && data && !data.medias}
			<img
				in:fade
				class="block aspect-video h-full w-full rounded-lg object-cover"
				alt="画像"
				src={srcData}
			/>
		{:else if data && data.medias && data.medias.length > 0}
			<div
				use:emblaCarouselSvelte={{
					plugins: emblaMainCarouselPlugins,
					options: emblaMainCarouselOptions
				}}
				class="overflow-hidden"
				onemblaInit={onInitEmblaMainCarousel}
			>
				<div class="flex">
					<img
						in:fade
						class="block aspect-video h-full w-full object-cover"
						alt="画像"
						src={srcData}
					/>
					{#each data.medias as media (media.url)}
						<!--TODO: メディア表示-->
						{#if media.type === 'image'}
							<img
								src={media.url}
								width={1920}
								height={1080}
								alt="画像"
								class="ml-2 aspect-video min-w-0 flex-[0_0_100%] object-cover"
							/>
						{:else if media.type === 'youtube'}
							<iframe
								class="ml-2 aspect-video min-w-0 flex-[0_0_100%]"
								src={`${media.url}?mute=0&controls=1`}
								title="YouTube video player"
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								referrerpolicy="strict-origin-when-cross-origin"
								allowfullscreen
							></iframe>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<div class="pt-3">
		<!-- 詳細情報 -->
		<div class="flex h-full w-full flex-col gap-2">
			<div class="flex flex-col gap-2 rounded-lg bg-black p-2">
				<div class="flex w-full justify-start gap-2">
					<Icon icon="lucide:map-pin" class="h-6 w-6 shrink-0 text-base" />
					<span class="text-accent"
						>{featureMenuData.point[0].toFixed(6)}, {featureMenuData.point[1].toFixed(6)}</span
					>
				</div>

				{#if data}
					{#if data.url}
						<a
							class="flex w-full items-start justify-start gap-2 break-all"
							href={data.url}
							target="_blank"
							rel="noopener noreferrer"
							><Icon icon="mdi:web" class="h-6 w-6 shrink-0 text-base" />
							<span class="text-accent text-ellipsis hover:underline">{truncateUrl(data.url)}</span
							></a
						>
					{/if}
				{/if}
			</div>
			{#if data}
				{#if data.description}
					<span class="my-2 text-base">{data.description}</span>
				{/if}
			{/if}
		</div>

		<!-- 通常の地物の属性情報 -->
		{#if !propId}
			<div class="mb-56 flex h-full w-full flex-col gap-2">
				<div class="my-4 text-base text-lg">属性情報</div>
				{#if featureMenuData.properties}
					{#each Object.entries(featureMenuData.properties) as [key, value]}
						{#if key !== '_prop_id' && value}
							<AttributeItem {key} {value} />
						{/if}
					{/each}
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
</style>
