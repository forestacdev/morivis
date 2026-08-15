<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import BaseSelectMenu from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import type { SelectMenuItem } from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import type { Tiles3DMeshStyleEntry } from '$routes/map/data/types/model';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: Tiles3DMeshStyleEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
	let showTransformOption = $state(false);

	const lightingItems: SelectMenuItem[] = [
		{
			key: 'pbr',
			name: 'PBR'
		},
		{
			key: 'flat',
			name: 'フラット'
		}
	];

	$effect(() => {
		$state.snapshot(layerEntry.style);
		mapStore.setDeckTiles3DMeshStyle(layerEntry);
	});
</script>

<Accordion label="表示調整" icon="mdi:palette" bind:value={showColorOption}>
	<ColorPicker label="色" bind:value={layerEntry.style.color} />

	<div class="pb-2">
		<div class="pb-2 text-base select-none">ライティング</div>
		<BaseSelectMenu bind:selectedKey={layerEntry.style.lighting} items={lightingItems} />
	</div>
</Accordion>

<Accordion label="変形・移動" icon="gis:cube-3d" bind:value={showTransformOption}>
	<RangeSlider
		label="スケール"
		bind:value={layerEntry.style.transform.scale}
		min={0.01}
		max={20}
		step={0.01}
		icon="mdi:resize"
	/>

	<RangeSlider
		label="X回転 (°)"
		bind:value={layerEntry.style.transform.rotationX}
		min={-180}
		max={180}
		step={1}
		isInt
		icon="mdi:rotate-right"
	/>

	<RangeSlider
		label="Y回転 (°)"
		bind:value={layerEntry.style.transform.rotationY}
		min={-180}
		max={180}
		step={1}
		isInt
		icon="mdi:rotate-right"
	/>

	<RangeSlider
		label="Z回転 (°)"
		bind:value={layerEntry.style.transform.rotationZ}
		min={-180}
		max={180}
		step={1}
		isInt
		icon="mdi:rotate-right"
	/>

	<RangeSlider
		label="X移動 (m)"
		bind:value={layerEntry.style.transform.translationX}
		min={-500}
		max={500}
		step={1}
		isInt
		icon="mdi:arrow-left-right"
	/>

	<RangeSlider
		label="Y移動 (m)"
		bind:value={layerEntry.style.transform.translationY}
		min={-500}
		max={500}
		step={1}
		isInt
		icon="mdi:arrow-left-right"
	/>

	<RangeSlider
		label="Z移動 (m)"
		bind:value={layerEntry.style.transform.translationZ}
		min={-500}
		max={500}
		step={1}
		isInt
		icon="mdi:arrow-up-down"
	/>
</Accordion>
