<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import type { GaussianSplatEntry } from '$routes/map/data/types/model';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: GaussianSplatEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	$effect(() => {
		$state.snapshot(layerEntry.style);
		mapStore.setModelStyle(layerEntry);
	});
</script>

<Accordion label="スプラット表示" icon="mdi:blur" bind:value={showColorOption}>
	<RangeSlider
		label="スプラットサイズ"
		bind:value={layerEntry.style.splatScale}
		min={0.1}
		max={5}
		step={0.05}
		icon="mdi:circle-outline"
	/>
	<p class="pb-2 text-sm text-base/70">色・透明度はPLYの3D Gaussian Splatting属性を使用します。</p>
</Accordion>
