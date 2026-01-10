<script lang="ts">
	import Accordion from '../../atoms/Accordion.svelte';
	import RangeSliderDouble from '../../atoms/RangeSliderDouble.svelte';
	import ColorScaleDem from '../extension_menu/ColorScaleDem.svelte';

	import StyleColorMapPulldownBox from '$routes/map/components/layer_style_menu/extension_menu/StyleColorMapPulldownBox.svelte';
	import DemStyleModePulldownBox from '$routes/map/components/layer_style_menu/raster_option/DemStyleModePulldownBox.svelte';
	import type { ColorMapType, RasterDemEntry } from '$routes/map/data/types/raster';
	import { COLOR_MAP_TYPE } from '$routes/map/data/types/raster';
	import { ColorMapManager } from '$routes/map/utils/color_mapping';

	const colorMapManager = new ColorMapManager();

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
		<StyleColorMapPulldownBox
			bind:isColorMap={layerEntry.style.visualization.uniformsData['relief'].colorMap}
			mutableColorMapType={[...COLOR_MAP_TYPE]}
		>
			{#snippet children(_isColorMap)}
				<ColorScaleDem isColorMap={_isColorMap as ColorMapType} />
			{/snippet}
		</StyleColorMapPulldownBox>
		<RangeSliderDouble
			label="標高数値範囲"
			bind:lowerValue={layerEntry.style.visualization.uniformsData['relief'].min}
			bind:upperValue={layerEntry.style.visualization.uniformsData['relief'].max}
			max={rangeMax}
			min={rangeMin}
			step={0.01}
			primaryColor={colorMapManager.createSimpleCSSGradient(
				layerEntry.style.visualization.uniformsData['relief'].colorMap
			)}
			minRangeColor={colorMapManager.getMinColor(
				layerEntry.style.visualization.uniformsData['relief'].colorMap
			)}
			maxRangeColor={colorMapManager.getMaxColor(
				layerEntry.style.visualization.uniformsData['relief'].colorMap
			)}
		/>
	{/if}

	{#if layerEntry.style?.visualization.uniformsData['slope'] && layerEntry.style.visualization.mode === 'slope'}
		<StyleColorMapPulldownBox
			bind:isColorMap={layerEntry.style.visualization.uniformsData['slope'].colorMap}
			mutableColorMapType={[...COLOR_MAP_TYPE]}
		>
			{#snippet children(_isColorMap)}
				<ColorScaleDem isColorMap={_isColorMap as ColorMapType} />
			{/snippet}
		</StyleColorMapPulldownBox>

		<RangeSliderDouble
			label="傾斜量数値範囲"
			bind:lowerValue={layerEntry.style.visualization.uniformsData['slope'].min}
			bind:upperValue={layerEntry.style.visualization.uniformsData['slope'].max}
			max={90}
			min={0}
			step={0.01}
			primaryColor={colorMapManager.createSimpleCSSGradient(
				layerEntry.style.visualization.uniformsData['slope'].colorMap
			)}
			minRangeColor={colorMapManager.getMinColor(
				layerEntry.style.visualization.uniformsData['slope'].colorMap
			)}
			maxRangeColor={colorMapManager.getMaxColor(
				layerEntry.style.visualization.uniformsData['slope'].colorMap
			)}
		/>
	{/if}

	{#if layerEntry.style?.visualization.uniformsData['aspect'] && layerEntry.style.visualization.mode === 'aspect'}
		<StyleColorMapPulldownBox
			bind:isColorMap={layerEntry.style.visualization.uniformsData['aspect'].colorMap}
			mutableColorMapType={[...COLOR_MAP_TYPE]}
		>
			{#snippet children(_isColorMap)}
				<ColorScaleDem isColorMap={_isColorMap as ColorMapType} />
			{/snippet}
		</StyleColorMapPulldownBox>
	{/if}
</Accordion>

<style>
</style>
