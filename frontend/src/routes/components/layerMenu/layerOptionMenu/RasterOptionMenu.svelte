<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import { onMount } from 'svelte';

	import CheckBox from '$routes/components/atoms/CheckBox.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import type {
		RasterEntry,
		RasterCategoricalStyle,
		RasterBaseMapStyle
	} from '$routes/data/types/raster';
	import { generateNumberAndColorMap } from '$routes/utils/colorMapping';

	let {
		layerEntry = $bindable()
	}: { layerEntry: RasterEntry<RasterCategoricalStyle | RasterBaseMapStyle> } = $props();

	let style = $derived(layerEntry.style);

	onMount(() => {});
</script>

{#if layerEntry && layerEntry.type === 'raster' && style}
	<RangeSlider label={'不透明度'} bind:value={style.opacity} min={0} max={1} step={0.01} />
	<!-- レイヤータイプの選択 -->
	{#if style.type === 'basemap'}
		<RangeSlider
			label={'明るさ-最小輝度'}
			bind:value={style.brightnessMin}
			min={0}
			max={1}
			step={0.01}
		/>
		<RangeSlider
			label={'明るさ-最大輝度'}
			bind:value={style.brightnessMax}
			min={0}
			max={1}
			step={0.01}
		/>
		<RangeSlider label={'コントラスト'} bind:value={style.contrast} min={-1} max={1} step={0.01} />
		<RangeSlider label={'色相'} bind:value={style.hueRotate} min={-360} max={360} step={0.1} />
		<RangeSlider label={'彩度'} bind:value={style.saturation} min={-1} max={1} step={0.01} />
	{:else if style.type === 'categorical'}
		<h1>凡例</h1>
		{#if style.legend.type === 'category'}
			<h2>{style.legend.name}</h2>
			<ul class="">
				{#each style.legend.colors as color, i}
					<li style="display: flex; align-items: center; margin-bottom: 5px;">
						<span
							style="width: 20px; height: 20px; background-color: {color}; margin-right: 10px; display: inline-block;"
						>
						</span>
						<span>{style.legend.labels[i]}</span>
					</li>
				{/each}
			</ul>
		{:else if style.legend.type === 'gradient'}
			<h2>{style.legend.name}</h2>
			<div class="flex h-[200px] gap-2">
				<div class="h-full py-[10px]">
					<div
						class="h-full w-[30px]"
						style="background: linear-gradient(0deg, {style.legend.colors[0]} 0%, {style.legend
							.colors[1]} 100%);"
					></div>
				</div>

				<div class="flex flex-col justify-between">
					{#each style.legend.range.slice().reverse() as value}
						<span>{value} {style.legend.unit}</span>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
{/if}

<style>
</style>
