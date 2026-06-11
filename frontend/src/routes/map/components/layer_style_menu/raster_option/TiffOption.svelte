<script lang="ts">
	import DimensionSelector from './DimensionSelector.svelte';
	import Accordion from '../../atoms/Accordion.svelte';
	import ColorScaleDem from '../extension_menu/ColorScaleDem.svelte';

	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import BaseSelectMenu from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import ColorMapSelect from '$routes/map/components/atoms/select/ColorMapSelect.svelte';
	import { createAdjustableRange } from '$routes/map/data/types';
	import {
		type ColorMapType,
		type DerivedBandData,
		type RasterEntry,
		type RasterTiffStyle
	} from '$routes/map/data/types/raster';
	import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
	import { SEQUENTIAL_SCHEMES } from '$routes/map/utils/color/color-brewer';
	import { COLORMAP_PRESET_NAMES } from '$routes/map/utils/color/colormap-presets';
	import {
		ensureRasterDerivedCache,
		getTopexCacheKey,
		getTwiCacheKey
	} from '$routes/map/utils/formats/geotiff';
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
	const twiRange = $derived(GeoTiffCache.getDataRanges(getTwiCacheKey(layerEntry.id))?.[0]);
	const slopeRange = $derived({ min: 0, max: 90 });
	const aspectRange = $derived({ min: 0, max: 360 });
	const tpiRange = $derived({ min: -1, max: 1 });
	const topexRange = $derived(GeoTiffCache.getDataRanges(getTopexCacheKey(layerEntry.id))?.[0]);
	const hasDerivedModes = $derived(numBands === 1 && GeoTiffCache.hasRawSingleBand(layerEntry.id));
	let generatingDerivedMode = $state<string | null>(null);
	let lastHandledMode = $state<string | null>(null);
	const toAdjustableRange = (min: number, max: number) => ({
		value: [min, max] as [number, number],
		domain: [min, max] as [number, number]
	});
	/** min/maxからスライダーのstepを動的に算出 */
	const calcStep = (min: number, max: number): number => {
		const range = Math.abs(max - min);
		if (range === 0) return 1;
		// 約1000段階になるstepを算出し、きれいな数値に丸める
		const raw = range / 1000;
		const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
		return Math.max(magnitude, 0.001);
	};

	const tiffStyleModes = $derived.by(() => {
		const items = [{ key: 'single', name: '段彩図', icon: 'mdi:terrain' }];

		if (hasDerivedModes) {
			items.push({ key: 'slope', name: '傾斜量', icon: 'mdi:terrain' });
			items.push({ key: 'aspect', name: '傾斜方位', icon: 'mdi:compass-outline' });
			items.push({ key: 'tpi', name: '地形位置指数', icon: 'mdi:chart-bell-curve-cumulative' });
			items.push({ key: 'topex', name: '地形露出度', icon: 'mdi:image-filter-hdr' });
			items.push({ key: 'twi', name: '地形湿潤指数', icon: 'mdi:water-percent' });
		}

		if (numBands > 1) {
			items.push({ key: 'multi', name: 'RGB合成', icon: 'boxicons:rgb-filled' });
		}

		return items;
	});
	const isDerivedModeLoading = $derived(
		layerEntry.style.visualization.mode === 'twi' || layerEntry.style.visualization.mode === 'topex'
			? generatingDerivedMode === layerEntry.style.visualization.mode
			: false
	);

	const ensureDerivedData = () => {
		if (
			layerEntry.style.visualization.mode === 'twi' &&
			twiRange &&
			!layerEntry.style.visualization.uniformsData.twi
		) {
			layerEntry.style.visualization.uniformsData.twi = {
				colorMap: 'hsv',
				range: toAdjustableRange(twiRange.min, twiRange.max)
			};
			return;
		}

		if (
			layerEntry.style.visualization.mode === 'slope' &&
			!layerEntry.style.visualization.uniformsData.slope
		) {
			layerEntry.style.visualization.uniformsData.slope = {
				colorMap: 'salinity',
				range: toAdjustableRange(slopeRange.min, slopeRange.max)
			};
			return;
		}

		if (
			layerEntry.style.visualization.mode === 'aspect' &&
			!layerEntry.style.visualization.uniformsData.aspect
		) {
			layerEntry.style.visualization.uniformsData.aspect = {
				colorMap: 'rainbow-soft',
				range: toAdjustableRange(aspectRange.min, aspectRange.max)
			};
			return;
		}

		if (
			layerEntry.style.visualization.mode === 'tpi' &&
			!layerEntry.style.visualization.uniformsData.tpi
		) {
			layerEntry.style.visualization.uniformsData.tpi = {
				colorMap: 'rdbu',
				range: toAdjustableRange(tpiRange.min, tpiRange.max)
			};
			return;
		}

		if (
			layerEntry.style.visualization.mode === 'topex' &&
			topexRange &&
			!layerEntry.style.visualization.uniformsData.topex
		) {
			layerEntry.style.visualization.uniformsData.topex = {
				colorMap: 'rdbu',
				range: toAdjustableRange(topexRange.min, topexRange.max)
			};
		}
	};

	const createDerivedDefaultStyle = (
		mode: 'twi' | 'slope' | 'aspect' | 'tpi' | 'topex'
	): DerivedBandData => {
		if (mode === 'twi') {
			return {
				colorMap: 'hsv',
				range: toAdjustableRange(twiRange?.min ?? 0, twiRange?.max ?? 1)
			};
		}
		if (mode === 'slope') {
			return {
				colorMap: 'salinity',
				range: toAdjustableRange(slopeRange?.min ?? 0, slopeRange?.max ?? 90)
			};
		}
		if (mode === 'aspect') {
			return {
				colorMap: 'rainbow-soft',
				range: toAdjustableRange(aspectRange?.min ?? 0, aspectRange?.max ?? 360)
			};
		}
		if (mode === 'topex') {
			return {
				colorMap: 'rdbu',
				range: toAdjustableRange(topexRange?.min ?? -90, topexRange?.max ?? 90)
			};
		}
		return {
			colorMap: 'rdbu',
			range: toAdjustableRange(tpiRange?.min ?? -1, tpiRange?.max ?? 1)
		};
	};

	const activateDerivedMode = async (mode: 'twi' | 'slope' | 'aspect' | 'tpi' | 'topex') => {
		if (mode === 'twi' && !layerEntry.style.visualization.uniformsData.twi) {
			layerEntry.style.visualization.uniformsData.twi = createDerivedDefaultStyle(mode);
		}
		if (mode === 'slope' && !layerEntry.style.visualization.uniformsData.slope) {
			layerEntry.style.visualization.uniformsData.slope = createDerivedDefaultStyle(mode);
		}
		if (mode === 'aspect' && !layerEntry.style.visualization.uniformsData.aspect) {
			layerEntry.style.visualization.uniformsData.aspect = createDerivedDefaultStyle(mode);
		}
		if (mode === 'tpi' && !layerEntry.style.visualization.uniformsData.tpi) {
			layerEntry.style.visualization.uniformsData.tpi = createDerivedDefaultStyle(mode);
		}
		if (mode === 'topex' && !layerEntry.style.visualization.uniformsData.topex) {
			layerEntry.style.visualization.uniformsData.topex = createDerivedDefaultStyle(mode);
		}

		if (mode === 'twi' || mode === 'topex') {
			await ensureDerivedCacheForMode();
		}
		ensureDerivedData();
	};

	const ensureDerivedCacheForMode = async () => {
		const mode = layerEntry.style.visualization.mode;
		if (mode !== 'twi' && mode !== 'topex') {
			return;
		}

		if (generatingDerivedMode === mode) return;

		const currentRange = mode === 'twi' ? twiRange : topexRange;
		if (currentRange) return;

		generatingDerivedMode = mode;
		try {
			await ensureRasterDerivedCache(layerEntry.id, mode);
		} finally {
			generatingDerivedMode = null;
		}
	};

	$effect(() => {
		const single = layerEntry.style.visualization.uniformsData.single;
		single.range ??= createAdjustableRange(single.min ?? rangeMin, single.max ?? rangeMax);
		const { twi, slope, aspect, tpi, topex } = layerEntry.style.visualization.uniformsData;
		if (twi) twi.range ??= createAdjustableRange(twi.min ?? 0, twi.max ?? 1);
		if (slope) slope.range ??= createAdjustableRange(slope.min ?? 0, slope.max ?? 90);
		if (aspect) aspect.range ??= createAdjustableRange(aspect.min ?? 0, aspect.max ?? 360);
		if (tpi) tpi.range ??= createAdjustableRange(tpi.min ?? -1, tpi.max ?? 1);
		if (topex) topex.range ??= createAdjustableRange(topex.min ?? -90, topex.max ?? 90);
		for (const key of ['r', 'g', 'b'] as const) {
			const channel = layerEntry.style.visualization.uniformsData.multi[key];
			const channelRange = dataRanges?.[channel.index];
			channel.range ??= createAdjustableRange(
				channel.min ?? channelRange?.min ?? 0,
				channel.max ?? channelRange?.max ?? 65535
			);
		}
	});

	$effect(() => {
		if (layerEntry.style.visualization.mode === 'twi' && !hasDerivedModes) {
			layerEntry.style.visualization.mode = 'single';
		}
		if (layerEntry.style.visualization.mode === 'slope' && !hasDerivedModes) {
			layerEntry.style.visualization.mode = 'single';
		}
		if (layerEntry.style.visualization.mode === 'aspect' && !hasDerivedModes) {
			layerEntry.style.visualization.mode = 'single';
		}
		if (layerEntry.style.visualization.mode === 'tpi' && !hasDerivedModes) {
			layerEntry.style.visualization.mode = 'single';
		}
		if (layerEntry.style.visualization.mode === 'topex' && !hasDerivedModes) {
			layerEntry.style.visualization.mode = 'single';
		}
	});

	$effect(() => {
		const mode = layerEntry.style.visualization.mode;
		if (mode === lastHandledMode) return;
		lastHandledMode = mode;

		if (
			mode === 'twi' ||
			mode === 'slope' ||
			mode === 'aspect' ||
			mode === 'tpi' ||
			mode === 'topex'
		) {
			void activateDerivedMode(mode);
		}
	});
