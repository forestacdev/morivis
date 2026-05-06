<script lang="ts">
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
	}

	let { summary, attributeItems, fields, resetKey }: Props = $props();
	let selectedTab = $state<'summary' | 'attributes'>('summary');

	$effect(() => {
		void resetKey;
		selectedTab = 'summary';
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
	<FeaturePanelSummaryBody {summary} />
{:else}
	<FeaturePanelAttributes {summary} {attributeItems} {fields} />
{/if}
