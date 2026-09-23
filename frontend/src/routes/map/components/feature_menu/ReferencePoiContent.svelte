<script lang="ts">
	import Icon from '@iconify/svelte';

	import FeaturePanelHeader from './FeaturePanelHeader.svelte';
	import FeaturePanelLoading from './FeaturePanelLoading.svelte';
	import FeaturePanelSummaryBody from './FeaturePanelSummaryBody.svelte';
	import FeaturePanelTabs from './FeaturePanelTabs.svelte';
	import { getReferencePoiDetails } from './reference-poi-details';

	import type { FeatureMenuData } from '$routes/map/types';

	let { data }: { data: FeatureMenuData } = $props();
	let detailsPromise = $derived(getReferencePoiDetails(data));

	const linkIcons: Record<string, string> = {
		公式サイト: 'lucide:globe',
		運行事業者: 'lucide:train-front',
		'時刻表（Yahoo!路線情報）': 'lucide:clock-3',
		'経路検索（Google マップ）': 'lucide:route',
		OpenStreetMap: 'lucide:map',
		YAMAPで検索: 'lucide:mountain'
	};
	const getLinkIcon = (label: string) =>
		linkIcons[label] ?? (label.includes('Wikipedia') ? 'mdi:wikipedia' : 'lucide:external-link');
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
	<FeaturePanelTabs
		summary={details.summary}
		attributeItems={details.attributeItems}
		fields={[]}
		resetKey={`${data.layerId}:${data.featureId}`}
	>
		{#snippet summaryContent()}
			{#if details.links.length > 0}
				<ul class="space-y-1 px-2 py-3 text-sm" aria-label="関連リンク">
					{#each details.links as link (link.label)}
						<li>
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								class="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-accent transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
							>
								<Icon icon={getLinkIcon(link.label)} class="h-5 w-5 shrink-0" aria-hidden="true" />
								<span>{link.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
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
			<FeaturePanelSummaryBody summary={details.summary} showCoordinates={false} />
		{/snippet}
	</FeaturePanelTabs>
{:catch}
	<p class="p-4" role="alert">POIの情報を表示できませんでした。もう一度選択してください。</p>
{/await}
