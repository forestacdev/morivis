<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { geoDataEntry } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { isSide, addedLayerIds, showDataMenu } from '$routes/map/store';

	// export let mapBearing: number;
	let dataEntries = $state<GeoDataEntry[]>([]);

	dataEntries = geoDataEntry;

	const addLayer = (id: string) => {
		addedLayerIds.addLayer(id);
	};

	const toggleDataMenu = () => {
		showDataMenu.set(!showDataMenu);
	};
</script>

{#if $showDataMenu}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 grid h-full w-full place-items-center bg-black bg-opacity-50 p-12"
	>
		<div class="bg-main flex h-full w-full flex-col rounded-lg p-2">
			<div class="flex items-center justify-between p-2">
				<span class="text-lg">データカタログ</span>
				<button onclick={toggleDataMenu} class="bg-base rounded-full p-2">
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
			<div class="grid grid-cols-2 gap-4 p-2">
				{#each dataEntries as dataEntry}
					<button class="mb-4" onclick={() => addLayer(dataEntry.id)}>
						<div class="h-full flex-grow rounded-md bg-gray-300 p-2">ここに画像</div>
						<span class="h-[30px] flex-shrink-0">{dataEntry.metaData.name}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
</style>
