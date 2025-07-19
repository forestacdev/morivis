<script lang="ts">
	import DemOption from './raster_option/DemOption.svelte';
	import TiffOption from './raster_option/TiffOption.svelte';

	import CheckBox from '$routes/map/components/atoms/CheckBox.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import RasterPresetPulldownBox from '$routes/map/components/layer_style_menu/raster_option/RasterPresetPullDownBox.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type {
		RasterEntry,
		RasterCategoricalStyle,
		RasterBaseMapStyle,
		RasterDemStyle,
		RasterDemEntry,
		RasterTiffStyle
	} from '$routes/map/data/types/raster';
	import { generateNumberAndColorMap } from '$routes/map/utils/color_mapping';
	import Accordion from '../atoms/Accordion.svelte';
	import { getRasterStylePreset, type RasterStylePreset } from '$routes/map/utils/raster';
	import { getLayerImage } from '$routes/map/utils/image';

	interface Props {
		layerEntry: RasterEntry<
			RasterCategoricalStyle | RasterBaseMapStyle | RasterDemStyle | RasterTiffStyle
		>;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	let style = $derived(layerEntry.style);

	let showOption = $state<boolean>(false);

	let preset = $derived.by(() => {
		if (style.type === 'basemap') {
			return style.preset;
		} else {
			return undefined;
		}
	});
	let previousPreset: RasterStylePreset | undefined = undefined;

	const promise = (() => {
		try {
			return getLayerImage(layerEntry);
		} catch (error) {
			console.error('Error generating icon image:', error);
			return Promise.resolve(undefined);
		}
	})();

	$effect(() => {
		if (preset && preset !== previousPreset) {
			if (style.type === 'basemap') {
				layerEntry.style = {
					...style,
					...getRasterStylePreset(preset as RasterStylePreset)
				};
			}
			previousPreset = preset;
		}
	});
</script>

{#if layerEntry && layerEntry.type === 'raster' && style}
	<!-- レイヤータイプの選択 -->
	{#if style.type === 'basemap'}
		{#await promise then imageResult}
			{#if imageResult}
				<RasterPresetPulldownBox
					bind:preset={style.preset}
					src={imageResult.url}
					disabled={showOption}
				/>
			{/if}
		{/await}

		<!-- <Accordion label={'詳細設定'} bind:value={showOption}>
			<div class="flex w-full flex-col gap-2">
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
				<RangeSlider
					label={'コントラスト'}
					bind:value={style.contrast}
					min={-1}
					max={1}
					step={0.01}
				/>
				<RangeSlider label={'色相'} bind:value={style.hueRotate} min={-360} max={360} step={0.1} />
				<RangeSlider label={'彩度'} bind:value={style.saturation} min={-1} max={1} step={0.01} />
			</div>
		</Accordion> -->
	{:else if style.type === 'categorical'}
		<h1 class="text-base">凡例</h1>
		{#if style.legend.type === 'category'}
			<h2 class="text-base">{style.legend.name}</h2>
			<ul class="text-base">
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
			<h2 class="text-base">{style.legend.name}</h2>
			<div class="flex h-[200px] gap-2 text-base">
				<div class="h-full py-[10px]">
					<div
						class="h-full w-[30px]"
						style="background: linear-gradient(0deg, {style.legend.colors[0]} 0%, {style.legend
							.colors[1]} 100%);"
					></div>
				</div>

				<div class="flex flex-col justify-between text-base">
					{#each style.legend.range.slice().reverse() as value}
						<span>{value} {style.legend.unit}</span>
					{/each}
				</div>
			</div>
		{/if}
	{:else if style.type === 'dem'}
		<DemOption bind:layerEntry={layerEntry as RasterDemEntry} bind:showColorOption />
	{:else if style.type === 'tiff'}
		<TiffOption bind:style />
	{/if}
{/if}

<style>
</style>
