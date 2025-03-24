<script lang="ts">
	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import HorizontalSelectBox from '$routes/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/components/atoms/Switch.svelte';
	import ColorOption from '$routes/components/layerMenu/layerOptionMenu/ColorOption.svelte';
	import NumberOption from '$routes/components/layerMenu/layerOptionMenu/NumberOption.svelte';
	import type {
		GeometryType,
		LineStringEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/data/types/vector';

	interface Props {
		layerToEdit: LineStringEntry<GeoJsonMetaData | TileMetaData>;
	}

	let { layerToEdit = $bindable() }: Props = $props();

	let showLabelOption = $state<boolean>(false);
	let showLineOption = $state<boolean>(false);
</script>

<RangeSlider label="不透明度" bind:value={layerToEdit.style.opacity} min={0} max={1} step={0.01} />

<!-- 色 -->
<ColorOption bind:colorStyle={layerToEdit.style.colors} />

<NumberOption label={'ライン幅'} bind:numberStyle={layerToEdit.style.width} />

<HorizontalSelectBox
	label={'ラインのスタイル'}
	bind:group={layerToEdit.style.lineStyle}
	options={[
		{ name: '実線', key: 'solid' },
		{ name: '破線', key: 'dashed' }
	]}
/>

<style>
</style>
