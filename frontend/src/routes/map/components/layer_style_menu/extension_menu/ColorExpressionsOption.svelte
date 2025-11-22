<script lang="ts">
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import type {
		VectorLayerType,
		ColorsExpression,
		LabelsExpressions,
		ColorsStyle,
		ColorSingleExpression,
		NumbersStyle
	} from '$routes/map/data/types/vector/style';
	import { generateNumberAndColorMap, generateColorPalette } from '$routes/map/utils/color_mapping';
	import ColorPatternPicker from './ColorPatternPicker.svelte';
	import ColorScaleStep from './ColorScaleStep.svelte';
	import {
		COLOR_BREWER_SCHEME_COUNT,
		getSequentSchemeColors,
		type SequentialScheme
	} from '$routes/map/utils/color/color-brewer';
	import StyleColorMapPulldownBox from '$routes/map/components/layer_style_menu/extension_menu/StyleColorMapPulldownBox.svelte';
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import { generateStepGradient } from '$routes/map/utils/color_mapping';
	interface Props {
		setExpression: ColorsExpression;
	}
	let { setExpression = $bindable() }: Props = $props();
	// step用のパレットを生成
	let stepPallet = $derived.by(() => {
		if (setExpression && setExpression.type === 'step') {
			return generateNumberAndColorMap(setExpression.mapping);
		}
	});

	const rangeMax = $state.raw(
		setExpression && 'range' in setExpression.mapping ? setExpression.mapping.range[1] : 1000
	);
	const rangeMin = $state.raw(
		setExpression && 'range' in setExpression.mapping ? setExpression.mapping.range[0] : 0
	);
</script>

{#if setExpression.type === 'single'}
	<!-- NOTE: プロパティが存在するかどうか -->
	<!-- TODO: patternのポイント、ラインの対応 -->
	{#if 'pattern' in setExpression.mapping}
		<ColorPatternPicker
			label="全体の色"
			bind:value={setExpression.mapping.value as string}
			bind:pattern={setExpression.mapping.pattern}
		/>
	{:else}
		<ColorPatternPicker label="全体の色" bind:value={setExpression.mapping.value as string} />
	{/if}
{:else if setExpression.type === 'match'}
	{#each setExpression.mapping.categories as _, index}
		{#if setExpression.mapping.patterns}
			<ColorPatternPicker
				label={setExpression.mapping.categories[index] as string}
				bind:pattern={setExpression.mapping.patterns[index]}
				bind:value={setExpression.mapping.values[index] as string}
			/>
		{:else}
			<ColorPatternPicker
				label={setExpression.mapping.categories[index] as string}
				bind:value={setExpression.mapping.values[index] as string}
			/>
		{/if}
	{/each}

	<!-- No Data -->
	{#if setExpression.noData}
		<ColorPatternPicker
			label={setExpression.noData.category ?? ('データなし' as string)}
			bind:value={setExpression.noData.value as string}
		/>
	{/if}
{:else if setExpression.type === 'step'}
	<StyleColorMapPulldownBox
		bind:isColorMap={setExpression.mapping.scheme}
		mutableColorMapType={[...COLOR_BREWER_SCHEME_COUNT.sequential['9']]}
	>
		{#snippet children(_isColorMap)}
			<ColorScaleStep isColorMap={_isColorMap as SequentialScheme} />
		{/snippet}
	</StyleColorMapPulldownBox>

	<RangeSliderDouble
		label="範囲"
		bind:lowerValue={setExpression.mapping.range[0]}
		bind:upperValue={setExpression.mapping.range[1]}
		max={rangeMax}
		min={rangeMin}
		step={0.01}
		primaryColor={generateStepGradient(
			getSequentSchemeColors(setExpression.mapping.scheme, setExpression.mapping.divisions)
		)}
		minRangeColor={'#000000'}
		maxRangeColor={getSequentSchemeColors(
			setExpression.mapping.scheme,
			setExpression.mapping.divisions
		).at(-1)}
	/>

	<RangeSlider
		label="分類数"
		bind:value={setExpression.mapping.divisions}
		min={3}
		max={9}
		step={1}
		isInt={true}
	/>
	{#if stepPallet}
		{#each stepPallet.categories as _, index}
			<div class="flex-between flex w-full select-none gap-2 text-base">
				<div class="w-full">{stepPallet.categories[index]}</div>
				<div class="p-2" style="background-color: {stepPallet.values[index]};"></div>
			</div>
		{/each}
	{/if}
{/if}
