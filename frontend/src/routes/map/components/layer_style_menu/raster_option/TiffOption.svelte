<script lang="ts">
	import ColorScaleDem from '../extension_menu/ColorScaleDem.svelte';

	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import StyleColorMapPulldownBox from '$routes/map/components/layer_style_menu/extension_menu/StyleColorMapPulldownBox.svelte';
	import TiffStyleModePulldownBox from '$routes/map/components/layer_style_menu/raster_option/TiffStyleModePulldownBox.svelte';
	import { COLOR_MAP_TYPE, type RasterTiffStyle } from '$routes/map/data/types/raster';

	interface Props {
		style: RasterTiffStyle;
	}

	let { style = $bindable() }: Props = $props();
</script>

<RangeSlider label="不透明度" bind:value={style.opacity} min={0} max={1} step={0.01} />

<TiffStyleModePulldownBox bind:isMode={style.visualization.mode} />
{#if style.visualization.mode === 'single'}
	<StyleColorMapPulldownBox
		bind:isColorMap={style.visualization.uniformsData['single'].colorMap}
		mutableColorMapType={[...COLOR_MAP_TYPE]}
	>
		{#snippet children(_isColorMap)}
			<ColorScaleDem isColorMap={_isColorMap} />
		{/snippet}
	</StyleColorMapPulldownBox>
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
