<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import ExpressionsPulldownBox from '$routes/map/components/atoms/ExpressionsPulldownBox.svelte';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorOption from '$routes/map/components/layer-style-menu/ColorOption.svelte';
	import LabelOption from '$routes/map/components/layer-style-menu/LabelOption.svelte';
	import NumberOption from '$routes/map/components/layer-style-menu/NumberOption.svelte';
	import type {
		VectorEntryGeometryType,
		PointEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/map/data/types/vector';

	interface Props {
		layerEntry: PointEntry<GeoJsonMetaData | TileMetaData>;
	}

	let { layerEntry = $bindable() }: Props = $props();

	let showTypeOption = $state<boolean>(false);
	let showOutlineOption = $state<boolean>(false);
	let showIconOption = $state<boolean>(false);
</script>

<RangeSlider label="不透明度" bind:value={layerEntry.style.opacity} min={0} max={1} step={0.01} />

{#if layerEntry.style.icon}
	<HorizontalSelectBox
		label={'ポイントのスタイル'}
		bind:group={layerEntry.style.markerType}
		options={[
			{ name: '円', key: 'circle' },
			{ name: 'アイコン', key: 'icon' }
		]}
	/>
{/if}

{#if layerEntry.style.markerType === 'circle'}
	<!-- 色 -->
	<ColorOption bind:colorStyle={layerEntry.style.colors} />

	<NumberOption label={'円の半径'} bind:numberStyle={layerEntry.style.radius} />

	<Accordion label={'縁'} bind:value={showOutlineOption}>
		<Switch label={'表示'} bind:value={layerEntry.style.outline.show} />
		<RangeSlider
			label="縁の幅"
			bind:value={layerEntry.style.outline.width}
			min={0}
			max={10}
			step={0.01}
		/>
		<div class="flex flex-col gap-2 pb-2">
			<ColorPicker label="縁の色" bind:value={layerEntry.style.outline.color} />
		</div>
	</Accordion>
{/if}

{#if layerEntry.style.markerType === 'icon' && layerEntry.style.icon}
	<Accordion label={'アイコン'} bind:value={showIconOption}>
		<Switch label={'表示'} bind:value={layerEntry.style.icon.show} />
		<RangeSlider
			label="アイコンサイズ"
			bind:value={layerEntry.style.icon.size}
			min={0}
			max={0.5}
			step={0.01}
		/>
	</Accordion>
{/if}

<LabelOption bind:labels={layerEntry.style.labels} />

<style>
</style>
