<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Vector2 } from 'three';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import LabelPulldownBox from '$routes/map/components/atoms/LabelPulldownBox.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorOption from '$routes/map/components/layer-style-menu/ColorOption.svelte';
	import type {
		VectorEntryGeometryType,
		LabelEntry,
		GeoJsonMetaData,
		TileMetaData,
		VectorEntry
	} from '$routes/map/data/types/vector';
	import {
		type VectorLayerType,
		type ColorsExpression,
		type LabelsExpressions
	} from '$routes/map/data/types/vector/style';

	interface Props {
		layerEntry: VectorEntry<GeoJsonMetaData | TileMetaData>;
	}

	let { layerEntry = $bindable() }: Props = $props();

	let showLabelOption = $state<boolean>(false);
	// ラベルのキーの取得
	const getlabelKeys = (labelsExpressions: LabelsExpressions[]) => {
		return labelsExpressions.map((label) => ({ key: label.key, name: label.name }));
	};
</script>

<Accordion label={'ラベル'} bind:value={showLabelOption}>
	<Switch label={'表示'} bind:value={layerEntry.style.labels.show} />
	<LabelPulldownBox bind:labels={layerEntry.style.labels} icon={'ci:font'} />

	<!-- <div class="flex grow flex-col gap-2">
		{#each getlabelKeys(layerEntry.style.labels.expressions) as labelType (labelType.key)}
			<label
				class="text z-20 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-gray-400 p-2"
				class:bg-green-600={labelType.key === layerEntry.style.labels.key}
			>
				<input
					type="radio"
					bind:group={layerEntry.style.labels.key}
					value={labelType.key}
					class="hidden"
				/>
				<div class="flex items-center gap-2">
					<Icon icon={'ci:font'} width={20} />
					<span class="select-none">{labelType.name}</span>
				</div>
			</label>
		{/each}
	</div> -->
</Accordion>

<style>
</style>
