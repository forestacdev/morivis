<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { delay } from 'es-toolkit';
	import { fade, fly } from 'svelte/transition';
	import Viewer from 'viewerjs';
	import 'viewerjs/dist/viewer.css';

	import {
		getImageByName,
		getSummaryByJapaneseName,
		getTaxonomyByJapaneseName,
		type INatImage
	} from '$routes/map/api/inaturalist';
	import AttributeItem from '$routes/map/components/feature_menu/AttributeItem.svelte';
	import { propData } from '$routes/map/data/entries/_prop_data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { filterByPopupKeys } from '$routes/map/data/types/vector/properties';
	import type { FeatureMenuData } from '$routes/map/types';
	import { getFullName } from '$routes/map/utils/city_code';
	import { generatePopupTitle } from '$routes/map/utils/properties';
	import { checkPc } from '$routes/map/utils/ui';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';

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
	// let emblaThumbnailCarouselOptions: EmblaOptionsType = {
	// 	loop: true,
	// 	containScroll: 'keepSnaps',
	// 	dragFree: true
	// };
	// let emblaThumbnailCarouselPlugins: EmblaPluginType[] = [];
	let selectedIndex = $state(0);
	let imageViewerRoot: HTMLDivElement | null = $state(null);
	let imageViewerImage: HTMLImageElement | null = $state(null);
	let isImageViewerOpen = $state(false);
	let imageViewer: Viewer | null = null;

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

	const closeImageViewer = () => {
		imageViewer?.hide();
	};

	const openImageViewer = () => {
		if (!imageViewerRoot) return;

		if (!imageViewer) {
			imageViewer = new Viewer(imageViewerRoot, {
				backdrop: true,
				button: true,
				navbar: false,
				title: false,
				shown: () => {
					isImageViewerOpen = true;
				},
				hidden: () => {
					isImageViewerOpen = false;
				},
				toolbar: {
					zoomIn: true,
					zoomOut: true,
					oneToOne: true,
					reset: true,
					prev: false,
					play: false,
					next: false,
					rotateLeft: true,
					rotateRight: true,
					flipHorizontal: false,
					flipVertical: false
				}
			});
		}

		imageViewer.show();
	};

	let targetLayer = $derived.by(() => {
		if (featureMenuData) {
			const layer = layerEntries.find(
				(entry) => featureMenuData && entry.id === featureMenuData.layerId
			);
			return layer;
		}
		return null;
	});

	let fields = $derived.by(() => {
		if (targetLayer && targetLayer.type === 'vector') {
			return targetLayer.properties.fields;
		}
		return [];
	});

	// let propDict = $derived.by(() => {
	// 	const dict: Record<string, string | number | null> = {};
	// 	layerEntries.forEach((entry) => {
	// 		if (entry.type === 'vector' && entry.properties && entry.properties.dict) {
	// 			Object.assign(dict, entry.properties.dict);
	// 		}
	// 	});
	// 	return dict;
	// });

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
			return targetLayer.properties.attributeView.imageKey;
		}
		return null;
	});

	let iNaturalistNameKey = $derived.by(() => {
		if (
			targetLayer &&
			targetLayer.type === 'vector' &&
			targetLayer.properties.attributeView.relations
		) {
			return targetLayer.properties.attributeView.relations?.iNaturalistNameKey;
		}
		return null;
	});

	let cityCodeKey = $derived.by(() => {
		if (
			targetLayer &&
			targetLayer.type === 'vector' &&
			targetLayer.properties.attributeView.relations
		) {
			return targetLayer.properties.attributeView.relations?.cityCodeKey;
		}
		return null;
	});

	/**
	 * 画像データの共通型
	 */
	type ImageData =
		| {
				type: 'static';
				url: string;
		  }
		| {
				type: 'inaturalist';
				data: INatImage;
		  }
		| null;

	/**
	 * 画像データを取得する共通Promise
	 * - data.image: propDataからの画像
	 * - imageKey: featureMenuDataのプロパティからの画像
	 * - iNaturalistNameKey: iNaturalist APIからの画像
	 */
	const getImageData = async (): Promise<ImageData> => {
		const delay = new Promise((resolve) => setTimeout(resolve, 300));

		const fetchImage = async (): Promise<ImageData> => {
			// 1. propDataからの画像
			if (data?.image) {
				return { type: 'static', url: data.image };
			}

			// 2. featureMenuDataのプロパティからの画像
			if (featureMenuData?.properties && imageKey) {
				const url = featureMenuData.properties[imageKey] as string;
				if (url) {
					return { type: 'static', url };
				}
			}

			// 3. iNaturalist APIからの画像
			if (iNaturalistNameKey && featureMenuData?.properties) {
				const name = featureMenuData.properties[iNaturalistNameKey] as string;
				if (name) {
					const res = await getImageByName(name);

					if (res) {
						return { type: 'inaturalist', data: res };
					}
				}
			}

			return null;
		};

		// 画像取得とdelayを並列実行し、両方が完了するまで待つ（最低0.2秒かかる）
		const [result] = await Promise.all([fetchImage(), delay]);
		return result;
	};

	// 画像データのPromise（featureMenuDataが変わったら再取得）
	let imagePromise = $derived.by(() => {
		if (featureMenuData) {
			return getImageData();
		}
		return Promise.resolve(null as ImageData);
	});

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

	$effect(() => {
		void imageViewerRoot;
		void imageViewerImage;

		return () => {
			isImageViewerOpen = false;
			imageViewer?.destroy();
			imageViewer = null;
		};
	});
