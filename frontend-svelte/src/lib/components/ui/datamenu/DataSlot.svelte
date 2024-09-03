<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { LayerEntry } from '$lib/data/types';
	import { showlayerOptionId } from '$lib/store/store';
	import { mapStore } from '$lib/store/map';
	import { BASEMAP_IMAGE_TILE } from '$lib/constants';

	import { addedLayerIds } from '$lib/store/store';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let layerEntry: LayerEntry;

	// レイヤーの追加、削除
	const toggleLayer = (id: string) => {
		addedLayerIds.addLayer(id);
	};

	const preview = () => {
		mapStore.addPreviewLayer(layerEntry);
	};
</script>

<div
	class="relative flex h-[300px] w-full select-none flex-col justify-between gap-x-2 rounded-sm border-[1px] border-slate-50"
>
	<div class="relative flex w-full justify-between">
		<button
			on:click={preview}
			class="w-full cursor-pointer items-end p-2 transition-all duration-150"
		>
			<span class="">{layerEntry.name}</span>
		</button>
		<button
			class="absolute right-1 top-2 flex w-12 cursor-pointer items-center justify-center"
			on:click={() => toggleLayer(layerEntry.id)}
		>
			<Icon
				class="transition-all duration-150"
				icon="weui:setting-outlined"
				width="24"
				height="24"
			/>
		</button>
	</div>
	{#if layerEntry.type === 'raster'}
		<label
			class="absolute h-[200px] w-[100px] cursor-pointer select-none items-center justify-start rounded-md bg-cover bg-center p-2 transition-all duration-200"
			style="background-image: url({layerEntry.path
				.replace('{z}', BASEMAP_IMAGE_TILE.Z.toString())
				.replace('{x}', BASEMAP_IMAGE_TILE.X.toString())
				.replace('{y}', BASEMAP_IMAGE_TILE.Y.toString())})"
		>
		</label>
	{/if}
</div>

<style>
	/* グロー効果 */
	.custom-shadow {
		--color: #0e8b00a3;
		box-shadow:
			1px 1px 10px var(--color),
			-1px -1px 10px var(--color),
			-1px 1px 10px var(--color),
			1px -1px 10px var(--color),
			0px 1px 10px var(--color),
			0 -1px 10px var(--color),
			-1px 0 10px var(--color),
			1px 0 10px var(--color);
	}

	.custom-filter {
		filter: brightness(0.8);
	}
	.custom-text-shadow {
		--color: #323232a3;
		text-shadow:
			1px 1px 10px var(--color),
			-1px -1px 10px var(--color),
			-1px 1px 10px var(--color),
			1px -1px 10px var(--color),
			0px 1px 10px var(--color),
			0 -1px 10px var(--color),
			-1px 0 10px var(--color),
			1px 0 10px var(--color);
	}

	.custom-text-shadow-active {
		--color: #00780ea3;
		text-shadow:
			1px 1px 10px var(--color),
			-1px -1px 10px var(--color),
			-1px 1px 10px var(--color),
			1px -1px 10px var(--color),
			0px 1px 10px var(--color),
			0 -1px 10px var(--color),
			-1px 0 10px var(--color),
			1px 0 10px var(--color);
	}
	/* :root {
		--active-width: 200px;
		--inactive-width: 150px;
	}
	.slot-active-anime {
		animation: slot-active 0.2s forwards;
		width: var(--inactive-width);
	}
	@keyframes slot-active {
		100% {
			width: var(--active-width);
		}
	}

	.slot-inactive-anime {
		width: var(--active-width);
		animation: slot-inactive 0.2s forwards;
	}

	@keyframes slot-inactive {
		100% {
			width: var(--inactive-width);
		}
	} */
</style>
