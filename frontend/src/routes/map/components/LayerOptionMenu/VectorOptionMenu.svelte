<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';

	import CheckBox from '$map/components/atoms/CheckBox.svelte';
	import ColorPicker from '$map/components/atoms/ColorPicker.svelte';
	import RangeSlider from '$map/components/atoms/RangeSlider.svelte';
	import SelectBox from '$map/components/atoms/SelectBox.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import type {
		GeometryType,
		VectorEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$map/data/types/vector';
	import {
		type VectorLayerType,
		type ColorsExpressions,
		type LabelsExpressions
	} from '$map/data/types/vector/style';
	import { mapStore } from '$map/store/map';
	import {
		generateNumberAndColorMap,
		generateNumberMap,
		generateColorPalette
	} from '$map/utils/colorMapping';
	import { editingLayerId } from '$routes/map/store';

	let { layerToEdit = $bindable() }: { layerToEdit: VectorEntry<GeoJsonMetaData | TileMetaData> } =
		$props();

	// 有効なレイヤータイプの取得
	const getLayerTypes = (
		type: GeometryType
	): {
		key: VectorLayerType;
		name: string;
	}[] => {
		switch (type) {
			case 'Point':
				return [
					{
						key: 'circle',
						name: 'ポイント'
					}
				];
			case 'LineString':
				return [
					{
						key: 'line',
						name: 'ライン'
					},
					{
						key: 'circle',
						name: 'ポイント'
					}
				];
			case 'Polygon':
				return [
					{
						key: 'fill',
						name: 'ポリゴン'
					},
					{
						key: 'line',
						name: 'ライン'
					},
					{
						key: 'circle',
						name: 'ポイント'
					}
				];
			case 'Label':
				return [
					{
						key: 'symbol',
						name: 'ラベル'
					}
				];
			default:
				return [
					{
						key: 'symbol',
						name: 'ラベル'
					}
				];
		}
	};

	// 色分けのキーの取得
	const getColorKeys = (ColorsExpressions: ColorsExpressions[]) => {
		return ColorsExpressions.map((color) => ({ key: color.key, name: color.name }));
	};

	// ラベルのキーの取得
	const getlabelKeys = (labelsExpressions: LabelsExpressions[]) => {
		return labelsExpressions.map((label) => ({ key: label.key, name: label.name }));
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

		// TODO: 他のレイヤーを非表示にする表現
		// const map = mapStore.getMap();
		// if (!map) return;
		// const orderedLayerIds = map.getLayersOrder();
		// orderedLayerIds.forEach((layerId) => {
		// 	if (colorOptionKey) {
		// 		if (layerId === $editingLayerId) {
		// 			map?.setLayoutProperty(layerId, 'visibility', 'visible');
		// 		} else {
		// 			map?.setLayoutProperty(layerId, 'visibility', 'none');
		// 		}
		// 	} else {
		// 		map?.setLayoutProperty(layerId, 'visibility', 'visible');
		// 	}
		// });
	};

	let colorPalette = $state(generateColorPalette(7, 7));
	onMount(() => {});

	let colorOptionKey = $state<string | null>(null);

	let filterExpressions = $derived.by(() => {
		if (colorOptionKey) {
			return layerToEdit.style.colors.expressions.filter(
				(expression) => expression.key === colorOptionKey
			);
		} else {
			return layerToEdit.style.colors.expressions;
		}
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

{#if layerToEdit && layerToEdit.type === 'vector'}
	<!-- レイヤータイプの選択 -->

	<SelectBox
		bind:group={layerToEdit.style.type}
		options={getLayerTypes(layerToEdit.format.geometryType)}
	/>

	<RangeSlider
		label="不透明度"
		bind:value={layerToEdit.style.opacity}
		min={0}
		max={1}
		step={0.01}
	/>

	<!-- ラベルの設定 -->
	<!-- <CheckBox label={'ラベルの表示'} bind:value={layerToEdit.style.labels.show} />
	<select class="w-full p-2 text-left text-black" bind:value={layerToEdit.style.labels.key}>
		{#each getlabelKeys(layerToEdit.style.labels.expressions) as labelType}
			<option value={labelType.key}>{labelType.name}</option>
		{/each}
	</select> -->

	<!-- 色の選択 -->
	<h3>色の選択</h3>
	{#if colorStyle}
		<!-- <div class="full flex w-full items-center">
			{#each colorOptions as option, idx}
				<label
					for={option.key}
					class="grid w-full cursor-pointer place-items-center bg-gray-400 p-2 {idx === 0
						? 'rounded-l-full'
						: colorOptions.length === idx + 1
							? 'rounded-r-full'
							: ''}"
				>
					<input
						type="radio"
						id={option.key}
						bind:group={colorStyle.type}
						value={option.key}
						class="hidden"
					/>
					<span class="">{option.name}</span>
				</label>
			{/each}
		</div> -->
		<!-- <select class="w-full p-2 text-left text-black" bind:value={layerToEdit.style.colors.key}>
			{#each getColorKeys(layerToEdit.style.colors.expressions) as colorType}
				<option value={colorType.key}>{colorType.name}</option>
			{/each}
		</select> -->
		<div class="flex flex-grow flex-col gap-2">
			{#each filterExpressions as colorStyle, idx (colorStyle.key)}
				<label
					animate:flip={{ duration: 200 }}
					for={colorStyle.key}
					class="text z-20 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-gray-400 p-2"
					class:bg-green-600={colorStyle.key === layerToEdit.style.colors.key}
				>
					<input
						type="radio"
						id={colorStyle.key}
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
						<button
							onclick={() => openColorOption(colorStyle.key)}
							class="b h-[20px] w-[20px] rounded-full"
							aria-label="色の設定"
							style={createGradient(colorStyle)}
						></button>
					{/if}
				</label>
			{/each}
		</div>
		{#if colorOptionKey}
			<div
				in:fly={{ duration: 300, y: -50, opacity: 0 }}
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
	{/if}
{/if}

<style>
</style>
