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
		Numbers,
		NumbersExpressions,
		NumberStepExpressions,
		NumberMatchExpressions,
		NumberSingleExpressions
	} from '$routes/data/types/vector/style';
	import { selectedLayerId } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import {
		generateNumberAndColorMap,
		generateNumberMap,
		generateColorPalette
	} from '$routes/utils/colorMapping';

	interface Props {
		label: string;
		secondaryLabel: string;
		numberStyle: Numbers;
	}

	let { label, secondaryLabel, numberStyle = $bindable() }: Props = $props();

	const getNumbersPallet = (ColorsExpressions: NumbersExpressions[]) => {
		const target = ColorsExpressions.find((color) => color.key === numberStyle.key);
		if (!target) return;
		return target;
	};

	let numbersExpressions = $derived.by(() => {
		return getNumbersPallet(numberStyle.expressions);
	});

	let stepPallet = $derived.by(() => {
		const target = getNumbersPallet(numberStyle.expressions);
		if (target && target.type === 'step') {
			return generateNumberAndColorMap(target.mapping);
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
						<Icon
							icon={numbersExpressions.type === 'match'
								? 'material-symbols:category-rounded'
								: numbersExpressions.type === 'step'
									? 'subway:step-1'
									: 'bxs:color-fill'}
							width={20}
						/>
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
				<!-- 色分け選択 -->
				{#if numberOptionKey === numbersExpressions.key}
					<div
						transition:slide={{ duration: 300 }}
						class="flex flex-grow flex-col gap-2 overflow-y-auto overflow-x-hidden pt-2"
					>
						{#if numbersExpressions.type === 'single'}
							<RangeSlider
								label="大きさ"
								bind:value={numbersExpressions.mapping.value}
								min={2}
								max={10}
								step={1}
							/>
						{:else if numbersExpressions.type === 'match'}
							{#each numbersExpressions.mapping.categories as _, index}
								<RangeSlider
									label="大きさ"
									bind:value={numbersExpressions.mapping.values[index]}
									min={2}
									max={10}
									step={1}
								/>
							{/each}
						{:else if numbersExpressions.type === 'step'}
							<div class="flex-between flex w-full gap-2">
								{#each numbersExpressions.mapping.values as _, index}
									<span>{index === 0 ? '最小' : '最大'}</span>
									<RangeSlider
										label="大きさ"
										bind:value={numbersExpressions.mapping.values[index]}
										min={2}
										max={10}
										step={1}
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
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</Accordion>
{/if}