</script>

{#if featureMenuData}
	{#await imagePromise}
		<!-- ローディング中 -->
		<div class="absolute inset-0 flex flex-col items-center gap-4 max-lg:pt-32 lg:justify-center">
			<div
				class="border-t-accent h-12 w-12 animate-spin rounded-full border-4 border-gray-300"
			></div>
			<p class="text-gray-400">読み込み中...</p>
		</div>
	{:then imageData}
		<!-- 画像 -->
		<div in:fade={{ duration: 100 }} class="relative w-full max-lg:py-2 lg:p-2">
			{#if data && data.medias && data.medias.length > 0}
				<!-- メディアカルーセル -->
				<div
					use:emblaCarouselSvelte={{
						plugins: emblaMainCarouselPlugins,
						options: emblaMainCarouselOptions
					}}
					class="overflow-hidden"
					onemblaInit={onInitEmblaMainCarousel}
				>
					<div class="flex">
						{#each data.medias as media (media.url)}
							{#if media.type === 'image'}
								<img
									src={media.url}
									width={1920}
									height={1080}
									alt="画像"
									class="aspect-video min-w-0 flex-[0_0_100%] object-cover"
								/>
							{:else if media.type === 'youtube'}
								<iframe
									class="aspect-video min-w-0 flex-[0_0_100%]"
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
			{:else}
				<!-- 共通画像表示 -->
				{#if imageData}
					{@const imageUrl = imageData.type === 'static' ? imageData.url : imageData.data.url}
					<div class="w-full">
						<div
							bind:this={imageViewerRoot}
							class="relative aspect-video w-full overflow-hidden rounded-lg bg-black"
						>
							{#key imageUrl}
								{#await new Promise((resolve) => {
									const img = new Image();
									img.onload = () => resolve(img);
									img.src = imageUrl;
								}) then}
									<button
										type="button"
										class="absolute inset-0 h-full w-full cursor-zoom-in"
										aria-label="画像を拡大表示"
										onclick={openImageViewer}
									>
										<img
											bind:this={imageViewerImage}
											in:fade
											class="c-no-drag-icon absolute inset-0 h-full w-full object-contain"
											alt="画像"
											src={imageUrl}
										/>
									</button>
								{/await}
							{/key}
						</div>
						<!-- iNaturalistのライセンス表示 -->
						{#if imageData?.type === 'inaturalist'}
							<div class="mt-1 text-xs text-gray-400">
								{#if imageData.data.attribution}
									<span>{imageData.data.attribution}</span>
								{/if}
								{#if imageData.data.licenseCode}
									<span class="ml-1">({imageData.data.licenseCode})</span>
								{/if}
								<span class="ml-1">via</span>
								<a
									href="https://www.inaturalist.org/taxa/{imageData.data.taxonId}"
									target="_blank"
									rel="noopener noreferrer"
									class="text-accent hover:underline"
								>
									iNaturalist
								</a>
							</div>
						{/if}
					</div>
				{/if}
			{/if}

			<div
				class="bottom-0 left-0 flex h-full w-full shrink-0 grow flex-col justify-end gap-1 pt-4 text-base max-lg:hidden"
			>
				{#if propId && featureMenuData.properties && featureMenuData.properties._prop_id}
					<!-- poiタイトル -->
					<span class="text-[22px] font-bold">{featureMenuData.properties.name}</span>
					<span class="text-[14px] text-gray-300">{featureMenuData.properties.category}</span>
				{:else}
					<!-- その他タイトル -->
					<span class="text-[22px] font-bold break-all"
						>{targetLayer &&
						targetLayer.type === 'vector' &&
						targetLayer.properties.attributeView.titles.length &&
						featureMenuData.properties
							? generatePopupTitle(
									featureMenuData.properties,
									targetLayer.properties.attributeView.titles
								)
							: targetLayer?.metaData.name}</span
					>
					<span class="text-[14px] break-all text-gray-300"
						>{targetLayer && targetLayer.metaData.name ? targetLayer.metaData.name : ''}</span
					>
				{/if}
			</div>
		</div>

		<div in:fade={{ duration: 100 }} class="lg:pl-2">
			<!-- 詳細情報 -->
			<div class="flex h-full w-full flex-col gap-2 lg:pr-2">
				<!-- 座標 （緯度, 経度） -->
				<!-- <div class="flex w-full justify-start gap-2">
						<Icon icon="mdi:crosshairs-gps" class="h-6 w-6 shrink-0 text-base" />
						<span class="text-accent"
							>{featureMenuData.point[1].toFixed(6)}, {featureMenuData.point[0].toFixed(6)}</span
						>
					</div> -->

				<!-- 市区町村情報 -->
				<!-- {#if cityCodeKey && featureMenuData && featureMenuData.properties && featureMenuData.properties[cityCodeKey]}
						{@const cityCode = featureMenuData.properties[cityCodeKey]}
						{#if typeof cityCode === 'string' || typeof cityCode === 'number'}
							<div class="flex w-full justify-start gap-2">
								<Icon icon="lucide:map-pin" class="h-6 w-6 shrink-0 text-base" />
								<span class="text-accent">{getFullName(cityCode)}</span>
							</div>
						{/if}
					{/if} -->

				<!-- url -->
				{#if data}
					{#if data.url}
						<div class="flex w-full items-center justify-center">
							<a
								class="c-btn-confirm flex items-center justify-start gap-2 rounded-full p-2 px-4 select-none"
								href={data.url}
								target="_blank"
								rel="noopener noreferrer"
								><Icon icon="majesticons:open" class="h-6 w-6" />
								<span>外部サイトを開く</span></a
							>
						</div>
					{/if}
				{/if}

				<!-- 概要説明 -->
				{#if data}
					{#if data.description}
						<span class="my-2 pb-24 text-justify text-base">{data.description}</span>
					{/if}
				{/if}
			</div>

			<!-- 通常の地物の属性情報 -->
			{#if !propId}
				<div class="w-hull bg-sub mt-4 mb-8 h-[1px] rounded-full opacity-60"></div>
				<div class="mb-56 flex h-full w-full flex-col gap-3">
					{#if targetLayer && targetLayer.type === 'vector' && featureMenuData.properties}
						{@const popupKeys = targetLayer.properties.attributeView.popupKeys}
						{@const displayProps =
							popupKeys.length > 0
								? filterByPopupKeys(featureMenuData.properties, popupKeys)
								: featureMenuData.properties}
						{#each Object.entries(displayProps) as [key, value]}
							{#if key !== '_prop_id' && value && imageKey !== key}
								{@const field = fields.find((f) => f.key === key)}
								<!-- 辞書による属性名書き換え -->
								<AttributeItem {key} {value} {field} />
							{/if}
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{/await}
{/if}

<style>
	:global(.viewer-button) {
		top: 24px;
		right: 24px;
		width: 64px;
		height: 64px;
	}

	:global(.viewer-canvas) {
		background-color: rgba(0, 0, 0, 0.5);
	}

	:global(.viewer-button.viewer-close) {
		width: 48px;
		height: 48px;
	}
</style>
