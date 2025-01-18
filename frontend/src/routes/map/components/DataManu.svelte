<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import DataPreview from '$map/components/DataPreview.svelte';
	import { IMAGE_TILE_XYZ } from '$map/constants';
	import { COVER_NO_IMAGE_PATH } from '$map/constants';
	import { getImagePmtiles } from '$map/utils/raster';
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
							{#await promise(dataEntry) then url}
								<img src={url} class="h-full w-full object-cover" alt="サムネイル" />
							{/await}
						</div>
						<span class="h-[30px] flex-shrink-0">{dataEntry.metaData.name}</span>
					</button>
				{/each}
			</div>
			<DataPreview />
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
