<script lang="ts">
	import FeaturePanelHeader from './FeaturePanelHeader.svelte';
	import FeaturePanelSummaryBody from './FeaturePanelSummaryBody.svelte';

	import type { FeaturePanelSummary } from '$routes/map/types';

	interface Props {
		summary: FeaturePanelSummary;
	}

	let { summary }: Props = $props();
</script>

<FeaturePanelHeader {summary} />
<FeaturePanelSummaryBody {summary} />
