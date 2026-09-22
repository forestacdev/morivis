<script lang="ts">
	import FeaturePanelAttributes from './FeaturePanelAttributes.svelte';
	import FeaturePanelHeader from './FeaturePanelHeader.svelte';
	import FeaturePanelLoading from './FeaturePanelLoading.svelte';
	import FeaturePanelTabs from './FeaturePanelTabs.svelte';
	import { getReferencePoiDetails } from './reference-poi-details';

	import type { FeatureMenuData } from '$routes/map/types';

	let { data }: { data: FeatureMenuData } = $props();
	let detailsPromise = $derived(getReferencePoiDetails(data));
</script>

{#await detailsPromise}
	<FeaturePanelLoading />
{:then details}
	{#if details.brandInformationLabel}
		<div class="px-2 pt-2 text-sm text-gray-300">
			<p class="font-bold">{details.brandInformationLabel}</p>
			<p>説明・画像はブランド全体の情報です。</p>
		</div>
	{/if}
	<FeaturePanelHeader summary={details.summary} />
	<div class="flex flex-wrap gap-3 px-2 py-3 text-sm">
		{#each details.links as link (link.label)}
			<a
				href={link.url}
				target="_blank"
				rel="noopener noreferrer"
				class="text-accent hover:underline">{link.label}</a
			>
		{/each}
	</div>
	{#each details.notices as notice (notice)}
		<p class="px-2 pb-2 text-sm text-gray-300" role="status">{notice}</p>
	{/each}
	{#if details.searchCandidate}
		<p class="px-2 pb-2 text-sm text-gray-300">
			Wikipediaの検索候補：
			<a
				href={details.searchCandidate.url}
				target="_blank"
				rel="noopener noreferrer"
				class="text-accent hover:underline">{details.searchCandidate.title}</a
			>
		</p>
	{/if}
	{#if details.summary.description?.text.trim()}
		<FeaturePanelTabs
			summary={details.summary}
			attributeItems={details.attributeItems}
			fields={[]}
			resetKey={`${data.layerId}:${data.featureId}`}
		/>
	{:else}
		<FeaturePanelAttributes
			summary={details.summary}
			attributeItems={details.attributeItems}
			fields={[]}
		/>
	{/if}
{:catch}
	<p class="p-4" role="alert">POIの情報を表示できませんでした。もう一度選択してください。</p>
{/await}
