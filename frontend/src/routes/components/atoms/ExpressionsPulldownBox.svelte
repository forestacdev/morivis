<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/components/atoms/Switch.svelte';
	import ColorExpressionsOption from '$routes/components/layerMenu/layerOptionMenu/extensionMenu/ColorExpressionsOption.svelte';
	import type {
		VectorLayerType,
		ColorsExpression,
		LabelsExpressions,
		ColorsStyle,
		NumbersStyle
	} from '$routes/data/types/vector/style';
	import { generateNumberAndColorMap, generateColorPalette } from '$routes/utils/colorMapping';
	import { getIconStyle } from '$routes/utils/ui';

	interface Props {
		style: ColorsStyle | NumbersStyle;
		expressionType: 'colors' | 'numbers';
	}
	let { style = $bindable(), expressionType }: Props = $props();
	let showPullDown = $state<boolean>(false);

	// セットされた式の設定
	let setExpression = $derived.by(() => {
		const target = style.expressions.find((color) => color.key === style.key);
		if (!target) return;
		return target;
	});

	// 式のリスト
	let expressionsList = $derived.by(() => {
		return style.expressions;
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

				<span> {expressionsList.find((exp) => exp.key === style.key)?.name}</span>
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
						style.key
							? 'bg-accent text-white hover:text-white'
							: ''}"
					>
						<input
							type="radio"
							bind:group={style.key}
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
		{#if expressionType === 'colors'}
			<ColorExpressionsOption setExpression={setExpression as ColorsExpression} />
		{/if}
		{#if expressionType === 'numbers'}
			ここに数値の設定を追加
		{/if}
	</div>
{/if}

<style>
</style>
