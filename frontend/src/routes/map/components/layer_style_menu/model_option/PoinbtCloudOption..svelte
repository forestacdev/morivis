<script lang="ts">
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import type { PointCloudStyleEntry } from '$routes/map/data/types/model';

	interface Props {
		layerEntry: PointCloudStyleEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
</script>

<div class="mt-8">
	<RangeSlider
		label="ポイントサイズ"
		min={0}
		max={10}
		step={0.1}
		bind:value={layerEntry.style.pointSize}
	/>
</div>

<style>
</style>
