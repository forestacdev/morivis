<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import CheckBox from '$map/components/atoms/CheckBox.svelte';
	import RangeSlider from '$map/components/atoms/RangeSlider.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import type { GeometryType } from '$map/data/types/vector';
	import { generateNumberAndColorMap, generateNumberMap } from '$map/utils/colorMapping';
	import {
		mutableColorMapType,
		type VectorLayerType,
		type ColorsExpressions,
		type LabelsExpressions
	} from '$routes/map/data/types/vector/style';

	let {
		layerToEdit = $bindable()
	}: { layerToEdit: GeoDataEntry | undefined; tempLayerEntries: GeoDataEntry[] } = $props();

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

	onMount(() => {});
</script>

{#if layerToEdit}
	<!-- レイヤータイプの選択 -->
	<select class="w-full p-2 text-left text-black" bind:value={layerToEdit.style.type}>
		{#each getLayerTypes(layerToEdit.format.geometryType) as layerType}
			<option value={layerType.key}>{layerType.name}</option>
		{/each}
	</select>

	<!-- ラベルの設定 -->
	<CheckBox label={'ラベルの表示'} bind:value={layerToEdit.style.labels.show} />
	<select class="w-full p-2 text-left text-black" bind:value={layerToEdit.style.labels.key}>
		{#each getlabelKeys(layerToEdit.style.labels.expressions) as labelType}
			<option value={labelType.key}>{labelType.name}</option>
		{/each}
	</select>

	<!-- 色の選択 -->
	<h3>色の選択</h3>
	<select class="w-full p-2 text-left text-black" bind:value={layerToEdit.style.colors.key}>
		{#each getColorKeys(layerToEdit.style.colors.expressions) as colortype}
			<option value={colortype.key}>{colortype.name}</option>
		{/each}
	</select>
	<div class="flex flex-col gap-2">
		{#if colorStyle}
			{#if colorStyle.type === 'single'}
				<input type="color" bind:value={colorStyle.mapping.value} />
			{:else if colorStyle.type === 'match'}
				{#each colorStyle.mapping.categories as _, index}
					<div class="flex-between flex w-full gap-2">
						<div class="w-full">{colorStyle.mapping.categories[index]}</div>
						<input type="color" bind:value={colorStyle.mapping.values[index]} />
					</div>
				{/each}
			{:else if colorStyle.type === 'step'}
				<!-- TODO:stepで colorを変更できるようにするか検討 -->
				<select class="w-full p-2 text-left text-black" bind:value={colorStyle.mapping.colorScale}>
					{#each mutableColorMapType as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
				<RangeSlider
					label="分類数"
					bind:value={colorStyle.mapping.divisions}
					min={2}
					max={10}
					step={1}
				/>
				{#if stepPallet}
					{#each stepPallet.categories as _, index}
						<div class="flex-between flex w-full gap-2">
							<div class="w-full">{stepPallet.categories[index]}</div>
							<div class="p-2" style="background-color: {stepPallet.values[index]};"></div>
						</div>
					{/each}
				{/if}
			{/if}
		{/if}
	</div>
{/if}

<style>
</style>
