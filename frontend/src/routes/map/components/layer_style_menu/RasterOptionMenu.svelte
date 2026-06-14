<script lang="ts">
	import CategoricalLegend from './raster_option/CategoricalLegend.svelte';
	import DemOption from './raster_option/DemOption.svelte';
	import DimensionSelector from './raster_option/DimensionSelector.svelte';
	import RasterPresetPulldownBox from './raster_option/RasterPresetPulldownBox.svelte';
	import TiffOption from './raster_option/TiffOption.svelte';
	import Accordion from '../atoms/Accordion.svelte';

	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import type {
		MorivisRasterEntry,
		RasterCategoricalStyle,
		RasterBaseMapStyle,
		RasterDemStyle,
		DemRasterEntry,
		RasterTiffStyle,
		RasterCadStyle
	} from '$routes/map/data/types/raster';
	import { getLayerImage } from '$routes/map/utils/image';
	import { getRasterDimension } from '$routes/map/utils/raster/dimension-runtime';
	import {
		getRasterStylePreset,
		type RasterStylePreset
	} from '$routes/map/utils/style/raster-preset';

	interface Props {
		layerEntry: MorivisRasterEntry<
			| RasterCategoricalStyle
			| RasterBaseMapStyle
			| RasterDemStyle
			| RasterTiffStyle
			| RasterCadStyle
		>;
		showColorOption: boolean;
		showDimensionOption: boolean;
	}

	let {
		layerEntry = $bindable(),
		showColorOption = $bindable(),
		showDimensionOption = $bindable()
	}: Props = $props();

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

{#if getRasterDimension(layerEntry)}
	<DimensionSelector bind:layerEntry bind:showDimensionOption />
{/if}
{#if layerEntry && layerEntry.type === 'raster' && style}
	<!-- レイヤータイプの選択 -->
	{#if style.type === 'basemap'}
		{#await promise then imageResult}
			{#if imageResult}
				<Accordion
					label={'描画の調整'}
					icon={'material-symbols:image'}
					bind:value={showColorOption}
				>
					<RasterPresetPulldownBox
						bind:preset={style.preset}
						src={imageResult.url}
						disabled={showOption}
					/>
				</Accordion>
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
		<CategoricalLegend {style} />
	{:else if style.type === 'dem'}
		<DemOption bind:layerEntry={layerEntry as DemRasterEntry} bind:showColorOption />
	{:else if style.type === 'tiff'}
		<TiffOption
			bind:layerEntry={layerEntry as MorivisRasterEntry<RasterTiffStyle>}
			bind:showColorOption
			bind:showDimensionOption
		/>
	{:else if style.type === 'cad'}
		<div class="mt-8">
			<ColorPicker bind:value={style.color} label={'ラインの色'} />
		</div>
	{/if}
{/if}

<style>
</style>
