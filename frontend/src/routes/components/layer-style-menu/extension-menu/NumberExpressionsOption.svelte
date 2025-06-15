<script lang="ts">
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import type { NumbersStyle, NumbersExpression } from '$routes/data/types/vector/style';
	import { generateNumberToNumberMap } from '$routes/utils/numberMapping';

	interface Props {
		setExpression: NumbersExpression;
	}
	let { setExpression = $bindable() }: Props = $props();
	// step用のパレットを生成
	let stepPallet = $derived.by(() => {
		// TODO: step
		if (setExpression && setExpression.type === 'step') {
			return generateNumberToNumberMap(setExpression.mapping);
		}
	});
</script>

{#if setExpression}
	{#if setExpression.type === 'single'}
		<RangeSlider
			label="大きさ"
			bind:value={setExpression.mapping.value}
			min={1}
			max={30}
			step={0.01}
		/>
	{/if}
	{#if setExpression.type === 'match'}
		{#each setExpression.mapping.categories as _, index}
			<RangeSlider
				label="大きさ"
				bind:value={setExpression.mapping.values[index]}
				min={2}
				max={10}
				step={1}
			/>
		{/each}
	{/if}
	{#if setExpression.type === 'linear'}
		{#each setExpression.mapping.range as _, index}
			<div class="flex w-full select-none flex-col gap-2">
				<div class="">
					<span>{index === 0 ? '最小' : '最大'}値: {setExpression.mapping.range[index]}</span>
				</div>

				<RangeSlider
					label="大きさ"
					bind:value={setExpression.mapping.values[index]}
					min={0}
					max={30}
					step={0.01}
				/>
			</div>
		{/each}
	{/if}
	<!-- TODO:step -->
	{#if setExpression.type === 'step'}
		<div class="flex-between flex w-full gap-2">
			{#each setExpression.mapping.values as _, index}
				<span>{index === 0 ? '最小' : '最大'}</span>
				<RangeSlider
					label="大きさ"
					bind:value={setExpression.mapping.values[index]}
					min={0}
					max={30}
					step={0.01}
				/>
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
					<div class="p-2">{stepPallet.values[index]}</div>
				</div>
			{/each}
		{/if}
		{JSON.stringify(stepPallet)}
	{/if}
{/if}
