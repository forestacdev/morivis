<script lang="ts">
	import type { Snippet } from 'svelte';

	import FeaturePanelAttributes from './FeaturePanelAttributes.svelte';
	import FeaturePanelSummaryBody from './FeaturePanelSummaryBody.svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type { FieldDef } from '$routes/map/data/types/vector/properties';
	import type { FeaturePanelSummary as FeaturePanelSummaryData } from '$routes/map/types';

	interface Props {
		summary: FeaturePanelSummaryData;
		attributeItems: [string, string | number | true][];
		fields: FieldDef[];
		resetKey: string;
		defaultTab?: 'summary' | 'attributes';
		summaryContent?: Snippet;
	}

	let {
		summary,
		attributeItems,
		fields,
		resetKey,
		defaultTab = 'summary',
		summaryContent
	}: Props = $props();
	let selectedTab = $derived.by(() => {
		void resetKey;
		return defaultTab;
	});
</script>

<div class="mb-2 lg:px-2">
	<HorizontalSelectBox
		bind:group={selectedTab}
		options={[
			{ key: 'summary', name: '概要' },
			{ key: 'attributes', name: '情報' }
		]}
	/>
</div>

{#if selectedTab === 'summary'}
	{#if summaryContent}
		{@render summaryContent()}
	{:else}
		<FeaturePanelSummaryBody {summary} />
	{/if}
{:else}
	<FeaturePanelAttributes {summary} {attributeItems} {fields} />
{/if}
