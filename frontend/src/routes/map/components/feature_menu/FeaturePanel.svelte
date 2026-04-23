<script lang="ts">
	import Icon from '@iconify/svelte';

	import FeaturePanelLayerContent from './FeaturePanelLayerContent.svelte';
	import FeaturePanelFrame from './FeaturePanelFrame.svelte';
	import FeaturePanelLoading from './FeaturePanelLoading.svelte';
	import FeaturePanelSummary from './FeaturePanelSummary.svelte';

	import type { WikiArticle } from '$routes/map/api/wikipedia';
	import { getWikipediaArticle } from '$routes/map/api/wikipedia';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type {
		FeaturePanelData,
		FeaturePanelSummary as FeaturePanelSummaryData,
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

	{#if panelData?.kind === 'layer-feature'}
		<FeaturePanelLayerContent featureMenuData={panelData} {layerEntries} bind:showSelectionMarker />
	{:else if panelData?.kind === 'search-address'}
		{#await getWikipedia(panelData)}
			<FeaturePanelLoading />
		{:then wikiMenuData}
			<FeaturePanelSummary summary={getSearchAddressSummary(panelData, wikiMenuData)} />
		{/await}
	{/if}
</FeaturePanelFrame>
