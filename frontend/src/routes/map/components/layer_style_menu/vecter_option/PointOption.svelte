<script lang="ts">
	import { slide } from 'svelte/transition';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorOption from '$routes/map/components/layer_style_menu/ColorOption.svelte';
	import LabelOption from '$routes/map/components/layer_style_menu/LabelOption.svelte';
	import NumberOption from '$routes/map/components/layer_style_menu/NumberOption.svelte';
	import type { PointEntry, GeoJsonMetaData, TileMetaData } from '$routes/map/data/types/vector';
	interface Props {
		layerEntry: PointEntry<GeoJsonMetaData | TileMetaData>;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	let showOutlineOption = $state<boolean>(false);
	let showIconOption = $state<boolean>(false);
</script>

<!-- アイコンスタイル -->
{#if layerEntry.style.imageIcon}
	<Accordion label={'写真アイコン'} icon={'gg:pin'} bind:value={showIconOption}>
		<Switch label={'表示'} bind:value={layerEntry.style.imageIcon.show} />
	</Accordion>
{/if}
<!-- 色 -->
{#if layerEntry.style.imageIcon && !layerEntry.style.imageIcon.show}
	<ColorOption bind:colorStyle={layerEntry.style.colors} bind:showColorOption layerType="circle" />

	<NumberOption label={'円の半径'} icon={'mdi:radius'} bind:numberStyle={layerEntry.style.radius} />

	<Accordion label={'縁'} icon={'material-symbols:line-curve'} bind:value={showOutlineOption}>
		<Switch label={'表示'} bind:value={layerEntry.style.outline.show} />
		{#if layerEntry.style.outline.show}
			<div transition:slide={{ duration: 300 }}>
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
			</div>
		{/if}
	</Accordion>
{/if}

<LabelOption bind:labels={layerEntry.style.labels} />

<style>
</style>
