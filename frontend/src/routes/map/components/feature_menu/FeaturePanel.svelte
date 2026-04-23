<script lang="ts">
	import Icon from '@iconify/svelte';

	import { getLayerFeaturePanelSummary } from './feature-panel-summary';
	import FeaturePanelFrame from './FeaturePanelFrame.svelte';
	import FeaturePanelLayerContent from './FeaturePanelLayerContent.svelte';
	import FeaturePanelLoading from './FeaturePanelLoading.svelte';
	import FeaturePanelSummary from './FeaturePanelSummary.svelte';

	import type { WikiArticle } from '$routes/map/api/wikipedia';
	import { getWikipediaArticle } from '$routes/map/api/wikipedia';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type {
		FeaturePanelData,
		FeaturePanelSummary as FeaturePanelSummaryData,
		LayerFeaturePanelData,
		SearchAddressPanelData
	} from '$routes/map/types';
	import { normalizeSchoolName } from '$routes/map/utils/data/normalize';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';

	interface Props {
		panelData: FeaturePanelData | null;
		layerEntries: GeoDataEntry[];
		showSelectionMarker: boolean;
		onClose: () => void;
	}

	let { panelData, layerEntries, showSelectionMarker = $bindable(), onClose }: Props = $props();

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

	const edit = () => {
		if (targetLayer && targetLayer.type === 'vector') {
			selectedLayerId.set(targetLayer.id);
			isStyleEdit.set(true);
			onClose(); // Close the feature menu after editing
		}
	};

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
</script>

<!-- PC -->
<FeaturePanelFrame
	open={panelData !== null}
	transition={panelData?.kind === 'search-address' ? 'fly' : 'scale'}
	{onClose}
>
	{#snippet headerActions()}
		{#if panelData?.kind === 'layer-feature' && panelData.layerId !== 'fac_poi'}
			<button
				onclick={edit}
				class="c-btn-confirm flex items-center justify-center gap-2 px-3 py-1 pr-4 max-lg:hidden"
			>
				<Icon icon="uil:setting" class="h-6 w-6" />
				<span class="text-sm select-none">スタイルの変更</span>
			</button>
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
				summary={contentData.summary}
			/>
		{:else if contentData?.kind === 'search-address'}
			<FeaturePanelSummary summary={contentData.summary} />
		{/if}
	{/await}
</FeaturePanelFrame>
