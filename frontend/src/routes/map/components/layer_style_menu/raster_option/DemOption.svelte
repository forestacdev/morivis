<script lang="ts">
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import DemStyleColorMapPulldownBox from '$routes/map/components/layer_style_menu/raster_option/DemStyleColorMapPulldownBox.svelte';
	import DemStyleModePulldownBox from '$routes/map/components/layer_style_menu/raster_option/DemStyleModePulldownBox.svelte';
	import type { RasterDemEntry } from '$routes/map/data/types/raster';
	import Accordion from '../../atoms/Accordion.svelte';
	import RangeSliderDouble from '../../atoms/RangeSliderDouble.svelte';

	interface Props {
		layerEntry: RasterDemEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	const rangeMax = $state.raw(layerEntry.style.visualization.uniformsData['relief'].max);
	const rangeMin = $state.raw(layerEntry.style.visualization.uniformsData['relief'].min);
</script>

<Accordion label={'色の調整'} icon={'mdi:paint'} bind:value={showColorOption}>
	<DemStyleModePulldownBox bind:isMode={layerEntry.style.visualization.mode} {layerEntry} />
	{#if layerEntry.style.visualization.mode === 'relief'}
		<DemStyleColorMapPulldownBox
			bind:isColorMap={layerEntry.style.visualization.uniformsData['relief'].colorMap}
		/>
		<RangeSliderDouble
			label="数値範囲"
			bind:lowerValue={layerEntry.style.visualization.uniformsData['relief'].min}
			bind:upperValue={layerEntry.style.visualization.uniformsData['relief'].max}
			max={rangeMax}
			min={rangeMin}
			step={0.01}
		/>
	{/if}

	{#if layerEntry.style?.visualization.uniformsData['slope'] && layerEntry.style.visualization.mode === 'slope'}
		<DemStyleColorMapPulldownBox
			bind:isColorMap={layerEntry.style.visualization.uniformsData['slope'].colorMap}
		/>
		<RangeSlider
			label="最大傾斜量"
			bind:value={layerEntry.style.visualization.uniformsData['slope'].max}
			max={90}
			min={0}
			step={0.01}
		/>

		<RangeSlider
			label="最小傾斜量"
			bind:value={layerEntry.style.visualization.uniformsData['slope'].min}
			max={90}
			min={0}
			step={0.01}
		/>
	{/if}

	{#if layerEntry.style?.visualization.uniformsData['aspect'] && layerEntry.style.visualization.mode === 'aspect'}
		<DemStyleColorMapPulldownBox
			bind:isColorMap={layerEntry.style.visualization.uniformsData['aspect'].colorMap}
		/>
	{/if}
</Accordion>

<style>
</style>
