<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';

	import FeaturePanelSummary from './FeaturePanelSummary.svelte';
	import FeatureSidePanel from './FeatureSidePanel.svelte';
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
		onClose: () => void;
		children: Snippet;
	}

	let { panelData, layerEntries, onClose, children }: Props = $props();

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
<FeatureSidePanel
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
		{@render children()}
	{:else if panelData?.kind === 'search-address'}
		{#await getWikipedia(panelData)}
			<!-- ローディング中 -->
			<div class="flex h-full w-full flex-col items-center justify-center gap-4">
				<div
					class="border-t-accent h-12 w-12 animate-spin rounded-full border-4 border-gray-300"
				></div>
				<p class="text-gray-400">読み込み中...</p>
			</div>
		{:then wikiMenuData}
			<FeaturePanelSummary summary={getSearchAddressSummary(panelData, wikiMenuData)} />
			<!-- 余白 -->
			<div class="h-[200px] w-full shrink-0"></div>
		{/await}
	{/if}
</FeatureSidePanel>
