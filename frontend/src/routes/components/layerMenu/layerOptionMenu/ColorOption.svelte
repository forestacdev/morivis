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
	import {
		type VectorLayerType,
		type ColorsExpressions,
		type LabelsExpressions,
		type Colors
	} from '$routes/data/types/vector/style';
	import { selectedLayerId } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import {
		generateNumberAndColorMap,
		generateNumberMap,
		generateColorPalette
	} from '$routes/utils/colorMapping';

	interface Props {
		colorStyle: Colors;
	}

	let { colorStyle = $bindable() }: Props = $props();

	const getColorPallet = (ColorsExpressions: ColorsExpressions[]) => {
		const target = ColorsExpressions.find((color) => color.key === colorStyle.key);
		if (!target) return;
		return target;
	};

	let colorsExpressions = $derived.by(() => {
		return getColorPallet(colorStyle.expressions);
	});

	let stepPallet = $derived.by(() => {
		const target = getColorPallet(colorStyle.expressions);
		if (target && target.type === 'step') {
			return generateNumberAndColorMap(target.mapping);
		}
	});

	const openColorOption = (key: string) => {
		if (colorOptionKey === key) {
			colorOptionKey = null;
		} else {
			colorOptionKey = key;
		}
	};

	onMount(() => {});

	let colorOptionKey = $state<string | null>(null);
	let showColorOption = $state<boolean>(false);

	let expressions = $derived.by(() => {
		return colorStyle.expressions;
	});

	const createGradient = (colorsExpressions: ColorsExpressions): string => {
		switch (colorsExpressions.type) {
			case 'single':
				return `background-color: ${colorsExpressions.mapping.value};`;
			case 'match': {
				// 色同士の補完が効かないグラフスタイル
				const numCategories = colorsExpressions.mapping.categories.length;
				const stepAngle = 360 / numCategories;
				const segments = colorsExpressions.mapping.values
					.map((color, index) => {
						const startAngle = index * stepAngle;
						const endAngle = (index + 1) * stepAngle;
						return `${color} ${startAngle}deg ${endAngle}deg`;
					})
					.join(', ');
				return `background: conic-gradient(${segments});`;
			}
			case 'step':
				// step は常に 2 色である前提
				if (colorsExpressions.mapping.values.length !== 2) {
					throw new Error('Step type requires exactly 2 colors.');
				}
				return `background: linear-gradient(0deg, ${colorsExpressions.mapping.values[0]} 0%, ${colorsExpressions.mapping.values[1]} 100%);`;
			default:
				return '';
		}
	};
</script>

{#if colorsExpressions}
	<Accordion label={'色の調整'} bind:value={showColorOption}>
		<Switch label={'塗りつぶし'} bind:value={colorStyle.show} />
		<div class="flex flex-grow flex-col gap-2">
			{#each expressions as colorsExpressions (colorsExpressions.key)}
				<label
					class="text z-20 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-gray-400 p-2"
					class:bg-green-600={colorsExpressions.key === colorStyle.key}
				>
					<input
						type="radio"
						bind:group={colorStyle.key}
						value={colorsExpressions.key}
						class="hidden"
					/>
					<div class="flex items-center gap-2">
						<Icon
							icon={colorsExpressions.type === 'match'
								? 'material-symbols:category-rounded'
								: colorsExpressions.type === 'step'
									? 'subway:step-1'
									: 'bxs:color-fill'}
							width={20}
						/>
						<span class="select-none">{colorsExpressions.name}</span>
					</div>
					{#if colorStyle.key === colorsExpressions.key}
						{#if colorsExpressions.type === 'single'}
							<button
								onclick={() => openColorOption(colorsExpressions.key)}
								class="h-[20px] w-[20px] rounded-full"
								aria-label="色の設定"
								style={createGradient(colorsExpressions)}
							></button>
						{:else}
							<button
								onclick={() => openColorOption(colorsExpressions.key)}
								class="grid h-full place-items-center transition-transform duration-150 {colorOptionKey ===
								colorsExpressions.key
									? 'rotate-180'
									: 'rotate-0'}"
								aria-label="色の設定"
							>
								<Icon icon="bxs:down-arrow" class="h-6 w-6" />
							</button>
						{/if}
					{/if}
				</label>
				<!-- 色分け選択 -->
				{#if colorOptionKey === colorsExpressions.key}
					<div
						transition:slide={{ duration: 300 }}
						class="flex flex-grow flex-col gap-2 overflow-y-auto overflow-x-hidden pt-2"
					>
						{#if colorsExpressions.type === 'single'}
							<ColorPicker label="全体の色" bind:value={colorsExpressions.mapping.value} />
						{:else if colorsExpressions.type === 'match'}
							{#each colorsExpressions.mapping.categories as _, index}
								<ColorPicker
									label={colorsExpressions.mapping.categories[index] as string}
									bind:value={colorsExpressions.mapping.values[index]}
								/>
							{/each}
						{:else if colorsExpressions.type === 'step'}
							<div class="flex-between flex w-full gap-2">
								{#each colorsExpressions.mapping.values as _, index}
									<span>{index === 0 ? '最小' : '最大'}</span>
									<ColorPicker bind:value={colorsExpressions.mapping.values[index]} />
								{/each}
							</div>

							<RangeSlider
								label="分類数"
								bind:value={colorsExpressions.mapping.divisions}
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
			{/each}
		</div>
	</Accordion>
{/if}
