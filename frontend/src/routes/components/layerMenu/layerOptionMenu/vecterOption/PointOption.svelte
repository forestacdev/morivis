<script lang="ts">
	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import ExpressionsPulldownBox from '$routes/components/atoms/ExpressionsPulldownBox.svelte';
	import HorizontalSelectBox from '$routes/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/components/atoms/Switch.svelte';
	import ColorOption from '$routes/components/layerMenu/layerOptionMenu/ColorOption.svelte';
	import LabelOption from '$routes/components/layerMenu/layerOptionMenu/LabelOption.svelte';
	import NumberOption from '$routes/components/layerMenu/layerOptionMenu/NumberOption.svelte';
	import type {
		GeometryType,
		PointEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/data/types/vector';

	interface Props {
		layerToEdit: PointEntry<GeoJsonMetaData | TileMetaData>;
	}

	let { layerToEdit = $bindable() }: Props = $props();

	let showTypeOption = $state<boolean>(false);
	let showOutlineOption = $state<boolean>(false);
	let showIconOption = $state<boolean>(false);
</script>

<RangeSlider label="不透明度" bind:value={layerToEdit.style.opacity} min={0} max={1} step={0.01} />

{#if layerToEdit.style.icon}
	<HorizontalSelectBox
		label={'ポイントのスタイル'}
		bind:group={layerToEdit.style.markerType}
		options={[
			{ name: '円', key: 'circle' },
			{ name: 'アイコン', key: 'icon' }
		]}
	/>
{/if}

{#if layerToEdit.style.markerType === 'circle'}
	<!-- 色 -->
	<ColorOption bind:colorStyle={layerToEdit.style.colors} />

	<NumberOption label={'円の半径'} bind:numberStyle={layerToEdit.style.radius} />

	<Accordion label={'縁'} bind:value={showOutlineOption}>
		<Switch label={'表示'} bind:value={layerToEdit.style.outline.show} />
		<RangeSlider
			label="縁の幅"
			bind:value={layerToEdit.style.outline.width}
			min={0}
			max={10}
			step={0.01}
		/>
		<div class="flex flex-col gap-2 pb-2">
			<ColorPicker label="縁の色" bind:value={layerToEdit.style.outline.color} />
		</div>
	</Accordion>
{/if}

{#if layerToEdit.style.markerType === 'icon' && layerToEdit.style.icon}
	<Accordion label={'アイコン'} bind:value={showIconOption}>
		<Switch label={'表示'} bind:value={layerToEdit.style.icon.show} />
		<RangeSlider
			label="アイコンサイズ"
			bind:value={layerToEdit.style.icon.size}
			min={0}
			max={0.5}
			step={0.01}
		/>
	</Accordion>
{/if}

<LabelOption bind:labels={layerToEdit.style.labels} />

<style>
</style>
