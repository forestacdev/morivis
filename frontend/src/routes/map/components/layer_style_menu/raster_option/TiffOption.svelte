<script lang="ts">
	import DimensionSelector from './DimensionSelector.svelte';
	import Accordion from '../../atoms/Accordion.svelte';
	import ColorScaleDem from '../extension_menu/ColorScaleDem.svelte';

	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import BaseSelectMenu from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import ColorMapSelect from '$routes/map/components/atoms/select/ColorMapSelect.svelte';
	import { type RasterEntry, type RasterTiffStyle } from '$routes/map/data/types/raster';
	import { SEQUENTIAL_SCHEMES } from '$routes/map/utils/color/color-brewer';
	import { COLORMAP_PRESET_NAMES } from '$routes/map/utils/color/colormap-presets';
	import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
	import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
	const colorMapManager = new ColorMapManager();
	const colorMapOptions = [...SEQUENTIAL_SCHEMES, ...COLORMAP_PRESET_NAMES];
	interface Props {
		layerEntry: RasterEntry<RasterTiffStyle>;
		showColorOption: boolean;
		showDimensionOption: boolean;
	}

	let {
		layerEntry = $bindable(),
		showColorOption = $bindable(),
		showDimensionOption = $bindable()
	}: Props = $props();

	const dataRanges = $derived(GeoTiffCache.getDataRanges(layerEntry.id));

	const numBands = $derived(layerEntry.properties?.bands?.numBands ?? 1);

	const BAND_CHANNELS = [
		{ key: 'r' as const, label: 'R', color: '#ef4444' },
		{ key: 'g' as const, label: 'G', color: '#22c55e' },
		{ key: 'b' as const, label: 'B', color: '#3b82f6' }
	];

	const singleRange = $derived(
		dataRanges?.[layerEntry.style.visualization.uniformsData.single.index]
	);
	const rangeMin = $derived(singleRange?.min ?? 0);
	const rangeMax = $derived(singleRange?.max ?? 65535);

	/** min/maxからスライダーのstepを動的に算出 */
	const calcStep = (min: number, max: number): number => {
		const range = Math.abs(max - min);
		if (range === 0) return 1;
		// 約1000段階になるstepを算出し、きれいな数値に丸める
		const raw = range / 1000;
		const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
		return Math.max(magnitude, 0.001);
	};

	let tiffStyleModes = $state([
		{ key: 'single', name: 'カラーマップ', icon: 'mdi:format-color-highlight' },
		{ key: 'multi', name: 'RGB合成', icon: 'boxicons:rgb-filled' }
		// { key: 'shadow', name: '陰影' },
		// { key: 'slope', name: '傾斜量' },
		// { key: 'aspect', name: '傾斜方向' },
		// { key: 'curvature', name: '曲率' }
	]);
</script>

<Accordion label="色の調整" icon="mdi:paint" bind:value={showColorOption}>
	<BaseSelectMenu bind:selectedKey={layerEntry.style.visualization.mode} items={tiffStyleModes} />
	{#if layerEntry.style.visualization.mode === 'single'}
		{#if numBands > 1}
			<div class="flex items-center gap-2 py-2">
				<span class="text-base text-sm">バンド</span>
				<select
					class="c-select w-20 text-sm"
					bind:value={layerEntry.style.visualization.uniformsData.single.index}
					onchange={() => {
						const newRange = dataRanges?.[layerEntry.style.visualization.uniformsData.single.index];
						if (newRange) {
							layerEntry.style.visualization.uniformsData.single.min = newRange.min;
							layerEntry.style.visualization.uniformsData.single.max = newRange.max;
						}
					}}
				>
					{#each Array.from({ length: numBands }, (_, i) => i) as bandIdx (bandIdx)}
						<option value={bandIdx}>{bandIdx + 1}</option>
					{/each}
				</select>
			</div>
		{/if}
		<ColorMapSelect
			bind:isColorMap={layerEntry.style.visualization.uniformsData['single'].colorMap}
			mutableColorMapType={colorMapOptions}
		>
			{#snippet children(_isColorMap)}
				<ColorScaleDem isColorMap={_isColorMap} />
			{/snippet}
		</ColorMapSelect>
		<RangeSliderDouble
			label="数値範囲"
			bind:lowerValue={layerEntry.style.visualization.uniformsData['single'].min}
			bind:upperValue={layerEntry.style.visualization.uniformsData['single'].max}
			max={rangeMax}
			min={rangeMin}
			step={calcStep(rangeMin, rangeMax)}
			primaryColor={colorMapManager.createSimpleCSSGradient(
				layerEntry.style.visualization.uniformsData['single'].colorMap
			)}
			minRangeColor={colorMapManager.getMinColor(
				layerEntry.style.visualization.uniformsData['single'].colorMap
			)}
			maxRangeColor={colorMapManager.getMaxColor(
				layerEntry.style.visualization.uniformsData['single'].colorMap
			)}
		/>
	{:else if layerEntry.style.visualization.mode === 'multi'}
		<div class="flex flex-col gap-3 py-2">
			{#each BAND_CHANNELS as { key, label, color } (key)}
				{@const bandIdx = layerEntry.style.visualization.uniformsData.multi[key].index}
				{@const range = dataRanges?.[bandIdx]}
				<div class="flex flex-col gap-2">
					<div class="flex items-center gap-2">
						<span class="text-base text-sm">{label} バンド</span>
						<select
							class="c-select w-20 text-sm"
							bind:value={layerEntry.style.visualization.uniformsData.multi[key].index}
							onchange={() => {
								const newIdx = layerEntry.style.visualization.uniformsData.multi[key].index;
								const newRange = dataRanges?.[newIdx];
								if (newRange) {
									layerEntry.style.visualization.uniformsData.multi[key].min = newRange.min;
									layerEntry.style.visualization.uniformsData.multi[key].max = newRange.max;
								}
							}}
						>
							{#each Array.from({ length: numBands }, (_, i) => i) as bandIdx (bandIdx)}
								<option value={bandIdx}>{bandIdx + 1}</option>
							{/each}
						</select>
					</div>

					<div class="">
						<RangeSliderDouble
							label="範囲"
							bind:lowerValue={layerEntry.style.visualization.uniformsData.multi[key].min}
							bind:upperValue={layerEntry.style.visualization.uniformsData.multi[key].max}
							min={range?.min ?? 0}
							max={range?.max ?? 65535}
							step={calcStep(range?.min ?? 0, range?.max ?? 65535)}
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
