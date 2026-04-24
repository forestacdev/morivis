<script lang="ts">
	import { getLayerFeaturePanelSummary } from './feature-panel-summary';
	import FeaturePanelFrame from './FeaturePanelFrame.svelte';
	import FeaturePanelLayerContent from './FeaturePanelLayerContent.svelte';
	import FeaturePanelLoading from './FeaturePanelLoading.svelte';
	import FeaturePanelSummary from './FeaturePanelSummary.svelte';

	import type { WikiArticle } from '$routes/map/api/wikipedia';
	import { getWikipediaArticle } from '$routes/map/api/wikipedia';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { filterByPopupKeys } from '$routes/map/data/types/vector/properties';
	import type {
		FeaturePanelData,
		FeaturePanelSummary as FeaturePanelSummaryData,
		LayerFeaturePanelData,
		SearchAddressPanelData
	} from '$routes/map/types';
	import { normalizeSchoolName } from '$routes/map/utils/data/normalize';

	interface Props {
		panelData: FeaturePanelData | null;
		layerEntries: GeoDataEntry[];
		showSelectionMarker: boolean;
		onClose: () => void;
	}

	let { panelData, layerEntries, showSelectionMarker = $bindable(), onClose }: Props = $props();
	let selectedTab = $state<'summary' | 'attributes'>('summary');

	type PanelContentData =
		| {
				kind: 'layer-feature';
				panelData: LayerFeaturePanelData;
				summary: FeaturePanelSummaryData;
		  }
		| {
				kind: 'search-address';
				summary: FeaturePanelSummaryData;
		  };

	let targetLayer = $derived.by(() => {
		if (panelData?.kind !== 'layer-feature') return null;
		return layerEntries.find((entry) => entry.id === panelData.layerId) ?? null;
	});

	let hasAttributeTab = $derived.by(() => {
		if (panelData?.kind !== 'layer-feature' || !targetLayer || targetLayer.type !== 'vector') {
			return false;
		}

		if (!panelData.properties) return false;

		const propId = panelData.properties?._prop_id;
		if (propId) return false;

		const popupKeys = targetLayer.properties.attributeView.popupKeys;
		const imageKey = targetLayer.properties.attributeView.imageKey;
		const displayProps =
			popupKeys.length > 0
				? filterByPopupKeys(panelData.properties, popupKeys)
				: panelData.properties;

		return Object.entries(displayProps).some(
			([key, value]) =>
				key !== '_prop_id' &&
				value !== '' &&
				value !== null &&
				value !== undefined &&
				value !== false &&
				imageKey !== key
		);
	});

	let selectedTabResetKey = $derived.by(() => {
		if (!panelData) return null;
		if (panelData.kind === 'layer-feature') {
			return `${panelData.layerId}:${panelData.featureId}`;
		}
		return panelData.kind;
	});

	const getWikipedia = async (data: SearchAddressPanelData) => {
		const name = normalizeSchoolName(data.result.name);
		const res = await getWikipediaArticle(name);
		return Promise.resolve(res);
	};

	const getSearchAddressSummary = (
		data: SearchAddressPanelData,
		wiki: WikiArticle | null
	): FeaturePanelSummaryData => {
		const result = data.result;

		return {
			title: wiki?.title ?? result.name,
			subtitle: wiki?.prefecture ?? result.location,
			point: wiki?.coordinates ? [wiki.coordinates.lon, wiki.coordinates.lat] : result.point,
			media: wiki?.thumbnail?.source
				? [
						{
							type: 'image',
							url: wiki.thumbnail.source,
							alt: wiki.title,
							source: 'wikipedia',
							credit: wiki.imageLicense?.artist,
							licenseName: wiki.imageLicense?.licenseShortName,
							licenseUrl: wiki.imageLicense?.licenseUrl,
							linkUrl: wiki.url,
							fit: 'cover'
						}
					]
				: undefined,
			description: wiki?.extract,
			sourceUrl: wiki?.url,
			sourceLabel: 'Wikipediaを見る'
		};
	};

	const getPanelContentData = async (
		data: FeaturePanelData | null,
		entries: GeoDataEntry[]
	): Promise<PanelContentData | null> => {
		if (!data) return null;

		if (data.kind === 'layer-feature') {
			const summary = await getLayerFeaturePanelSummary(data, entries);
			if (!summary) return null;

			return {
				kind: 'layer-feature',
				panelData: data,
				summary
			};
		}

		if (data.kind === 'search-address') {
			const wiki = await getWikipedia(data);

			return {
				kind: 'search-address',
				summary: getSearchAddressSummary(data, wiki)
			};
		}

		return null;
	};

	let panelContentPromise = $derived(getPanelContentData(panelData, layerEntries));

	$effect(() => {
		void selectedTabResetKey;
		selectedTab = 'summary';
	});
</script>

<!-- PC -->
<FeaturePanelFrame
	open={panelData !== null}
	transition={panelData?.kind === 'search-address' ? 'fly' : 'scale'}
	{onClose}
>
	{#snippet headerActions()}
		{#if panelData?.kind === 'layer-feature' && hasAttributeTab}
			<div class="bg-sub inline-flex rounded-full">
				<button
					type="button"
					class={[
						'min-w-20 rounded-full px-4 py-2 text-sm transition-colors',
						selectedTab === 'summary' ? 'bg-accent text-black' : 'text-gray-300'
					]}
					aria-pressed={selectedTab === 'summary'}
					onclick={() => {
						selectedTab = 'summary';
					}}
				>
					概要
				</button>
				<button
					type="button"
					class={[
						'min-w-20 rounded-full px-4 py-2 text-sm transition-colors',
						selectedTab === 'attributes' ? 'bg-accent text-black' : 'text-gray-300'
					]}
					aria-pressed={selectedTab === 'attributes'}
					onclick={() => {
						selectedTab = 'attributes';
					}}
				>
					情報
				</button>
			</div>
		{/if}
	{/snippet}

	{#await panelContentPromise}
		<FeaturePanelLoading />
	{:then contentData}
		{#if contentData?.kind === 'layer-feature'}
			<FeaturePanelLayerContent
				featureMenuData={contentData.panelData}
				{layerEntries}
				bind:showSelectionMarker
				{selectedTab}
				summary={contentData.summary}
			/>
		{:else if contentData?.kind === 'search-address'}
			<FeaturePanelSummary summary={contentData.summary} />
		{/if}
	{/await}
</FeaturePanelFrame>
