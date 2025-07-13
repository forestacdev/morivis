<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import LayerSlot from '$routes/map/components/layer_menu/LayerSlot.svelte';
	import RasterOptionMenu from '$routes/map/components/layer_style_menu/RasterOptionMenu.svelte';
	import VectorOptionMenu from '$routes/map/components/layer_style_menu/VectorOptionMenu.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';

	import { mapStore } from '$routes/stores/map';
	import { style } from '$routes/_development/maptreestyle/style';
	import { showLabelLayer } from '$routes/stores/layers';
	import Switch from '../atoms/Switch.svelte';
	import Accordion from '../atoms/Accordion.svelte';

	interface Props {
		layerEntry: GeoDataEntry | null;
		tempLayerEntries: GeoDataEntry[];
	}

	let { layerEntry = $bindable(), tempLayerEntries = $bindable() }: Props = $props();
	let showVisibleOption = $state<boolean>(false);
	let showColorOption = $state<boolean>(false);

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			layerEntry = null;
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

{#if layerEntry}
	<div
		in:fly={{ duration: 300, opacity: 0, x: -100 }}
		out:fly={{ duration: 300, opacity: 0, x: -100, delay: 150 }}
		class="bg-main w-side-menu pt-18 absolute top-0 z-10 flex h-full flex-col gap-2 overflow-hidden pl-2"
	>
		{#key layerEntry.id}
			<div
				in:fly={{ duration: 300, opacity: 10, x: -10 }}
				out:fly={{ duration: 300, opacity: 0, x: -10 }}
				class="absolute flex h-full w-full flex-col gap-2"
			>
				<div class="text-2xl text-base">{layerEntry.metaData.name}</div>
				<div class="flex items-center gap-2 border-t text-base"></div>
				<div class="c-scroll h-full grow overflow-x-hidden">
					<Accordion label={'表示制御'} bind:value={showVisibleOption}>
						<Switch
							label="表示"
							bind:value={layerEntry.style.visible as boolean}
							icon={'akar-icons:eye'}
						/>
						<RangeSlider
							label={'不透明度'}
							bind:value={layerEntry.style.opacity}
							min={0.1}
							max={1}
							step={0.01}
							icon={'mdi:circle-opacity'}
						/>
					</Accordion>
					{#if layerEntry.type === 'vector'}
						<VectorOptionMenu bind:layerEntry bind:showColorOption />
					{/if}

					{#if layerEntry.type === 'raster'}
						<RasterOptionMenu bind:layerEntry bind:showColorOption />
					{/if}
				</div>
			</div>
		{/key}
	</div>
{/if}

<style>
</style>
