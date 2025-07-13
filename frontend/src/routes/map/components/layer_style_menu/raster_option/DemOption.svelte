<script lang="ts">
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import DemStyleColorMapPulldownBox from '$routes/map/components/layer_style_menu/raster_option/DemStyleColorMapPulldownBox.svelte';
	import DemStyleModePulldownBox from '$routes/map/components/layer_style_menu/raster_option/DemStyleModePulldownBox.svelte';
	import type { RasterDemStyle } from '$routes/map/data/types/raster';
	import Accordion from '../../atoms/Accordion.svelte';

	interface Props {
		style: RasterDemStyle;
		showColorOption: boolean;
	}

	let { style = $bindable(), showColorOption = $bindable() }: Props = $props();
</script>

<Accordion label={'色の調整'} bind:value={showColorOption}>
	<DemStyleModePulldownBox bind:isMode={style.visualization.mode} />
	{#if style.visualization.mode === 'relief'}
		<DemStyleColorMapPulldownBox
			bind:isColorMap={style.visualization.uniformsData['relief'].colorMap}
		/>
		<RangeSlider
			label="最大値"
			bind:value={style.visualization.uniformsData['relief'].max}
			max={5000}
			min={0}
			step={0.01}
		/>

		<RangeSlider
			label="最小値"
			bind:value={style.visualization.uniformsData['relief'].min}
			max={5000}
			min={0}
			step={0.01}
		/>
	{/if}

	{#if style.visualization.mode === 'slope'}
		<DemStyleColorMapPulldownBox
			bind:isColorMap={style.visualization.uniformsData['slope'].colorMap}
		/>
		<RangeSlider
			label="最大傾斜量"
			bind:value={style.visualization.uniformsData['slope'].max}
			max={90}
			min={0}
			step={0.01}
		/>

		<RangeSlider
			label="最小傾斜量"
			bind:value={style.visualization.uniformsData['slope'].min}
			max={90}
			min={0}
			step={0.01}
		/>
	{/if}

	{#if style.visualization.mode === 'aspect'}
		<DemStyleColorMapPulldownBox
			bind:isColorMap={style.visualization.uniformsData['aspect'].colorMap}
		/>
	{/if}
</Accordion>

<style>
</style>
