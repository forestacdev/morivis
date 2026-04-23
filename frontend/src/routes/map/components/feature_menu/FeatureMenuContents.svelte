<script lang="ts">
	import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { delay } from 'es-toolkit';
	import { fade } from 'svelte/transition';

	import { getImageByName } from '$routes/map/api/inaturalist';
	import AttributeItem from '$routes/map/components/feature_menu/AttributeItem.svelte';
	import FeaturePanelSummary from '$routes/map/components/feature_menu/FeaturePanelSummary.svelte';
	import { propData } from '$routes/map/data/entries/_prop_data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { filterByPopupKeys } from '$routes/map/data/types/vector/properties';
	import type {
		FeatureMenuData,
		FeaturePanelImage as FeaturePanelImageData,
		FeaturePanelSummary as FeaturePanelSummaryData
	} from '$routes/map/types';
	import { generatePopupTitle } from '$routes/map/utils/data/properties';

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

	const onInitEmblaMainCarousel = (event: CustomEvent<EmblaCarouselType>) => {
		emblaMainCarousel = event.detail;
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

	/**
	 * 画像データを取得する共通Promise
	 * - data.image: propDataからの画像
	 * - imageKey: featureMenuDataのプロパティからの画像
	 * - iNaturalistNameKey: iNaturalist APIからの画像
	 */
	const getImageData = async (): Promise<FeaturePanelImageData | null> => {
		const delay = new Promise((resolve) => setTimeout(resolve, 300));

		const fetchImage = async (): Promise<FeaturePanelImageData | null> => {
			// 1. propDataからの画像
			if (data?.image) {
				return {
					url: data.image,
					alt: targetLayer?.metaData.name ?? '画像',
					source: 'static',
					fit: 'contain'
				};
			}

			// 2. featureMenuDataのプロパティからの画像
			if (featureMenuData?.properties && imageKey) {
				const url = featureMenuData.properties[imageKey] as string;
				if (url) {
					return {
						url,
						alt: '画像',
						source: 'static',
						fit: 'contain'
					};
				}
			}

			// 3. iNaturalist APIからの画像
			if (iNaturalistNameKey && featureMenuData?.properties) {
				const name = featureMenuData.properties[iNaturalistNameKey] as string;
				if (name) {
					const res = await getImageByName(name);

					if (res) {
						return {
							url: res.url,
							alt: name,
							source: 'inaturalist',
							credit: res.attribution,
							licenseName: res.licenseCode,
							linkUrl: `https://www.inaturalist.org/taxa/${res.taxonId}`,
							fit: 'contain'
						};
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
		return Promise.resolve(null as FeaturePanelImageData | null);
	});

	const getSummaryData = (
		image: FeaturePanelImageData | null,
		hasMediaCarousel: boolean
	): FeaturePanelSummaryData | null => {
		if (!featureMenuData) return null;

		if (propId && featureMenuData.properties && featureMenuData.properties._prop_id) {
			return {
				title: String(featureMenuData.properties.name ?? targetLayer?.metaData.name ?? ''),
				subtitle:
					typeof featureMenuData.properties.category === 'string'
						? featureMenuData.properties.category
						: undefined,
				image: hasMediaCarousel ? undefined : (image ?? undefined),
				description: data?.description ?? undefined,
				sourceUrl: data?.url ?? undefined,
				sourceLabel: '詳細を見る'
			};
		}

		const title =
			targetLayer &&
			targetLayer.type === 'vector' &&
			targetLayer.properties.attributeView.titles.length &&
			featureMenuData.properties
				? generatePopupTitle(
						featureMenuData.properties,
						targetLayer.properties.attributeView.titles
					)
				: targetLayer?.metaData.name;

		return {
			title: title ?? '',
			subtitle: targetLayer?.metaData.name,
			image: hasMediaCarousel ? undefined : (image ?? undefined),
			description: data?.description ?? undefined,
			sourceUrl: data?.url ?? undefined,
			sourceLabel: '詳細を見る'
		};
	};

	$effect(() => {
		if (!featureMenuData) {
			showSelectionMarker = false;
		}
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
		{@const hasMediaCarousel = Boolean(data?.medias && data.medias.length > 0)}
		<!-- 画像 -->
		{#if hasMediaCarousel && data?.medias}
			<div in:fade={{ duration: 100 }} class="relative w-full max-lg:py-2 lg:p-2">
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
			</div>
		{/if}

		{@const summaryData = getSummaryData(imageData, hasMediaCarousel)}
		{#if summaryData}
			<FeaturePanelSummary summary={summaryData} />
		{/if}

		<div in:fade={{ duration: 100 }} class="lg:pl-2">
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
