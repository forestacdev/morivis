<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import ColorOption from '$routes/map/components/layer_style_menu/ColorOption.svelte';
	import LabelOption from '$routes/map/components/layer_style_menu/LabelOption.svelte';
	import NumberOption from '$routes/map/components/layer_style_menu/NumberOption.svelte';
	import type {
		LineStringEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/map/data/types/vector';

	interface Props {
		layerEntry: LineStringEntry<GeoJsonMetaData | TileMetaData>;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	let showLineOption = $state<boolean>(false);
</script>

<!-- 色 -->
<ColorOption bind:colorStyle={layerEntry.style.colors} bind:showColorOption />
<NumberOption
	label={'ライン幅'}
	icon={'mingcute:line-fill'}
	bind:numberStyle={layerEntry.style.width}
/>
<Accordion label={'スタイル'} icon={'fluent:line-dashes-32-filled'} bind:value={showLineOption}>
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
