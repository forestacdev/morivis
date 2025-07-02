<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorOption from '$routes/map/components/layer_style_menu/ColorOption.svelte';
	import LabelOption from '$routes/map/components/layer_style_menu/LabelOption.svelte';
	import type {
		VectorEntryGeometryType,
		PolygonEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/map/data/types/vector';

	interface Props {
		layerEntry: PolygonEntry<GeoJsonMetaData | TileMetaData>;
	}

	let { layerEntry = $bindable() }: Props = $props();

	let showOutlineOption = $state<boolean>(false);
</script>

<div class="py-2">
	<RangeSlider label="不透明度" bind:value={layerEntry.style.opacity} min={0} max={1} step={0.01} />

	<!-- 色 -->
	<ColorOption bind:colorStyle={layerEntry.style.colors} />

	<Accordion label={'アウトライン'} bind:value={showOutlineOption}>
		<Switch label={'表示'} bind:value={layerEntry.style.outline.show} />

		<RangeSlider
			label="ライン幅"
			bind:value={layerEntry.style.outline.width}
			min={0}
			max={10}
			step={0.01}
		/>
		<div class="flex flex-col gap-2 pb-2">
			<ColorPicker label="ラインの色" bind:value={layerEntry.style.outline.color} />
		</div>

		<HorizontalSelectBox
			label={'ラインのスタイル'}
			bind:group={layerEntry.style.outline.lineStyle}
			options={[
				{ name: '実線', key: 'solid' },
				{ name: '破線', key: 'dashed' }
			]}
		/>
	</Accordion>

	<LabelOption bind:labels={layerEntry.style.labels} />
</div>

<style>
</style>
