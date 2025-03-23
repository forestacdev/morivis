<script lang="ts">
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import type {
		VectorLayerType,
		ColorsExpression,
		LabelsExpressions,
		ColorsStyle,
		ColorSingleExpression,
		NumbersStyle
	} from '$routes/data/types/vector/style';
	import { generateNumberAndColorMap, generateColorPalette } from '$routes/utils/colorMapping';

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
	<ColorPicker label="全体の色" bind:value={setExpression.mapping.value as string} />
{:else if setExpression.type === 'match'}
	{#each setExpression.mapping.categories as _, index}
		<ColorPicker
			label={setExpression.mapping.categories[index] as string}
			bind:value={setExpression.mapping.values[index] as string}
		/>
	{/each}
{:else if setExpression.type === 'step'}
	<div class="flex-between flex w-full gap-2">
		{#each setExpression.mapping.values as _, index}
			<span>{index === 0 ? '最小' : '最大'}</span>
			<ColorPicker bind:value={setExpression.mapping.values[index]} />
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
			<div class="flex-between flex w-full select-none gap-2">
				<div class="w-full">{stepPallet.categories[index]}</div>
				<div class="p-2" style="background-color: {stepPallet.values[index]};"></div>
			</div>
		{/each}
	{/if}
{/if}
