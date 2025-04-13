<script lang="ts">
	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import HorizontalSelectBox from '$routes/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/components/atoms/Switch.svelte';
	import ColorOption from '$routes/components/layer-menu/layer-option-menu/ColorOption.svelte';
	import NumberOption from '$routes/components/layer-menu/layer-option-menu/NumberOption.svelte';
	import type {
		GeometryType,
		LineStringEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/data/types/vector';

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

<style>
</style>
