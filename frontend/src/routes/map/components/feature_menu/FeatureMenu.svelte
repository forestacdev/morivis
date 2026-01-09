<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';
	import AttributeItem from '$routes/map/components/feature_menu/AttributeItem.svelte';
	import { propData } from '$routes/map/data/prop_data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { generatePopupTitle } from '$routes/map/utils/properties';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { checkPc } from '$routes/map/utils/ui';
	import { getFullName } from '$routes/map/utils/city_code';
	import { getImageByName } from '$routes/map/api/inaturalist';

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

	let isLoading = $state(true);

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

	let propDict = $derived.by(() => {
		const dict: Record<string, string | number | null> = {};
		layerEntries.forEach((entry) => {
			if (entry.type === 'vector' && entry.properties && entry.properties.dict) {
				Object.assign(dict, entry.properties.dict);
			}
		});
		return dict;
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

	let imageKey = $derived.by(() => {
		if (targetLayer && targetLayer.type === 'vector') {
			return targetLayer.properties.imageKey;
		}
		return null;
	});

	let iNaturalistNameKey = $derived.by(() => {
		if (targetLayer && targetLayer.type === 'vector') {
			return targetLayer.properties.iNaturalistNameKey;
		}
		return null;
	});

	let cityCodeKey = $derived.by(() => {
		if (targetLayer && targetLayer.type === 'vector') {
			return targetLayer.properties.cityCodeKey;
		}
		return null;
	});

	let srcData = $derived.by(() => {
		if (data) {
			if (data.image) {
				return data.image;
			}
		} else if (featureMenuData && featureMenuData.properties && imageKey) {
			return featureMenuData.properties[imageKey] as string;
		}
		return null;
	});

	const promise = async () => {
		if (iNaturalistNameKey && featureMenuData && featureMenuData.properties) {
			const name = featureMenuData.properties[iNaturalistNameKey] as string;
			const res = await getImageByName(name);
			console.log('iNaturalist image data:', res);
			isLoading = false;
			return Promise.resolve(res);
		}
		isLoading = false;
		return Promise.resolve(null);
	};

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

<!-- PC -->
{#if featureMenuData && checkPc()}
	<div
		transition:fly={{
			duration: 300,
			x: -100,
			opacity: 0
		}}
		class="bg-main w-side-menu max absolute top-0 left-0 z-20 flex h-full flex-col max-lg:hidden"
	>
		<div class="flex w-full justify-between p-3 px-4">
			<button
				onclick={() => (featureMenuData = null)}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div>

		<div class="c-scroll h-full overflow-x-hidden overflow-y-auto pl-2">
			<!-- 画像 -->
			<div class="b relative w-full p-2">
				{#if srcData}
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
								class="c-no-drag-icon block aspect-video h-full w-full object-cover"
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
				{:else if iNaturalistNameKey}
					{#await promise()}
						<!-- ローディング中 -->
						<div class="flex aspect-video h-full w-full flex-col items-center justify-center gap-4">
							<div
								class="border-t-accent h-12 w-12 animate-spin rounded-full border-4 border-gray-300"
							></div>
							<p class="text-gray-400">読み込み中...</p>
						</div>
					{:then inatData}
						{#if inatData && inatData.url}
							<img
								in:fade
								class="block aspect-video h-full w-full rounded-lg object-cover"
								alt="画像"
								src={inatData.url}
							/>
							<!-- ライセンス表示 -->
							<div class="mt-1 text-xs text-gray-400">
								{#if inatData.attribution}
									<span>{inatData.attribution}</span>
								{/if}
								{#if inatData.licenseCode}
									<span class="ml-1">({inatData.licenseCode})</span>
								{/if}
								<span class="ml-1">via</span>
								<a
									href="https://www.inaturalist.org/taxa/{inatData.taxonId}"
									target="_blank"
									rel="noopener noreferrer"
									class="text-accent hover:underline"
								>
									iNaturalist
								</a>
							</div>
						{/if}
					{/await}
				{/if}

				<div
					class="bottom-0 left-0 flex h-full w-full shrink-0 grow flex-col justify-end gap-1 pt-4 text-base"
				>
					{#if propId && featureMenuData.properties && featureMenuData.properties._prop_id}
						<!-- poiタイトル -->
						<span class="text-[22px] font-bold">{featureMenuData.properties.name}</span>
						<span class="text-[14px] text-gray-300">{featureMenuData.properties.category}</span>
					{:else}
						<!-- その他 -->
						<span class="text-[22px] font-bold"
							>{targetLayer &&
							targetLayer.type === 'vector' &&
							targetLayer.properties.titles.length &&
							featureMenuData.properties
								? generatePopupTitle(featureMenuData.properties, targetLayer.properties.titles)
								: targetLayer?.metaData.name}</span
						>
						<span class="text-[14px] text-gray-300"
							>{targetLayer && targetLayer.metaData.name ? targetLayer.metaData.name : ''}</span
						>
					{/if}
				</div>
			</div>

			<div class="pl-2">
				<!-- 詳細情報 -->
				<div class="flex h-full w-full flex-col gap-2 pr-2">
					<div class="flex flex-col gap-2 rounded-lg bg-black p-2">
						<!-- 座標 -->
						<div class="flex w-full justify-start gap-2">
							<Icon icon="mdi:crosshairs-gps" class="h-6 w-6 shrink-0 text-base" />
							<span class="text-accent"
								>{featureMenuData.point[0].toFixed(6)}, {featureMenuData.point[1].toFixed(6)}</span
							>
						</div>

						<!-- 市区町村情報 -->
						{#if cityCodeKey && featureMenuData && featureMenuData.properties && featureMenuData.properties[cityCodeKey]}
							{@const cityCode = featureMenuData.properties[cityCodeKey]}
							{#if typeof cityCode === 'string' || typeof cityCode === 'number'}
								<div class="flex w-full justify-start gap-2">
									<Icon icon="lucide:map-pin" class="h-6 w-6 shrink-0 text-base" />
									<span class="text-accent">{getFullName(cityCode)}</span>
								</div>
							{/if}
						{/if}

						<!-- url -->
						{#if data}
							{#if data.url}
								<a
									class="flex w-full items-start justify-start gap-2 break-all"
									href={data.url}
									target="_blank"
									rel="noopener noreferrer"
									><Icon icon="mdi:web" class="h-6 w-6 shrink-0 text-base" />
									<span class="text-accent text-ellipsis hover:underline"
										>{truncateUrl(data.url)}</span
									></a
								>
							{/if}
						{/if}
					</div>

					<!-- 概要説明 -->
					{#if data}
						{#if data.description}
							<span class="my-2 text-justify text-base">{data.description}</span>
						{/if}
					{/if}
				</div>

				<!-- 通常の地物の属性情報 -->
				{#if !propId}
					<div class="w-hull bg-base mt-4 mb-8 h-[1px] rounded-full opacity-60"></div>
					<div class="mb-56 flex h-full w-full flex-col gap-3">
						{#if featureMenuData.properties}
							{#each Object.entries(featureMenuData.properties) as [key, value]}
								{#if key !== '_prop_id' && value && imageKey !== key}
									{@const dictKey = propDict[key] ?? key}
									<AttributeItem key={dictKey} {value} />
								{/if}
							{/each}
						{/if}
					</div>
				{/if}

				{#if featureMenuData.layerId !== 'fac_poi'}
					<button
						onclick={edit}
						class="c-btn-confirm absolute top-3 left-3 z-10 flex items-center justify-center gap-2 px-3"
					>
						<Icon icon="mdi:mixer-settings" class="h-6 w-6" />
						<span class="select-none">カスタマイズ</span>
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
