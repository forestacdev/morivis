<script lang="ts">
	import Icon from '@iconify/svelte';

	import LayerIcon from '$routes/components/atoms/LayerIcon.svelte';
	import { IMAGE_TILE_XYZ } from '$routes/constants';
	import { COVER_NO_IMAGE_PATH } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/data/types';
	import { addedLayerIds, showDataMenu } from '$routes/store';
	import { getImagePmtiles } from '$routes/utils/raster';

	interface Props {
		dataEntry: GeoDataEntry;
	}

	let { dataEntry }: Props = $props();

	let addedDataIds = $state<string[]>($addedLayerIds);

	addedLayerIds.subscribe((value) => {
		addedDataIds = value;
	});
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

	const addData = (id: string) => {
		addedLayerIds.addLayer(id);
	};
	const deleteData = (id: string) => {
		addedLayerIds.removeLayer(id);
	};
</script>

<div class="relative mb-4 flex flex-col items-center justify-center rounded-lg bg-gray-300">
	<button class="relative aspect-video overflow-hidden p-2">
		{#await promise(dataEntry) then url}
			<img
				src={url}
				class="css-no-drag-icon h-full w-full rounded-md object-cover"
				alt="サムネイル"
			/>
		{/await}
	</button>

	<div class="flex w-full items-center justify-start gap-2 p-2">
		<label
			class="relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-white"
		>
			<LayerIcon layerEntry={dataEntry} />
		</label>
		<span class="h-[30px] flex-shrink-0">{dataEntry.metaData.name}</span>
	</div>

	{#if addedDataIds.includes(dataEntry.id)}
		<button
			onclick={() => deleteData(dataEntry.id)}
			class="bg-main flex items-center justify-center rounded-full px-4"
		>
			<Icon icon="material-symbols:check" class=" h-8 w-8" />
			<div>地図に追加済み</div>
		</button>
	{:else}
		<button
			onclick={() => addData(dataEntry.id)}
			class="text-main bg-accent flex items-center justify-center rounded-full px-4"
		>
			<Icon icon="material-symbols:add" class=" h-8 w-8" />
			<div>地図に追加</div>
		</button>
	{/if}
</div>

<style>
</style>
