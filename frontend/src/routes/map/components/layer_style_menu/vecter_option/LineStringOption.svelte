<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorOption from '$routes/map/components/layer_style_menu/ColorOption.svelte';
	import LabelOption from '$routes/map/components/layer_style_menu/LabelOption.svelte';
	import NumberOption from '$routes/map/components/layer_style_menu/NumberOption.svelte';
	import type {
		VectorEntryGeometryType,
		LineStringEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/map/data/types/vector';

	interface Props {
		layerEntry: LineStringEntry<GeoJsonMetaData | TileMetaData>;
	}

	let { layerEntry = $bindable() }: Props = $props();

	let showLabelOption = $state<boolean>(false);
	let showLineOption = $state<boolean>(false);
</script>

<RangeSlider label="不透明度" bind:value={layerEntry.style.opacity} min={0} max={1} step={0.01} />

<!-- 色 -->
<ColorOption bind:colorStyle={layerEntry.style.colors} />
<NumberOption label={'ライン幅'} bind:numberStyle={layerEntry.style.width} />
<Accordion label={'スタイル'} bind:value={showLineOption}>
	<HorizontalSelectBox
		label={'ラインのスタイル'}
		bind:group={layerEntry.style.lineStyle}
		options={[
			{ name: '実線', key: 'solid' },
			{ name: '破線', key: 'dashed' }
		]}
	/>
</Accordion>

<LabelOption bind:labels={layerEntry.style.labels} />

<style>
</style>
