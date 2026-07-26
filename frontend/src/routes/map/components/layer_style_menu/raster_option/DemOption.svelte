<script lang="ts">
	import DemColorLegend from './DemColorLegend.svelte';
	import Accordion from '../../atoms/Accordion.svelte';
	import RangeSlider from '../../atoms/RangeSlider.svelte';
	import RangeSliderDouble from '../../atoms/RangeSliderDouble.svelte';
	import ColorScaleDem from '../extension_menu/ColorScaleDem.svelte';

	import ColorMapSelect from '$routes/map/components/atoms/select/ColorMapSelect.svelte';
	import DemStyleModePulldownBox from '$routes/map/components/layer_style_menu/raster_option/DemStyleModePulldownBox.svelte';
	import { createAdjustableRange } from '$routes/map/data/types';
	import type { DemRangeColorStyle, DemRasterEntry } from '$routes/map/data/types/raster';
	import { SEQUENTIAL_SCHEMES } from '$routes/map/utils/color/color-brewer';
	import { COLORMAP_PRESET_NAMES } from '$routes/map/utils/color/colormap-presets';
	import {
		ColorMapManager,
		isDemStepColorStyle,
		toDemLinearColorStyle,
		toDemStepColorStyle
	} from '$routes/map/utils/style/color-mapping';

	const colorMapManager = new ColorMapManager();
	const linearColorMapOptions = [...COLORMAP_PRESET_NAMES];
	const stepColorMapOptions = [...SEQUENTIAL_SCHEMES];

	interface Props {
		layerEntry: DemRasterEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	$effect(() => {
		const relief = layerEntry.style.visualization.uniformsData.relief;
		relief.range ??= createAdjustableRange(relief.min ?? 0, relief.max ?? 0);
		const slope = layerEntry.style.visualization.uniformsData.slope;
		if (slope) {
			slope.range ??= createAdjustableRange(slope.min ?? 0, slope.max ?? 90);
		}
	});

	const setRangeStyleType = (
		key: 'relief' | 'slope',
		type: 'linear' | 'step',
		defaultDivisions: 3 | 4 | 5 | 6 | 7 | 8 | 9 = 5
	) => {
		const currentStyle = layerEntry.style.visualization.uniformsData[key];
		if (!currentStyle) return;

		layerEntry.style.visualization.uniformsData[key] =
			type === 'step'
				? toDemStepColorStyle(currentStyle, defaultDivisions)
				: toDemLinearColorStyle(currentStyle);
	};

	const getTypeButtonClass = (style: DemRangeColorStyle, type: 'linear' | 'step'): string => {
		const isActive =
			(isDemStepColorStyle(style) && type === 'step') ||
			(!isDemStepColorStyle(style) && type === 'linear');
		return isActive
			? 'bg-main-accent text-white'
			: 'bg-sub text-sub-text lg:hover:bg-white lg:hover:text-black';
	};
</script>

<Accordion label="描画の調整" icon="material-symbols:image" bind:value={showColorOption}>
	<div class="flex w-full flex-col gap-3">
		<DemStyleModePulldownBox bind:isMode={layerEntry.style.visualization.mode} {layerEntry} />

		{#if layerEntry.style.visualization.mode === 'relief'}
			<div class="flex items-center justify-between">
				<div class="text-base select-none">カラーランプ</div>
				<div class="flex gap-2">
					<button
						onclick={() => setRangeStyleType('relief', 'linear')}
						class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${getTypeButtonClass(layerEntry.style.visualization.uniformsData.relief, 'linear')}`}
					>
						連続
					</button>
					<button
						onclick={() => setRangeStyleType('relief', 'step')}
						class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${getTypeButtonClass(layerEntry.style.visualization.uniformsData.relief, 'step')}`}
					>
						段階
					</button>
				</div>
			</div>
			{#if isDemStepColorStyle(layerEntry.style.visualization.uniformsData.relief)}
				<ColorMapSelect
					showLabel={false}
					bind:isColorMap={layerEntry.style.visualization.uniformsData.relief.colorMap}
					mutableColorMapType={stepColorMapOptions}
				>
					{#snippet children(_isColorMap)}
						<ColorScaleDem isColorMap={_isColorMap} />
					{/snippet}
				</ColorMapSelect>
				{#if layerEntry.style.visualization.uniformsData.relief.range}
					<RangeSliderDouble
						label="標高数値範囲"
						bind:lowerValue={layerEntry.style.visualization.uniformsData.relief.range.value[0]}
						bind:upperValue={layerEntry.style.visualization.uniformsData.relief.range.value[1]}
						max={layerEntry.style.visualization.uniformsData.relief.range.domain[1]}
						min={layerEntry.style.visualization.uniformsData.relief.range.domain[0]}
						step={0.01}
						primaryColor={colorMapManager.createDemCSSGradient(
							layerEntry.style.visualization.uniformsData.relief
						)}
						minRangeColor={colorMapManager.getDemMinColor(
							layerEntry.style.visualization.uniformsData.relief
						)}
						maxRangeColor={colorMapManager.getDemMaxColor(
							layerEntry.style.visualization.uniformsData.relief
						)}
					/>
				{/if}
				<RangeSlider
					label="分類数"
					bind:value={layerEntry.style.visualization.uniformsData.relief.divisions}
					min={3}
					max={9}
					step={1}
					isInt={true}
				/>
				<DemColorLegend style={layerEntry.style.visualization.uniformsData.relief} />
			{:else}
				<ColorMapSelect
					showLabel={false}
					bind:isColorMap={layerEntry.style.visualization.uniformsData.relief.colorMap}
					mutableColorMapType={linearColorMapOptions}
				>
					{#snippet children(_isColorMap)}
						<ColorScaleDem isColorMap={_isColorMap} />
					{/snippet}
				</ColorMapSelect>
				{#if layerEntry.style.visualization.uniformsData.relief.range}
					<RangeSliderDouble
						label="標高数値範囲"
						bind:lowerValue={layerEntry.style.visualization.uniformsData.relief.range.value[0]}
						bind:upperValue={layerEntry.style.visualization.uniformsData.relief.range.value[1]}
						max={layerEntry.style.visualization.uniformsData.relief.range.domain[1]}
						min={layerEntry.style.visualization.uniformsData.relief.range.domain[0]}
						step={0.01}
						primaryColor={colorMapManager.createDemCSSGradient(
							layerEntry.style.visualization.uniformsData.relief
						)}
						minRangeColor={colorMapManager.getDemMinColor(
							layerEntry.style.visualization.uniformsData.relief
						)}
						maxRangeColor={colorMapManager.getDemMaxColor(
							layerEntry.style.visualization.uniformsData.relief
						)}
					/>
				{/if}
			{/if}
		{/if}

		{#if layerEntry.style?.visualization.uniformsData.slope && layerEntry.style.visualization.mode === 'slope'}
			<div class="flex items-center justify-between">
				<div class="text-base select-none">カラーランプ</div>
				<div class="flex gap-2">
					<button
						onclick={() => setRangeStyleType('slope', 'linear')}
						class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${getTypeButtonClass(layerEntry.style.visualization.uniformsData.slope, 'linear')}`}
					>
						連続
					</button>
					<button
						onclick={() => setRangeStyleType('slope', 'step')}
						class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${getTypeButtonClass(layerEntry.style.visualization.uniformsData.slope, 'step')}`}
					>
						段階
					</button>
				</div>
			</div>
			{#if isDemStepColorStyle(layerEntry.style.visualization.uniformsData.slope)}
				<ColorMapSelect
					showLabel={false}
					bind:isColorMap={layerEntry.style.visualization.uniformsData.slope.colorMap}
					mutableColorMapType={stepColorMapOptions}
				>
					{#snippet children(_isColorMap)}
						<ColorScaleDem isColorMap={_isColorMap} />
					{/snippet}
				</ColorMapSelect>

				{#if layerEntry.style.visualization.uniformsData.slope.range}
					<RangeSliderDouble
						label="傾斜量数値範囲"
						bind:lowerValue={layerEntry.style.visualization.uniformsData.slope.range.value[0]}
						bind:upperValue={layerEntry.style.visualization.uniformsData.slope.range.value[1]}
						max={layerEntry.style.visualization.uniformsData.slope.range.domain[1]}
						min={layerEntry.style.visualization.uniformsData.slope.range.domain[0]}
						step={0.01}
						primaryColor={colorMapManager.createDemCSSGradient(
							layerEntry.style.visualization.uniformsData.slope
						)}
						minRangeColor={colorMapManager.getDemMinColor(
							layerEntry.style.visualization.uniformsData.slope
						)}
						maxRangeColor={colorMapManager.getDemMaxColor(
							layerEntry.style.visualization.uniformsData.slope
						)}
					/>
				{/if}
				<div class="my-3">
					<RangeSlider
						label="分類数"
						bind:value={layerEntry.style.visualization.uniformsData.slope.divisions}
						min={3}
						max={9}
						step={1}
						isInt={true}
					/>
				</div>
				<DemColorLegend style={layerEntry.style.visualization.uniformsData.slope} />
			{:else}
				<ColorMapSelect
					showLabel={false}
					bind:isColorMap={layerEntry.style.visualization.uniformsData.slope.colorMap}
					mutableColorMapType={linearColorMapOptions}
				>
					{#snippet children(_isColorMap)}
						<ColorScaleDem isColorMap={_isColorMap} />
					{/snippet}
				</ColorMapSelect>

				{#if layerEntry.style.visualization.uniformsData.slope.range}
					<RangeSliderDouble
						label="傾斜量数値範囲"
						bind:lowerValue={layerEntry.style.visualization.uniformsData.slope.range.value[0]}
						bind:upperValue={layerEntry.style.visualization.uniformsData.slope.range.value[1]}
						max={layerEntry.style.visualization.uniformsData.slope.range.domain[1]}
						min={layerEntry.style.visualization.uniformsData.slope.range.domain[0]}
						step={0.01}
						primaryColor={colorMapManager.createDemCSSGradient(
							layerEntry.style.visualization.uniformsData.slope
						)}
						minRangeColor={colorMapManager.getDemMinColor(
							layerEntry.style.visualization.uniformsData.slope
						)}
						maxRangeColor={colorMapManager.getDemMaxColor(
							layerEntry.style.visualization.uniformsData.slope
						)}
					/>
				{/if}
			{/if}
		{/if}

		{#if layerEntry.style?.visualization.uniformsData.aspect && layerEntry.style.visualization.mode === 'aspect'}
			<ColorMapSelect
				showLabel={false}
				bind:isColorMap={layerEntry.style.visualization.uniformsData.aspect.colorMap}
				mutableColorMapType={linearColorMapOptions}
			>
				{#snippet children(_isColorMap)}
					<ColorScaleDem isColorMap={_isColorMap} />
				{/snippet}
			</ColorMapSelect>
		{/if}

		{#if layerEntry.style?.visualization.uniformsData.curvature && layerEntry.style.visualization.mode === 'curvature'}
			<ColorMapSelect
				bind:isColorMap={layerEntry.style.visualization.uniformsData.curvature.colorMap}
				mutableColorMapType={linearColorMapOptions}
			>
				{#snippet children(_isColorMap)}
					<ColorScaleDem isColorMap={_isColorMap} />
				{/snippet}
			</ColorMapSelect>
		{/if}
	</div></Accordion
>

<style>
</style>
