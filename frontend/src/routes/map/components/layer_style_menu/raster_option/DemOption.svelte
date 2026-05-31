<script lang="ts">
	import DemColorLegend from './DemColorLegend.svelte';
	import Accordion from '../../atoms/Accordion.svelte';
	import RangeSlider from '../../atoms/RangeSlider.svelte';
	import RangeSliderDouble from '../../atoms/RangeSliderDouble.svelte';
	import ColorScaleDem from '../extension_menu/ColorScaleDem.svelte';

	import ColorMapSelect from '$routes/map/components/atoms/select/ColorMapSelect.svelte';
	import DemStyleModePulldownBox from '$routes/map/components/layer_style_menu/raster_option/DemStyleModePulldownBox.svelte';
	import type { DemRangeColorStyle, RasterDemEntry } from '$routes/map/data/types/raster';
	import { SEQUENTIAL_SCHEMES } from '$routes/map/utils/color/color-brewer';
	import { COLORMAP_PRESET_NAMES } from '$routes/map/utils/color/colormap-presets';
	import {
		ColorMapManager,
		getDemStyleRange,
		isDemStepColorStyle,
		toDemLinearColorStyle,
		toDemStepColorStyle
	} from '$routes/map/utils/style/color-mapping';

	const colorMapManager = new ColorMapManager();
	const linearColorMapOptions = [...COLORMAP_PRESET_NAMES];
	const stepColorMapOptions = [...SEQUENTIAL_SCHEMES];

	interface Props {
		layerEntry: RasterDemEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	let reliefSliderBounds = $state.raw({ min: 0, max: 0 });
	let slopeSliderBounds = $state.raw({ min: 0, max: 90 });
	let reliefSliderBoundsKey = $state('');
	let slopeSliderBoundsKey = $state('');

	const syncSliderBounds = (
		bounds: { min: number; max: number },
		boundsKey: string,
		nextKey: string,
		min: number,
		max: number
	): { bounds: { min: number; max: number }; boundsKey: string } => {
		if (boundsKey !== nextKey) {
			return {
				bounds: { min, max },
				boundsKey: nextKey
			};
		}

		if (min < bounds.min || max > bounds.max) {
			return {
				bounds: {
					min: Math.min(bounds.min, min),
					max: Math.max(bounds.max, max)
				},
				boundsKey
			};
		}

		return { bounds, boundsKey };
	};

	$effect(() => {
		const reliefStyle = layerEntry.style.visualization.uniformsData.relief;
		const [min, max] = getDemStyleRange(reliefStyle);
		const nextKey = `${layerEntry.id}:relief`;
		const next = syncSliderBounds(reliefSliderBounds, reliefSliderBoundsKey, nextKey, min, max);
		reliefSliderBounds = next.bounds;
		reliefSliderBoundsKey = next.boundsKey;
	});

	$effect(() => {
		const slopeStyle = layerEntry.style.visualization.uniformsData.slope;
		if (!slopeStyle) return;

		const [min, max] = getDemStyleRange(slopeStyle);
		const nextKey = `${layerEntry.id}:slope`;
		const next = syncSliderBounds(slopeSliderBounds, slopeSliderBoundsKey, nextKey, min, max);
		slopeSliderBounds = next.bounds;
		slopeSliderBoundsKey = next.boundsKey;
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
				<RangeSliderDouble
					label="標高数値範囲"
					bind:lowerValue={layerEntry.style.visualization.uniformsData.relief.min}
					bind:upperValue={layerEntry.style.visualization.uniformsData.relief.max}
					max={reliefSliderBounds.max}
					min={reliefSliderBounds.min}
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
				<RangeSliderDouble
					label="標高数値範囲"
					bind:lowerValue={layerEntry.style.visualization.uniformsData.relief.min}
					bind:upperValue={layerEntry.style.visualization.uniformsData.relief.max}
					max={reliefSliderBounds.max}
					min={reliefSliderBounds.min}
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

				<RangeSliderDouble
					label="傾斜量数値範囲"
					bind:lowerValue={layerEntry.style.visualization.uniformsData.slope.min}
					bind:upperValue={layerEntry.style.visualization.uniformsData.slope.max}
					max={slopeSliderBounds.max}
					min={slopeSliderBounds.min}
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

				<RangeSliderDouble
					label="傾斜量数値範囲"
					bind:lowerValue={layerEntry.style.visualization.uniformsData.slope.min}
					bind:upperValue={layerEntry.style.visualization.uniformsData.slope.max}
					max={slopeSliderBounds.max}
					min={slopeSliderBounds.min}
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
