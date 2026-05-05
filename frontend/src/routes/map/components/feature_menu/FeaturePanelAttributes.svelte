<script lang="ts">
	import { fade } from 'svelte/transition';

	import FeaturePanelAttributeItem from '$routes/map/components/feature_menu/FeaturePanelAttributeItem.svelte';
	import type { FieldDef } from '$routes/map/data/types/vector/properties';
	import type { FeaturePanelSummary as FeaturePanelSummaryData } from '$routes/map/types';

	interface Props {
		summary: FeaturePanelSummaryData;
		attributeItems: [string, string | number | true][];
		fields: FieldDef[];
	}

	let { summary, attributeItems, fields }: Props = $props();
</script>

<div in:fade={{ duration: 100 }} class="lg:pl-2">
	<div class="mb-56 flex h-full w-full flex-col gap-3 pt-3 pr-2">
		{#each attributeItems as [key, value] (key)}
			{@const field = fields.find((f) => f.key === key)}
			<FeaturePanelAttributeItem {key} {value} {field} />
		{/each}
	</div>
</div>
