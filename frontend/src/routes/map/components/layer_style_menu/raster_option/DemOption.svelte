<script lang="ts">
	import { style } from '$routes/_development/maptreestyle/style';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import DemStyleColorMapPulldownBox from '$routes/map/components/layer_style_menu/raster_option/DemStyleColorMapPulldownBox.svelte';
	import DemStyleModePulldownBox from '$routes/map/components/layer_style_menu/raster_option/DemStyleModePulldownBox.svelte';
	import type { RasterDemStyle, RasterDemEntry } from '$routes/map/data/types/raster';
	import Accordion from '../../atoms/Accordion.svelte';

	interface Props {
		layerEntry: RasterDemEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
</script>

<Accordion label={'色の調整'} icon={'mdi:paint'} bind:value={showColorOption}>
	<DemStyleModePulldownBox bind:isMode={layerEntry.style.visualization.mode} {layerEntry} />
	{#if layerEntry.style.visualization.mode === 'relief'}
		<DemStyleColorMapPulldownBox
			bind:isColorMap={layerEntry.style.visualization.uniformsData['relief'].colorMap}
		/>
		<RangeSlider
			label="最大値"
			bind:value={layerEntry.style.visualization.uniformsData['relief'].max}
			max={5000}
			min={0}
			step={0.01}
		/>

		<RangeSlider
			label="最小値"
			bind:value={layerEntry.style.visualization.uniformsData['relief'].min}
			max={5000}
			min={0}
			step={0.01}
		/>
	{/if}

	{#if layerEntry.style.visualization.mode === 'slope'}
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

	{#if layerEntry.style.visualization.mode === 'aspect'}
		<DemStyleColorMapPulldownBox
			bind:isColorMap={layerEntry.style.visualization.uniformsData['aspect'].colorMap}
		/>
	{/if}
</Accordion>

<style>
</style>
