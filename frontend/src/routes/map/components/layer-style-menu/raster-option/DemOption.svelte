<script lang="ts">
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import DemStyleColorMapPulldownBox from '$routes/map/components/layer-style-menu/raster-option/DemStyleColorMapPulldownBox.svelte';
	import DemStyleModePulldownBox from '$routes/map/components/layer-style-menu/raster-option/DemStyleModePulldownBox.svelte';
	import type { RasterDemStyle } from '$routes/map/data/types/raster';

	interface Props {
		style: RasterDemStyle;
	}

	let { style = $bindable() }: Props = $props();
</script>

<RangeSlider label="不透明度" bind:value={style.opacity} min={0} max={1} step={0.01} />

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

{#if style.visualization.mode === 'curvature'}
	<DemStyleColorMapPulldownBox
		bind:isColorMap={style.visualization.uniformsData['curvature'].colorMap}
	/>
{/if}

<style>
</style>
