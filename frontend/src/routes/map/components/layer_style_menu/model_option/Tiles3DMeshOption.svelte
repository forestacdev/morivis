<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import BaseSelectMenu from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import type { SelectMenuItem } from '$routes/map/components/atoms/select/BaseSelectMenu.svelte';
	import type { Tiles3DMeshStyleEntry } from '$routes/map/data/types/model';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: Tiles3DMeshStyleEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

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
