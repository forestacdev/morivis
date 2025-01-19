<script lang="ts">
	import Icon from '@iconify/svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';

	import DataPreview from '$map/components/DataPreview.svelte';
	import LayerIcon from '$map/components/LayerIcon.svelte';
	import { IMAGE_TILE_XYZ } from '$map/constants';
	import { COVER_NO_IMAGE_PATH } from '$map/constants';
	import { getImagePmtiles } from '$map/utils/raster';
	import { geoDataEntry } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { addedLayerIds, showDataMenu } from '$routes/map/store';

	// export let mapBearing: number;
	let dataEntries = $state<GeoDataEntry[]>([]);
	let filterDataEntries = $derived.by(() => {
		if (showDataEntry) {
			return dataEntries.filter((data) => showDataEntry && data.id === showDataEntry.id);
		} else {
			return dataEntries;
		}
	});
	let showDataEntry = $state<GeoDataEntry | null>(null);

	dataEntries = geoDataEntry;

	let addedDataIds = $state<string[]>($addedLayerIds);

	addedLayerIds.subscribe((value) => {
		addedDataIds = value;
	});

	const showData = (id: string) => {
		showDataEntry = dataEntries.find((data) => data.id === id) as GeoDataEntry;
	};

	const toggleDataMenu = () => {
		showDataMenu.set(!showDataMenu);
	};

	const generateIconImage = async (_layerEntry: GeoDataEntry): Promise<string | undefined> => {
		if (_layerEntry.type !== 'raster') {
			// raster タイプ以外の場合は undefined を返す
			return Promise.resolve(undefined);
		}
		// xyz タイル情報を取得
		const tile = _layerEntry.metaData.xyzImageTile
			? _layerEntry.metaData.xyzImageTile
			: IMAGE_TILE_XYZ;

		// URLを生成して Promise として返す
		return Promise.resolve(
			_layerEntry.format.url
				.replace('{z}', tile.z.toString())
				.replace('{x}', tile.x.toString())
				.replace('{y}', tile.y.toString())
		);
	};

	// 非同期で画像URLを取得
	const fetchTileImage = async (_layerEntry: GeoDataEntry) => {
		try {
			if (_layerEntry.type !== 'raster' || _layerEntry.format.type !== 'pmtiles') return;
			const tile = _layerEntry.metaData.xyzImageTile
				? _layerEntry.metaData.xyzImageTile
				: IMAGE_TILE_XYZ;
			return await getImagePmtiles(_layerEntry.format.url, tile);
		} catch (e) {
			console.error('Error fetching tile image:', e);
		}
	};

	const promise = async (layerEntry: GeoDataEntry) => {
		if (layerEntry.type === 'raster') {
			if (layerEntry.format.type === 'image') {
				return generateIconImage(layerEntry);
			} else if (layerEntry.format.type === 'pmtiles') {
				return fetchTileImage(layerEntry);
			}
		} else if (layerEntry.type === 'vector') {
			return layerEntry.metaData.coverImage ?? COVER_NO_IMAGE_PATH;
		}
	};
</script>

{#if $showDataMenu}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 h-screen w-full bg-black bg-opacity-50 p-8"
	>
		<div class="bg-main relative flex h-full w-full flex-grow flex-col rounded-lg p-2">
			<div class="flex flex-shrink-0 items-center justify-between p-2">
				<span class="text-lg">データカタログ</span>
				<button onclick={toggleDataMenu} class="bg-base rounded-full p-2">
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
			<div class="h-full w-full flex-grow overflow-auto {showDataEntry ? 'flex' : ''}">
				<div class={showDataEntry ? 'w-[400px] flex-shrink' : 'css-grid h-full'}>
					{#if showDataEntry}
						<div class="flex flex-shrink-0 items-center justify-between p-2">
							<button onclick={() => (showDataEntry = null)} class="bg-base rounded-full p-2">
								<Icon icon="ep:back" class="text-main w-4] h-4" />
							</button>
						</div>
					{/if}
					{#each filterDataEntries as dataEntry (dataEntry.id)}
						<button
							animate:flip={{ duration: 200 }}
							onclick={() => showData(dataEntry.id)}
							class="relative mb-4 flex flex-col items-center justify-center rounded-lg bg-gray-300"
						>
							<div class="relative aspect-video overflow-hidden p-2">
								{#await promise(dataEntry) then url}
									<img src={url} class="h-full w-full rounded-md object-cover" alt="サムネイル" />
								{/await}
								{#if addedDataIds.includes(dataEntry.id)}
									<div
										class="text-main absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
									>
										<div>地図に追加済み</div>
										<Icon icon="material-symbols:check" class=" h-8 w-8" />
									</div>
								{/if}
							</div>

							<div class="flex w-full items-center justify-start gap-2 p-2">
								<label
									class="relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500"
								>
									<LayerIcon layerEntry={dataEntry} />
								</label>
								<span class="h-[30px] flex-shrink-0">{dataEntry.metaData.name}</span>
							</div>
						</button>
					{/each}
				</div>
				<DataPreview bind:showDataEntry />
			</div>
		</div>
	</div>
{/if}

<style>
	.css-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* 幅を指定 */
		grid-auto-rows: 300px; /* 高さを指定 */
		gap: 10px; /* 子要素間の隙間 */
	}
</style>
