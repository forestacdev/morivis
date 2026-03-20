<script lang="ts">
	import Accordion from '../../atoms/Accordion.svelte';
	import ColorScaleDem from '../extension_menu/ColorScaleDem.svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import StyleColorMapPulldownBox from '$routes/map/components/layer_style_menu/extension_menu/StyleColorMapPulldownBox.svelte';
	import TiffStyleModePulldownBox from '$routes/map/components/layer_style_menu/raster_option/TiffStyleModePulldownBox.svelte';
	import { COLOR_MAP_TYPE, type RasterTiffStyle } from '$routes/map/data/types/raster';
	import { ColorMapManager } from '$routes/map/utils/color_mapping';
	import { GeoTiffCache } from '$routes/map/utils/file/geotiff';
	const colorMapManager = new ColorMapManager();
	interface Props {
		style: RasterTiffStyle;
		entryId: string;
		showColorOption: boolean;
	}

	let { style = $bindable(), entryId, showColorOption = $bindable() }: Props = $props();

	const dataRanges = $derived(GeoTiffCache.getDataRanges(entryId));

	const numBands = $derived(style.visualization.numBands);

	const BAND_CHANNELS = [
		{ key: 'r' as const, label: 'R', color: '#ef4444' },
		{ key: 'g' as const, label: 'G', color: '#22c55e' },
		{ key: 'b' as const, label: 'B', color: '#3b82f6' }
	];

	const singleRange = $derived(dataRanges?.[style.visualization.uniformsData.single.index]);
	const rangeMin = $derived(singleRange?.min ?? 0);
	const rangeMax = $derived(singleRange?.max ?? 65535);
</script>

<Accordion label={'色の調整'} icon={'mdi:paint'} bind:value={showColorOption}>
	<TiffStyleModePulldownBox bind:isMode={style.visualization.mode} />
	{#if style.visualization.mode === 'single'}
		{#if numBands > 1}
			<div class="flex items-center gap-2 py-2">
				<span class="text-sm">バンド</span>
				<select
					class="c-select w-20 text-sm"
					bind:value={style.visualization.uniformsData.single.index}
				>
					{#each Array.from({ length: numBands }, (_, i) => i) as bandIdx}
						<option value={bandIdx}>{bandIdx + 1}</option>
					{/each}
				</select>
			</div>
		{/if}
		<StyleColorMapPulldownBox
			bind:isColorMap={style.visualization.uniformsData['single'].colorMap}
			mutableColorMapType={[...COLOR_MAP_TYPE]}
		>
			{#snippet children(_isColorMap)}
				<ColorScaleDem isColorMap={_isColorMap} />
			{/snippet}
		</StyleColorMapPulldownBox>
		<RangeSliderDouble
			label="数値範囲"
			bind:lowerValue={style.visualization.uniformsData['single'].min}
			bind:upperValue={style.visualization.uniformsData['single'].max}
			max={rangeMax}
			min={rangeMin}
			step={0.1}
			primaryColor={colorMapManager.createSimpleCSSGradient(
				style.visualization.uniformsData['single'].colorMap
			)}
			minRangeColor={colorMapManager.getMinColor(
				style.visualization.uniformsData['single'].colorMap
			)}
			maxRangeColor={colorMapManager.getMaxColor(
				style.visualization.uniformsData['single'].colorMap
			)}
		/>
	{:else if style.visualization.mode === 'multi'}
		<div class="flex flex-col gap-3 py-2">
			{#each BAND_CHANNELS as { key, label, color }}
				{@const bandIdx = style.visualization.uniformsData.multi[key].index}
				{@const range = dataRanges?.[bandIdx]}
				<div class="flex flex-col gap-2">
					<div class="flex items-center gap-2">
						<span class="text-sm">{label} バンド</span>
						<select
							class="c-select w-20 text-sm"
							bind:value={style.visualization.uniformsData.multi[key].index}
						>
							{#each Array.from({ length: numBands }, (_, i) => i) as bandIdx}
								<option value={bandIdx}>{bandIdx + 1}</option>
							{/each}
						</select>
					</div>

					<div class="">
						<RangeSliderDouble
							label="範囲"
							bind:lowerValue={style.visualization.uniformsData.multi[key].min}
							bind:upperValue={style.visualization.uniformsData.multi[key].max}
							min={range?.min ?? 0}
							max={range?.max ?? 65535}
							step={0.1}
							primaryColor={color}
						/>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Accordion>

<style>
</style>
