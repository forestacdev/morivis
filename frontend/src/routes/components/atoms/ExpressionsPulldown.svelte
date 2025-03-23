<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/components/atoms/Switch.svelte';
	import type {
		VectorLayerType,
		ColorsExpressions,
		LabelsExpressions,
		ColorsStyle
	} from '$routes/data/types/vector/style';
	import { generateNumberAndColorMap, generateColorPalette } from '$routes/utils/colorMapping';
	import { getIconStyle } from '$routes/utils/ui';

	interface Props {
		colorStyle: ColorsStyle;
	}
	let { colorStyle = $bindable() }: Props = $props();
	let showPullDown = $state<boolean>(false);

	let setExpression = $derived.by(() => {
		const target = colorStyle.expressions.find((color) => color.key === colorStyle.key);
		if (!target) return;
		return target;
	});

	let stepPallet = $derived.by(() => {
		if (setExpression && setExpression.type === 'step') {
			return generateNumberAndColorMap(setExpression.mapping);
		}
	});

	let expressionsList = $derived.by(() => {
		return colorStyle.expressions;
	});
</script>

{#if setExpression}
	<div class="relative py-2">
		<button
			onclick={() => (showPullDown = !showPullDown)}
			class="c-select flex w-full justify-between"
		>
			<div class="flex items-center gap-2">
				<Icon icon={getIconStyle(setExpression.type)} width={20} />

				<span> {expressionsList.find((exp) => exp.key === colorStyle.key)?.name}</span>
			</div>
			<Icon icon="bi:chevron-down" class="h-6 w-6" />
		</button>
		{#if showPullDown}
			<div
				transition:fly={{ duration: 200, y: -20 }}
				class="absolute left-0 top-[60px] z-10 w-full divide-y divide-gray-300 overflow-hidden rounded-lg bg-white shadow-md"
			>
				{#each expressionsList as expressionItem (expressionItem.key)}
					<label
						class="hover:text-accent z-20 flex w-full cursor-pointer items-center justify-between gap-2 p-2 transition-colors duration-100 {expressionItem.key ===
						colorStyle.key
							? 'bg-accent text-white hover:text-white'
							: ''}"
					>
						<input
							type="radio"
							bind:group={colorStyle.key}
							value={expressionItem.key}
							class="hidden"
							onchange={() => (showPullDown = false)}
						/>
						<div class="flex items-center gap-2">
							<Icon icon={getIconStyle(expressionItem.type)} width={20} />
							<span class="select-none">{expressionItem.name}</span>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
	<!-- 色分け選択 -->
	<div class="flex flex-grow flex-col gap-2 overflow-y-auto overflow-x-hidden pt-2">
		{#if setExpression.type === 'single'}
			<ColorPicker label="全体の色" bind:value={setExpression.mapping.value} />
		{:else if setExpression.type === 'match'}
			{#each setExpression.mapping.categories as _, index}
				<ColorPicker
					label={setExpression.mapping.categories[index] as string}
					bind:value={setExpression.mapping.values[index]}
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
	</div>
{/if}

<style>
</style>