</script>

<Accordion label="色の調整" icon="mdi:paint" bind:value={showColorOption}>
	<BaseSelectMenu bind:selectedKey={layerEntry.style.visualization.mode} items={tiffStyleModes} />
	{#if isDerivedModeLoading}
		<div class="bg-sub/60 mb-2 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-gray-200">
			<div class="border-t-accent h-4 w-4 animate-spin rounded-full border-2 border-gray-300"></div>
			<span>地形解析を計算中です...</span>
		</div>
	{/if}
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
							layerEntry.style.visualization.uniformsData.single.range = toAdjustableRange(
								newRange.min,
								newRange.max
							);
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
			bind:lowerValue={layerEntry.style.visualization.uniformsData['single'].range!.value[0]}
			bind:upperValue={layerEntry.style.visualization.uniformsData['single'].range!.value[1]}
			max={layerEntry.style.visualization.uniformsData['single'].range!.domain[1]}
			min={layerEntry.style.visualization.uniformsData['single'].range!.domain[0]}
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
	{:else if layerEntry.style.visualization.mode === 'twi'}
		<div class:opacity-60={isDerivedModeLoading} class:pointer-events-none={isDerivedModeLoading}>
			{#if layerEntry.style.visualization.uniformsData.twi}
				<ColorMapSelect
					bind:isColorMap={layerEntry.style.visualization.uniformsData.twi.colorMap}
					mutableColorMapType={colorMapOptions}
				>
					{#snippet children(_isColorMap)}
						<ColorScaleDem isColorMap={_isColorMap} />
					{/snippet}
				</ColorMapSelect>
				<RangeSliderDouble
					label="数値範囲"
					bind:lowerValue={layerEntry.style.visualization.uniformsData.twi.range!.value[0]}
					bind:upperValue={layerEntry.style.visualization.uniformsData.twi.range!.value[1]}
					min={layerEntry.style.visualization.uniformsData.twi.range!.domain[0]}
					max={layerEntry.style.visualization.uniformsData.twi.range!.domain[1]}
					step={calcStep(twiRange?.min ?? 0, twiRange?.max ?? 1)}
					primaryColor={colorMapManager.createSimpleCSSGradient(
						layerEntry.style.visualization.uniformsData.twi.colorMap
					)}
					minRangeColor={colorMapManager.getMinColor(
						layerEntry.style.visualization.uniformsData.twi.colorMap
					)}
					maxRangeColor={colorMapManager.getMaxColor(
						layerEntry.style.visualization.uniformsData.twi.colorMap
					)}
				/>
			{:else}
				<div class="py-3 text-sm text-gray-300">地形湿潤指数を計算中です。</div>
			{/if}
		</div>
	{:else if layerEntry.style.visualization.mode === 'slope'}
		<div class:opacity-60={isDerivedModeLoading} class:pointer-events-none={isDerivedModeLoading}>
			{#if layerEntry.style.visualization.uniformsData.slope}
				<ColorMapSelect
					bind:isColorMap={layerEntry.style.visualization.uniformsData.slope.colorMap}
					mutableColorMapType={colorMapOptions}
				>
					{#snippet children(_isColorMap)}
						<ColorScaleDem isColorMap={_isColorMap} />
					{/snippet}
				</ColorMapSelect>
				<RangeSliderDouble
					label="数値範囲"
					bind:lowerValue={layerEntry.style.visualization.uniformsData.slope.range!.value[0]}
					bind:upperValue={layerEntry.style.visualization.uniformsData.slope.range!.value[1]}
					min={layerEntry.style.visualization.uniformsData.slope.range!.domain[0]}
					max={layerEntry.style.visualization.uniformsData.slope.range!.domain[1]}
					step={calcStep(slopeRange?.min ?? 0, slopeRange?.max ?? 90)}
					primaryColor={colorMapManager.createSimpleCSSGradient(
						layerEntry.style.visualization.uniformsData.slope.colorMap
					)}
					minRangeColor={colorMapManager.getMinColor(
						layerEntry.style.visualization.uniformsData.slope.colorMap
					)}
					maxRangeColor={colorMapManager.getMaxColor(
						layerEntry.style.visualization.uniformsData.slope.colorMap
					)}
				/>
			{:else}
				<div class="py-3 text-sm text-gray-300">傾斜量を計算中です。</div>
			{/if}
		</div>
	{:else if layerEntry.style.visualization.mode === 'aspect'}
		<div class:opacity-60={isDerivedModeLoading} class:pointer-events-none={isDerivedModeLoading}>
			{#if layerEntry.style.visualization.uniformsData.aspect}
				<ColorMapSelect
					bind:isColorMap={layerEntry.style.visualization.uniformsData.aspect.colorMap}
					mutableColorMapType={colorMapOptions}
				>
					{#snippet children(_isColorMap)}
						<ColorScaleDem isColorMap={_isColorMap} />
					{/snippet}
				</ColorMapSelect>
				<RangeSliderDouble
					label="数値範囲"
					bind:lowerValue={layerEntry.style.visualization.uniformsData.aspect.range!.value[0]}
					bind:upperValue={layerEntry.style.visualization.uniformsData.aspect.range!.value[1]}
					min={layerEntry.style.visualization.uniformsData.aspect.range!.domain[0]}
					max={layerEntry.style.visualization.uniformsData.aspect.range!.domain[1]}
					step={calcStep(aspectRange?.min ?? 0, aspectRange?.max ?? 360)}
					primaryColor={colorMapManager.createSimpleCSSGradient(
						layerEntry.style.visualization.uniformsData.aspect.colorMap
					)}
					minRangeColor={colorMapManager.getMinColor(
						layerEntry.style.visualization.uniformsData.aspect.colorMap
					)}
					maxRangeColor={colorMapManager.getMaxColor(
						layerEntry.style.visualization.uniformsData.aspect.colorMap
					)}
				/>
			{:else}
				<div class="py-3 text-sm text-gray-300">傾斜方位を計算中です。</div>
			{/if}
		</div>
	{:else if layerEntry.style.visualization.mode === 'tpi'}
		<div class:opacity-60={isDerivedModeLoading} class:pointer-events-none={isDerivedModeLoading}>
			{#if layerEntry.style.visualization.uniformsData.tpi}
				<ColorMapSelect
					bind:isColorMap={layerEntry.style.visualization.uniformsData.tpi.colorMap}
					mutableColorMapType={colorMapOptions}
				>
					{#snippet children(_isColorMap)}
						<ColorScaleDem isColorMap={_isColorMap} />
					{/snippet}
				</ColorMapSelect>
				<RangeSliderDouble
					label="数値範囲"
					bind:lowerValue={layerEntry.style.visualization.uniformsData.tpi.range!.value[0]}
					bind:upperValue={layerEntry.style.visualization.uniformsData.tpi.range!.value[1]}
					min={layerEntry.style.visualization.uniformsData.tpi.range!.domain[0]}
					max={layerEntry.style.visualization.uniformsData.tpi.range!.domain[1]}
					step={calcStep(tpiRange?.min ?? -1, tpiRange?.max ?? 1)}
					primaryColor={colorMapManager.createSimpleCSSGradient(
						layerEntry.style.visualization.uniformsData.tpi.colorMap
					)}
					minRangeColor={colorMapManager.getMinColor(
						layerEntry.style.visualization.uniformsData.tpi.colorMap
					)}
					maxRangeColor={colorMapManager.getMaxColor(
						layerEntry.style.visualization.uniformsData.tpi.colorMap
					)}
				/>
			{:else}
				<div class="py-3 text-sm text-gray-300">地形位置指数を計算中です。</div>
			{/if}
		</div>
	{:else if layerEntry.style.visualization.mode === 'topex'}
		<div class:opacity-60={isDerivedModeLoading} class:pointer-events-none={isDerivedModeLoading}>
			{#if layerEntry.style.visualization.uniformsData.topex}
				<ColorMapSelect
					bind:isColorMap={layerEntry.style.visualization.uniformsData.topex.colorMap}
					mutableColorMapType={colorMapOptions}
				>
					{#snippet children(_isColorMap)}
						<ColorScaleDem isColorMap={_isColorMap} />
					{/snippet}
				</ColorMapSelect>
				<RangeSliderDouble
					label="数値範囲"
					bind:lowerValue={layerEntry.style.visualization.uniformsData.topex.range!.value[0]}
					bind:upperValue={layerEntry.style.visualization.uniformsData.topex.range!.value[1]}
					min={layerEntry.style.visualization.uniformsData.topex.range!.domain[0]}
					max={layerEntry.style.visualization.uniformsData.topex.range!.domain[1]}
					step={calcStep(topexRange?.min ?? -90, topexRange?.max ?? 90)}
					primaryColor={colorMapManager.createSimpleCSSGradient(
						layerEntry.style.visualization.uniformsData.topex.colorMap
					)}
					minRangeColor={colorMapManager.getMinColor(
						layerEntry.style.visualization.uniformsData.topex.colorMap
					)}
					maxRangeColor={colorMapManager.getMaxColor(
						layerEntry.style.visualization.uniformsData.topex.colorMap
					)}
				/>
			{:else}
				<div class="py-3 text-sm text-gray-300">地形露出度を計算中です。</div>
			{/if}
		</div>
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
									layerEntry.style.visualization.uniformsData.multi[key].range = toAdjustableRange(
										newRange.min,
										newRange.max
									);
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
							bind:lowerValue={
								layerEntry.style.visualization.uniformsData.multi[key].range!.value[0]
							}
							bind:upperValue={
								layerEntry.style.visualization.uniformsData.multi[key].range!.value[1]
							}
							min={layerEntry.style.visualization.uniformsData.multi[key].range!.domain[0]}
							max={layerEntry.style.visualization.uniformsData.multi[key].range!.domain[1]}
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
