<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly, slide } from 'svelte/transition';

	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import CheckBox from '$routes/components/atoms/CheckBox.svelte';
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import HorizontalSelectBox from '$routes/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/components/atoms/Switch.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import type {
		GeometryType,
		VectorEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/data/types/vector';
	import type {
		NumbersStyle,
		NumbersExpression,
		NumberStepExpressions,
		NumberMatchExpression,
		NumberSingleExpression
	} from '$routes/data/types/vector/style';
	import { selectedLayerId } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import { generateNumberToNumberMap, generateNumberLinearMap } from '$routes/utils/numberMapping';

	interface Props {
		label: string;
		numberStyle: NumbersStyle;
	}

	let { label, numberStyle = $bindable() }: Props = $props();

	const getNumbersPallet = (ColorsExpression: NumbersExpression[]) => {
		const target = ColorsExpression.find((color) => color.key === numberStyle.key);
		if (!target) return;
		return target;
	};

	let numbersExpressions = $derived.by(() => {
		return getNumbersPallet(numberStyle.expressions);
	});

	let stepPallet = $derived.by(() => {
		const target = getNumbersPallet(numberStyle.expressions);
		if (target && target.type === 'linear') {
			return generateNumberLinearMap(target.mapping);
		}
		if (target && target.type === 'step') {
			return generateNumberToNumberMap(target.mapping);
		}
	});

	const openNumberOption = (key: string) => {
		if (numberOptionKey === key) {
			numberOptionKey = null;
		} else {
			numberOptionKey = key;
		}
	};

	onMount(() => {});

	let numberOptionKey = $state<string | null>(null);
	let showNumberOption = $state<boolean>(false);

	let expressions = $derived.by(() => {
		return numberStyle.expressions;
	});

	type MappingType = 'single' | 'match' | 'linear' | 'step';

	const getIconStyle = (type: MappingType) => {
		if (!type) return 'bxs:color-fill';
		switch (type) {
			case 'match':
				return 'material-symbols:category-rounded';
			case 'step':
				return 'subway:step-1';
			case 'linear':
				return 'mdi:graph-bell-curve-cumulative';
			default:
				return 'bxs:color-fill';
		}
	};
</script>

{#if numbersExpressions}
	<Accordion {label} bind:value={showNumberOption}>
		<div class="flex flex-grow flex-col gap-2">
			{#each expressions as numbersExpressions (numbersExpressions.key)}
				<label
					class="text z-20 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-gray-400 p-2"
					class:bg-green-600={numbersExpressions.key === numberStyle.key}
				>
					<input
						type="radio"
						bind:group={numberStyle.key}
						value={numbersExpressions.key}
						class="hidden"
					/>
					<div class="flex items-center gap-2">
						<Icon icon={getIconStyle(numbersExpressions.type)} width={20} />
						<span class="select-none">{numbersExpressions.name}</span>
					</div>
					{#if numberStyle.key === numbersExpressions.key}
						<button
							onclick={() => openNumberOption(numbersExpressions.key)}
							class="grid h-full place-items-center transition-transform duration-150 {numberOptionKey ===
							numbersExpressions.key
								? 'rotate-180'
								: 'rotate-0'}"
							aria-label="数値のの設定"
						>
							<Icon icon="bxs:down-arrow" class="h-6 w-6" />
						</button>
					{/if}
				</label>
				<!-- 数値分け選択 -->
				{#if numberOptionKey === numbersExpressions.key}
					<div
						transition:slide={{ duration: 300 }}
						class="flex flex-grow flex-col gap-2 overflow-y-auto overflow-x-hidden pt-2"
					>
						{#if numbersExpressions.type === 'single'}
							<RangeSlider
								label="大きさ"
								bind:value={numbersExpressions.mapping.value}
								min={1}
								max={20}
								step={0.01}
							/>
						{/if}
						{#if numbersExpressions.type === 'match'}
							{#each numbersExpressions.mapping.categories as _, index}
								<RangeSlider
									label="大きさ"
									bind:value={numbersExpressions.mapping.values[index]}
									min={2}
									max={10}
									step={1}
								/>
							{/each}
						{/if}
						{#if numbersExpressions.type === 'linear'}
							{#each numbersExpressions.mapping.range as _, index}
								<div class="flex-between flex w-full select-none gap-2">
									<div class="w-full">{numbersExpressions.mapping.range[index]}</div>
									<span>{index === 0 ? '最小' : '最大'}</span>
									<RangeSlider
										label="大きさ"
										bind:value={numbersExpressions.mapping.values[index]}
										min={0}
										max={30}
										step={0.01}
									/>
								</div>
							{/each}
						{/if}
						{#if numbersExpressions.type === 'step'}
							<div class="flex-between flex w-full gap-2">
								{#each numbersExpressions.mapping.values as _, index}
									<span>{index === 0 ? '最小' : '最大'}</span>
									<RangeSlider
										label="大きさ"
										bind:value={numbersExpressions.mapping.values[index]}
										min={0}
										max={30}
										step={0.01}
									/>
								{/each}
							</div>

							<RangeSlider
								label="分類数"
								bind:value={numbersExpressions.mapping.divisions}
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
					</div>
				{/if}
			{/each}
		</div>
	</Accordion>
{/if}
