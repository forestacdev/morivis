<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';

	import ColorOption from './ColorOption.svelte';

	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import CheckBox from '$routes/components/atoms/CheckBox.svelte';
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import HorizontalSelectBox from '$routes/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
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

	// ラベルのキーの取得
	const getlabelKeys = (labelsExpressions: LabelsExpressions[]) => {
		return labelsExpressions.map((label) => ({ key: label.key, name: label.name }));
	};
</script>

{#if layerToEdit && layerToEdit.type === 'vector'}
	<RangeSlider
		label="不透明度"
		bind:value={layerToEdit.style.opacity}
		min={0}
		max={1}
		step={0.01}
	/>

	<!-- 色 -->
	<ColorOption bind:layerToEdit />

	{#if layerToEdit.style.type === 'fill' || layerToEdit.style.type === 'circle'}
		<Accordion label={'アウトライン'} bind:value={layerToEdit.style.outline.show}>
			<RangeSlider
				label="ライン幅"
				bind:value={layerToEdit.style.outline.width}
				min={0}
				max={10}
				step={0.01}
			/>
			<div class="flex flex-col gap-2 pb-2">
				<ColorPicker label="ラインの色" bind:value={layerToEdit.style.outline.color} />
			</div>
			{#if layerToEdit.style.type === 'fill'}
				<HorizontalSelectBox
					label={'ラインのスタイル'}
					bind:group={layerToEdit.style.outline.lineStyle}
					options={[
						{ name: '実線', key: 'solid' },
						{ name: '破線', key: 'dashed' }
					]}
				/>
			{/if}
		</Accordion>
	{/if}

	{#if layerToEdit.style.labels.show !== undefined}
		<!-- ラベルの設定 -->

		<Accordion label={'ラベルの表示'} bind:value={layerToEdit.style.labels.show}>
			<div class="flex flex-grow flex-col gap-2">
				{#each getlabelKeys(layerToEdit.style.labels.expressions) as labelType (labelType.key)}
					<label
						class="text z-20 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-gray-400 p-2"
						class:bg-green-600={labelType.key === layerToEdit.style.labels.key}
					>
						<input
							type="radio"
							bind:group={layerToEdit.style.labels.key}
							value={labelType.key}
							class="hidden"
						/>
						<div class="flex items-center gap-2">
							<Icon icon={'ci:font'} width={20} />
							<span class="select-none">{labelType.name}</span>
						</div>
					</label>
				{/each}
			</div>
		</Accordion>
	{/if}
{/if}

<style>
</style>
