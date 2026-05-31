<script lang="ts">
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import type { ModelGeoArrowEntry } from '$routes/map/data/types/model';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: ModelGeoArrowEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	void showColorOption;

	$effect(() => {
		$state.snapshot(layerEntry.style.color);
		mapStore.setDeckGeoArrowColor(layerEntry.id, layerEntry.style.color);
	});
</script>

<div class="mt-8">
	<ColorPicker label="色" bind:value={layerEntry.style.color} />
</div>
