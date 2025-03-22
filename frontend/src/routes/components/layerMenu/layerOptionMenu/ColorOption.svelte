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
		type LabelsExpressions
	} from '$routes/data/types/vector/style';
	import { selectedLayerId } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import {
		generateNumberAndColorMap,
		generateNumberMap,
		generateColorPalette
	} from '$routes/utils/colorMapping';

	let { layerToEdit = $bindable() }: { layerToEdit: VectorEntry<GeoJsonMetaData | TileMetaData> } =
		$props();

	// 色分けのキーの取得
	const getColorKeys = (ColorsExpressions: ColorsExpressions[]) => {
		return ColorsExpressions.map((color) => ({ key: color.key, name: color.name }));
	};

	const getColorPallet = (ColorsExpressions: ColorsExpressions[]) => {
		if (!layerToEdit) return;
		const target = ColorsExpressions.find((color) => color.key === layerToEdit.style.colors.key);
		if (!target) return;
		// if (target.type === 'step') {
		// 	return {
		// 		type: 'step',
		// 		mapping: generateNumberAndColorMap(target.mapping)
		// 	};
		// }
		return target;
	};

	let colorStyle = $derived.by(() => {
		if (!layerToEdit || layerToEdit.type !== 'vector') return;
		return getColorPallet(layerToEdit.style.colors.expressions);
	});

	let stepPallet = $derived.by(() => {
		if (!layerToEdit || layerToEdit.type !== 'vector') return;
		const target = getColorPallet(layerToEdit.style.colors.expressions);
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
		return layerToEdit.style.colors.expressions;
	});

	const createGradient = (colorStyle: ColorsExpressions): string => {
		switch (colorStyle.type) {
			case 'single':
				return `background-color: ${colorStyle.mapping.value};`;
			case 'match': {
				// 色同士の補完が効かないグラフスタイル
				const numCategories = colorStyle.mapping.categories.length;
				const stepAngle = 360 / numCategories;
				const segments = colorStyle.mapping.values
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
				if (colorStyle.mapping.values.length !== 2) {
					throw new Error('Step type requires exactly 2 colors.');
				}
				return `background: linear-gradient(0deg, ${colorStyle.mapping.values[0]} 0%, ${colorStyle.mapping.values[1]} 100%);`;
			default:
				return '';
		}
	};
</script>

{#if colorStyle}
	<Accordion label={'色の調整'} bind:value={showColorOption}>
		<Switch label={'塗りつぶし'} bind:value={layerToEdit.style.colors.show} />
		<div class="flex flex-grow flex-col gap-2">
			{#each expressions as colorStyle, idx (colorStyle.key)}
				<label
					class="text z-20 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-gray-400 p-2"
					class:bg-green-600={colorStyle.key === layerToEdit.style.colors.key}
				>
					<input
						type="radio"
						bind:group={layerToEdit.style.colors.key}
						value={colorStyle.key}
						class="hidden"
					/>
					<div class="flex items-center gap-2">
						<Icon
							icon={colorStyle.type === 'match'
								? 'material-symbols:category-rounded'
								: colorStyle.type === 'step'
									? 'subway:step-1'
									: 'bxs:color-fill'}
							width={20}
						/>
						<span class="select-none">{colorStyle.name}</span>
					</div>
					{#if layerToEdit.style.colors.key === colorStyle.key}
						{#if colorStyle.type === 'single'}
							<button
								onclick={() => openColorOption(colorStyle.key)}
								class="h-[20px] w-[20px] rounded-full"
								aria-label="色の設定"
								style={createGradient(colorStyle)}
							></button>
						{:else}
							<button
								onclick={() => openColorOption(colorStyle.key)}
								class="grid h-full place-items-center transition-transform duration-150 {colorOptionKey ===
								colorStyle.key
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
				{#if colorOptionKey === colorStyle.key}
					<div
						transition:slide={{ duration: 300 }}
						class="flex max-h-[300px] flex-grow flex-col gap-2 overflow-y-auto overflow-x-hidden pt-2"
					>
						{#if colorStyle.type === 'single'}
							<ColorPicker label="全体の色" bind:value={colorStyle.mapping.value} />
						{:else if colorStyle.type === 'match'}
							{#each colorStyle.mapping.categories as _, index}
								<ColorPicker
									label={colorStyle.mapping.categories[index] as string}
									bind:value={colorStyle.mapping.values[index]}
								/>
							{/each}
						{:else if colorStyle.type === 'step'}
							<div class="flex-between flex w-full gap-2">
								{#each colorStyle.mapping.values as _, index}
									<span>{index === 0 ? '最小' : '最大'}</span>
									<ColorPicker bind:value={colorStyle.mapping.values[index]} />
								{/each}
							</div>

							<RangeSlider
								label="分類数"
								bind:value={colorStyle.mapping.divisions}
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
