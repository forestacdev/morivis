<script lang="ts">
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import DemStyleColorMapPulldownBox from '$routes/components/layer-style-menu/raster-option/DemStyleColorMapPulldownBox.svelte';
	import DemStyleModePulldownBox from '$routes/components/layer-style-menu/raster-option/DemStyleModePulldownBox.svelte';
	import type { RasterDemStyle } from '$routes/data/types/raster';

	interface Props {
		style: RasterDemStyle;
	}

	let { style = $bindable() }: Props = $props();
</script>

<RangeSlider label="不透明度" bind:value={style.opacity} min={0} max={1} step={0.01} />
<h2 class="text-base">描画モード</h2>

<DemStyleModePulldownBox bind:isMode={style.visualization.mode} />
{#if style.visualization.mode === 'evolution'}
	<DemStyleColorMapPulldownBox
		bind:isColorMap={style.visualization.uniformsData['evolution'].colorMap}
	/>
	<RangeSlider
		label="最大標高"
		bind:value={style.visualization.uniformsData['evolution'].max}
		max={5000}
		min={0}
		step={0.01}
	/>

	<RangeSlider
		label="最小標高"
		bind:value={style.visualization.uniformsData['evolution'].min}
		max={5000}
		min={0}
		step={0.01}
	/>
{/if}

<style>
</style>
