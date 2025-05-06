<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import { IMAGE_TILE_XYZ } from '$routes/constants';
	import { COVER_NO_IMAGE_PATH } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/data/types';
	import { getLayerType } from '$routes/store/layers';
	import { orderedLayerIds, groupedLayerStore, type LayerType } from '$routes/store/layers';
	import { showNotification } from '$routes/store/notification';
	import { getImagePmtiles } from '$routes/utils/raster';

	interface Props {
		dataEntry: GeoDataEntry;
		showDataEntry: GeoDataEntry | null;
		itemHeight: number;
		index: number;
	}

	let { dataEntry, showDataEntry = $bindable(), itemHeight = $bindable(), index }: Props = $props();

	let addedDataIds = $state<string[]>($orderedLayerIds);
	let container = $state<HTMLElement | null>(null);

	const updateItemHeight = (newHeight: number) => {
		itemHeight = newHeight + 20;
	};

	onMount(() => {
		if (container && index === 0) {
			const h = container.clientHeight;
			updateItemHeight(h);

			window?.addEventListener('resize', () => {
				if (container) {
					const h = container.clientHeight;
					updateItemHeight(h);
				}
			});
		}
	});

	let layerType = $derived.by((): LayerType | unknown => {
		if (dataEntry) {
			return getLayerType(dataEntry);
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
		showNotification(`${dataEntry.metaData.name}を追加しました`, 'success');
	};
	const deleteData = (id: string) => {
		groupedLayerStore.remove(id);
	};
</script>

<div
	class="relative mb-4 flex shrink-0 grow flex-col items-center justify-center overflow-hidden rounded-lg bg-gray-300 p-2"
	bind:this={container}
>
	<button
		onclick={() => (showDataEntry = dataEntry)}
		class="group relative flex aspect-video w-full shrink-0 cursor-pointer overflow-hidden"
	>
		{#await promise(dataEntry) then url}
			<img
				src={url}
				class="c-no-drag-icon h-full w-full rounded-md object-cover transition-transform duration-150 hover:scale-110"
				alt={dataEntry.metaData.name}
			/>
			<div
				class="pointer-events-none absolute grid h-full w-full place-items-center bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
			>
				<span class="text-lg text-white">プレビュー</span>
			</div>

			<span class="absolute bottom-1 right-0 rounded-l-full bg-black/40 p-2 text-xs text-white"
				>{dataEntry.metaData.attribution}</span
			>
		{/await}
	</button>

	<div class="flex w-full flex-col gap-1 py-2">
		<div class="">{dataEntry.metaData.name}</div>
		<div class="flex items-center gap-1 text-sm text-gray-600">
			<Icon icon="lucide:map-pin" class="h-5 w-5" /><span>{dataEntry.metaData.location}</span>
		</div>
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
