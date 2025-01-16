<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { geoDataEntry } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { addedLayerIds, showDataMenu } from '$routes/map/store';

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

<!-- {#if $showDataMenu}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 grid h-full w-full place-items-center bg-black bg-opacity-50 p-8"
	>
		<div class="bg-main flex h-full w-full flex-grow flex-col rounded-lg p-2">
			<div class="flex flex-shrink-0 items-center justify-between p-2">
				<span class="text-lg">データカタログ</span>
				<button onclick={toggleDataMenu} class="bg-base rounded-full p-2">
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
			<div class="grid h-[700px] grid-cols-3 grid-rows-3 gap-4 overflow-y-auto p-2">
				{#each dataEntries as dataEntry}
					<button class="mb-4 flex flex-col items-center justify-center rounded-lg bg-gray-300">
						<div class="aspect-square flex-grow p-2">
							<img
								src={dataEntry.metaData.coverImage ?? './images/no_image.webp'}
								class="h-full w-full object-cover"
								alt="サムネイル"
							/>
						</div>
						<span class="h-[30px] flex-shrink-0">{dataEntry.metaData.name}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if} -->

{#if $showDataMenu}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 h-screen w-full bg-black bg-opacity-50 p-8"
	>
		<div class="bg-main flex h-full w-full flex-grow flex-col rounded-lg p-2">
			<div class="flex flex-shrink-0 items-center justify-between p-2">
				<span class="text-lg">データカタログ</span>
				<button onclick={toggleDataMenu} class="bg-base rounded-full p-2">
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
			<div class="css-grid h-full flex-grow overflow-auto">
				{#each dataEntries as dataEntry}
					<button class="mb-4 flex flex-col items-center justify-center rounded-lg bg-gray-300">
						<div class="relative aspect-square flex-grow overflow-hidden p-2">
							<img
								src={dataEntry.metaData.coverImage ?? './images/no_image.webp'}
								class="h-full w-full object-cover"
								alt="サムネイル"
							/>
						</div>
						<span class="h-[30px] flex-shrink-0">{dataEntry.metaData.name}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.css-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); /* 幅を指定 */
		grid-auto-rows: 400px; /* 高さを指定 */
		gap: 10px; /* 子要素間の隙間 */
	}
</style>
