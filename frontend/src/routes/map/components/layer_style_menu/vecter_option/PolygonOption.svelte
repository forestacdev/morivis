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
	import { slide } from 'svelte/transition';
	import ExpressionsPulldownBox from '$routes/map/components/atoms/ExpressionsPulldownBox.svelte';
	interface Props {
		layerEntry: PolygonEntry<GeoJsonMetaData | TileMetaData>;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	let showOutlineOption = $state<boolean>(false);
	let show3DOption = $state<boolean>(false);
</script>

<!-- 色 -->
<ColorOption bind:colorStyle={layerEntry.style.colors} bind:showColorOption />

{#if layerEntry.style.extrusion}
	<Accordion label={'3D表現'} icon={'iconoir:3d-select-solid'} bind:value={show3DOption}>
		<Switch label={'押し出し'} bind:value={layerEntry.style.extrusion.show} />

		{#if layerEntry.style.extrusion.show}
			<ExpressionsPulldownBox
				bind:style={layerEntry.style.extrusion.height}
				expressionType={'number'}
			/>
		{/if}
	</Accordion>
{/if}

<Accordion
	label={'アウトライン'}
	icon={'material-symbols:pentagon-outline-rounded'}
	bind:value={showOutlineOption}
>
	<Switch label={'表示'} bind:value={layerEntry.style.outline.show} />

	{#if layerEntry.style.outline.show}
		<div transition:slide={{ duration: 300 }}>
			<RangeSlider
				label="ライン幅"
				bind:value={layerEntry.style.outline.width}
				min={0}
				max={10}
				step={0.01}
			/>

			<ColorPicker label="ラインの色" bind:value={layerEntry.style.outline.color} />

			<HorizontalSelectBox
				label={'ラインのスタイル'}
				bind:group={layerEntry.style.outline.lineStyle}
				options={[
					{ name: '実線', key: 'solid' },
					{ name: '破線', key: 'dashed' }
				]}
			/>
		</div>
	{/if}
</Accordion>

<LabelOption bind:labels={layerEntry.style.labels} />

<style>
</style>
