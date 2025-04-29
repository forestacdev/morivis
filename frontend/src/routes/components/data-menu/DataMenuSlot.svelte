<script lang="ts">
	import Icon from '@iconify/svelte';

	import LayerIcon from '$routes/components/atoms/LayerIcon.svelte';
	import { IMAGE_TILE_XYZ } from '$routes/constants';
	import { COVER_NO_IMAGE_PATH } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/data/types';
	import { showDataMenu } from '$routes/store';
	import { orderedLayerIds, groupedLayerStore, type LayerType } from '$routes/store/layers';
	import { getImagePmtiles } from '$routes/utils/raster';

	interface Props {
		dataEntry: GeoDataEntry;
		showDataEntry: GeoDataEntry | null;
	}

	let { dataEntry, showDataEntry = $bindable() }: Props = $props();

	let addedDataIds = $state<string[]>($orderedLayerIds);

	let layerType = $derived.by((): LayerType | unknown => {
		if (dataEntry) {
			if (dataEntry.type === 'raster') {
				return 'raster';
			} else if (dataEntry.type === 'vector') {
				if (dataEntry.format.geometryType === 'Label') {
					return 'label';
				} else if (dataEntry.format.geometryType === 'Point') {
					return 'point';
				} else if (dataEntry.format.geometryType === 'LineString') {
					return 'line';
				} else if (dataEntry.format.geometryType === 'Polygon') {
					return 'polygon';
				}
			}
		}
	});

	orderedLayerIds.subscribe((value) => {
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
		if (!layerType) return;
		groupedLayerStore.add(id, layerType as LayerType);
	};
	const deleteData = (id: string) => {
		groupedLayerStore.remove(id);
	};
</script>

<div
	class="relative mb-4 flex shrink-0 grow flex-col items-center justify-center overflow-hidden rounded-lg bg-gray-300 p-2"
>
	<button
		onclick={() => (showDataEntry = dataEntry)}
		class="relative flex aspect-video w-full shrink-0 overflow-hidden"
	>
		{#await promise(dataEntry) then url}
			<img
				src={url}
				class="css-no-drag-icon h-full w-full rounded-md object-cover transition-transform duration-150 hover:scale-110"
				alt="サムネイル"
			/>
		{/await}
	</button>

	<div class="flex w-full items-center justify-start gap-2 py-2">
		<label
			class="relative grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-white"
		>
			<LayerIcon layerEntry={dataEntry} />
		</label>
		<span class="">{dataEntry.metaData.name}</span>
	</div>

	<div class=" shrink-0">
		{#if addedDataIds.includes(dataEntry.id)}
			<button
				onclick={() => deleteData(dataEntry.id)}
				class="c-btn-cancel flex items-center gap-2 px-4"
			>
				<Icon icon="material-symbols:check" class=" h-8 w-8" />
				<div>地図に追加済み</div>
			</button>
		{:else}
			<button
				onclick={() => addData(dataEntry.id)}
				class="c-btn-confirm flex shrink-0 grow items-center gap-2 px-4"
			>
				<Icon icon="material-symbols:add" class=" h-8 w-8" />
				<div>地図に追加</div>
			</button>
		{/if}
	</div>
</div>

<style>
</style>
