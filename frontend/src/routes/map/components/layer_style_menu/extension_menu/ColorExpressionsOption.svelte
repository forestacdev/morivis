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
</script>

{#if setExpression.type === 'single'}
	<!-- NOTE: プロパティが存在するかどうか -->
	<!-- TODO: ポイント、ラインの対応 -->
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
{:else if setExpression.type === 'step'}
	<div class="flex-between flex w-full items-center gap-2 text-base">
		{#each setExpression.mapping.values as _, index}
			<div class="flex items-center">
				<span>{index === 0 ? '最小' : '最大'}</span>
				<ColorPicker bind:value={setExpression.mapping.values[index]} />
			</div>
		{/each}
	</div>

	<RangeSlider
		label="分類数"
		bind:value={setExpression.mapping.divisions}
		min={2}
		max={10}
		step={1}
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
