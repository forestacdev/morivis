<script lang="ts">
	import { delay } from 'es-toolkit';
	import { fade } from 'svelte/transition';

	import { getImageByName } from '$routes/map/api/inaturalist';
	import AttributeItem from '$routes/map/components/feature_menu/AttributeItem.svelte';
	import FeaturePanelSummary from '$routes/map/components/feature_menu/FeaturePanelSummary.svelte';
	import { propData, type MediaData } from '$routes/map/data/entries/_prop_data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { filterByPopupKeys } from '$routes/map/data/types/vector/properties';
	import type {
		FeatureMenuData,
		FeaturePanelMedia,
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
	 * メディアデータを取得する共通Promise
	 * - data.medias: propDataからの複数メディア
	 * - data.image: propDataからの画像
	 * - imageKey: featureMenuDataのプロパティからの画像
	 * - iNaturalistNameKey: iNaturalist APIからの画像
	 */
	const getMediaData = async (): Promise<FeaturePanelMedia[]> => {
		const delay = new Promise((resolve) => setTimeout(resolve, 300));

		const fetchMedia = async (): Promise<FeaturePanelMedia[]> => {
			if (data?.medias && data.medias.length > 0) {
				return data.medias.map((media) => convertMediaData(media));
			}

			// 1. propDataからの画像
			if (data?.image) {
				return [
					{
						type: 'image',
						url: data.image,
						alt: targetLayer?.metaData.name ?? '画像',
						source: 'static',
						fit: 'contain'
					}
				];
			}

			// 2. featureMenuDataのプロパティからの画像
			if (featureMenuData?.properties && imageKey) {
				const url = featureMenuData.properties[imageKey] as string;
				if (url) {
					return [
						{
							type: 'image',
							url,
							alt: '画像',
							source: 'static',
							fit: 'contain'
						}
					];
				}
			}

			// 3. iNaturalist APIからの画像
			if (iNaturalistNameKey && featureMenuData?.properties) {
				const name = featureMenuData.properties[iNaturalistNameKey] as string;
				if (name) {
					const res = await getImageByName(name);

					if (res) {
						return [
							{
								type: 'image',
								url: res.url,
								alt: name,
								source: 'inaturalist',
								credit: res.attribution,
								licenseName: res.licenseCode,
								linkUrl: `https://www.inaturalist.org/taxa/${res.taxonId}`,
								fit: 'contain'
							}
						];
					}
				}
			}

			return [];
		};

		const [result] = await Promise.all([fetchMedia(), delay]);
		return result;
	};

	const convertMediaData = (media: MediaData): FeaturePanelMedia => {
		if (media.type === 'image') {
			return {
				type: 'image',
				url: media.url,
				alt: targetLayer?.metaData.name ?? '画像',
				source: 'static',
				fit: 'cover'
			};
		}

		if (media.type === 'youtube') {
			return {
				type: 'youtube',
				url: media.url,
				title: targetLayer?.metaData.name ?? 'YouTube video'
			};
		}

		if (media.type === 'video') {
			return {
				type: 'video',
				url: media.url,
				title: targetLayer?.metaData.name ?? '動画'
			};
		}

		return {
			type: 'audio',
			url: media.url,
			title: targetLayer?.metaData.name ?? '音声',
			source: 'static'
		};
	};

	// メディアデータのPromise（featureMenuDataが変わったら再取得）
	let mediaPromise = $derived.by(() => {
		if (featureMenuData) {
			return getMediaData();
		}
		return Promise.resolve([] as FeaturePanelMedia[]);
	});

	const getSummaryData = (media: FeaturePanelMedia[]): FeaturePanelSummaryData | null => {
		if (!featureMenuData) return null;

		if (propId && featureMenuData.properties && featureMenuData.properties._prop_id) {
			return {
				title: String(featureMenuData.properties.name ?? targetLayer?.metaData.name ?? ''),
				subtitle:
					typeof featureMenuData.properties.category === 'string'
						? featureMenuData.properties.category
						: undefined,
				media,
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
			media,
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
	{#await mediaPromise}
		<!-- ローディング中 -->
		<div class="absolute inset-0 flex flex-col items-center gap-4 max-lg:pt-32 lg:justify-center">
			<div
				class="border-t-accent h-12 w-12 animate-spin rounded-full border-4 border-gray-300"
			></div>
			<p class="text-gray-400">読み込み中...</p>
		</div>
	{:then mediaData}
		{@const summaryData = getSummaryData(mediaData)}
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
