<script lang="ts">
	import { slide } from 'svelte/transition';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorOption from '$routes/map/components/layer_style_menu/ColorOption.svelte';
	import IconPicker from '$routes/map/components/layer_style_menu/extension_menu/IconPicker.svelte';
	import LabelOption from '$routes/map/components/layer_style_menu/LabelOption.svelte';
	import NumberOption from '$routes/map/components/layer_style_menu/NumberOption.svelte';
	import type { PointEntry, GeoJsonMetaData, TileMetaData } from '$routes/map/data/types/vector';
	import type { IconsExpression } from '$routes/map/data/types/vector/style';
	interface Props {
		layerEntry: PointEntry<GeoJsonMetaData | TileMetaData>;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	let showTypeOption = $state<boolean>(false);
	let showOutlineOption = $state<boolean>(false);
	let showIconOption = $state<boolean>(false);

	// セットされたアイコン式の設定
	let setIconExpression: IconsExpression | undefined = $derived.by(() => {
		const icons = layerEntry.style.icons;
		if (!icons) return;
		const target = icons.expressions.find((expr) => expr.key === icons.key);
		if (!target) return;
		return target;
	});
</script>

{#if layerEntry.style.icons}
	<div class="pt-4">
		<HorizontalSelectBox
			label={'ポイントのスタイル'}
			bind:group={layerEntry.style.markerType}
			options={[
				{ name: '円', key: 'circle' },
				{ name: 'アイコン', key: 'icon' }
			]}
		/>
	</div>
{/if}

{#if layerEntry.style.markerType === 'circle'}
	<!-- 色 -->
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

{#if layerEntry.style.markerType === 'icon' && layerEntry.style.icons && setIconExpression}
	<Accordion label={'アイコン'} icon={'gg:pin'} bind:value={showIconOption}>
		<Switch label={'表示'} bind:value={layerEntry.style.icons.show} />
		{#if setIconExpression.type === 'single' && setIconExpression.mapping.pattern}
			<IconPicker
				label="形状"
				bind:pattern={setIconExpression.mapping.pattern}
				layerType="circle"
			/>
		{:else if setIconExpression.type === 'match'}
			{#each setIconExpression.mapping.categories as _, index}
				<IconPicker
					label={setIconExpression.mapping.categories[index] as string}
					bind:pattern={setIconExpression.mapping.patterns[index]}
					layerType="circle"
				/>
			{/each}
		{/if}
		<RangeSlider
			label="アイコンサイズ"
			bind:value={layerEntry.style.icons.size}
			min={0}
			max={5}
			step={0.01}
		/>
	</Accordion>
{/if}

<LabelOption bind:labels={layerEntry.style.labels} />

<style>
</style>
