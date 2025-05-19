<script lang="ts">
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import DemStyleColorMapPulldownBox from '$routes/components/layer-style-menu/raster-option/DemStyleColorMapPulldownBox.svelte';
	import TiffStyleModePulldownBox from '$routes/components/layer-style-menu/raster-option/TiffStyleModePulldownBox.svelte';
	import type { RasterTiffStyle } from '$routes/data/types/raster';

	interface Props {
		style: RasterTiffStyle;
	}

	let { style = $bindable() }: Props = $props();
</script>

<RangeSlider label="不透明度" bind:value={style.opacity} min={0} max={1} step={0.01} />

<TiffStyleModePulldownBox bind:isMode={style.visualization.mode} />
{#if style.visualization.mode === 'single'}
	<DemStyleColorMapPulldownBox
		bind:isColorMap={style.visualization.uniformsData['single'].colorMap}
	/>
	<RangeSlider
		label="最大値"
		bind:value={style.visualization.uniformsData['single'].max}
		max={5000}
		min={0}
		step={0.01}
	/>

	<RangeSlider
		label="最小値"
		bind:value={style.visualization.uniformsData['single'].min}
		max={5000}
		min={0}
		step={0.01}
	/>
{/if}

<style>
</style>
