<script lang="ts">
	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import HorizontalSelectBox from '$routes/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/components/atoms/Switch.svelte';
	import ColorOption from '$routes/components/layer-menu/layer-option-menu/ColorOption.svelte';
	import LabelOption from '$routes/components/layer-menu/layer-option-menu/LabelOption.svelte';
	import type {
		GeometryType,
		PolygonEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/data/types/vector';

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
