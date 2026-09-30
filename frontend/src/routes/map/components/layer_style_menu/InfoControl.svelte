<script lang="ts">
	import AkarIconsInfoFillIcon from '$lib/components/svgs/icons/akar-icons/InfoFillIcon.svelte';
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import LayerInfo from '$routes/map/components/atoms/LayerInfo.svelte';
	import type { MorivisLayerEntry } from '$routes/map/data/types';

	interface Props {
		layerEntry: MorivisLayerEntry;
	}

	let { layerEntry }: Props = $props();
	let showInfoOption = $state(false);
</script>

<Accordion label="情報" icon={AkarIconsInfoFillIcon} bind:value={showInfoOption}>
	<LayerInfo metaData={layerEntry.metaData} descriptionSize="base" />
</Accordion>
