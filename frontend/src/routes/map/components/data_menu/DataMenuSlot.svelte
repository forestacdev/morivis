<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	import { IMAGE_TILE_XYZ } from '$routes/constants';
	import { COVER_NO_IMAGE_PATH } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { showNotification } from '$routes/stores/notification';
	import { getImagePmtiles } from '$routes/map/utils/raster';
	import PreviewSlot from '$routes/map/components/data_menu/PreviewSlot.svelte';
	import { convertTmsToXyz } from '$routes/map/utils/sources';
	import { xyzToWMSXYZ } from '$routes/map/utils/tile';

	import { activeLayerIdsStore } from '$routes/stores/layers';

	interface Props {
		dataEntry: GeoDataEntry;
		showDataEntry: GeoDataEntry | null;
		itemHeight: number;
		index: number;
	}

	let { dataEntry, showDataEntry = $bindable(), itemHeight = $bindable(), index }: Props = $props();

	let isHover = $state(false);

	let isAdded = $derived.by(() => {
		return $activeLayerIdsStore.includes(dataEntry.id);
	});
	let container = $state<HTMLElement | null>(null);

	const updateItemHeight = (newHeight: number) => {
		itemHeight = newHeight + 20;
	};

	onMount(() => {
		window?.addEventListener('resize', () => {
			if (container) {
				const h = container.clientHeight;
				updateItemHeight(h);
			}
		});
	});

	$effect(() => {
		if (container) {
			const h = container.clientHeight;
			updateItemHeight(h);
		}
	});

	const generateIconImage = async (_layerEntry: GeoDataEntry): Promise<string | undefined> => {
		if (_layerEntry.type !== 'raster') {
			// raster タイプ以外の場合は undefined を返す
			return Promise.resolve(undefined);
		}
		// xyz タイル情報を取得
		let tile = _layerEntry.metaData.xyzImageTile
			? _layerEntry.metaData.xyzImageTile
			: IMAGE_TILE_XYZ;

		// urlに{-y} が含まれている場合は、タイル座標を WMS タイル座標に変換
		if (_layerEntry.format.url.includes('{-y}')) {
			tile = xyzToWMSXYZ(tile);
		}

		// URLを生成して Promise として返す
		return Promise.resolve(
			convertTmsToXyz(_layerEntry.format.url)
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
		activeLayerIdsStore.add(id);
		showNotification(`${dataEntry.metaData.name}を追加しました`, 'success');
	};
	const deleteData = (id: string) => {
		activeLayerIdsStore.remove(id);
	};
</script>

<div
	class="relative mb-4 flex aspect-square shrink-0 grow flex-col items-center justify-center overflow-hidden rounded-lg bg-black p-2 transition-all duration-150 hover:z-10 hover:rotate-2 hover:scale-110 hover:bg-amber-50 hover:shadow-lg"
	bind:this={container}
>
	<button
		onclick={() => (showDataEntry = dataEntry)}
		disabled={isAdded}
		class="group relative flex aspect-video w-full shrink-0 cursor-pointer overflow-hidden"
	>
		{#await promise(dataEntry) then url}
			<img
				src={url}
				class="c-no-drag-icon absolute h-full w-full rounded-md object-cover transition-transform duration-150 {isAdded
					? ''
					: 'hover:scale-110'}"
				alt={dataEntry.metaData.name}
				onmouseover={() => (isHover = true)}
				onmouseleave={() => (isHover = false)}
				onfocus={() => (isHover = true)}
				onblur={() => (isHover = false)}
				loading="lazy"
			/>
			<!-- {#if isHover}
				<PreviewSlot {dataEntry} />
			{/if} -->
			<div class="c-bg pointer-events-none absolute grid h-full w-full place-items-center"></div>
			<div
				class="pointer-events-none absolute grid h-full w-full place-items-center bg-black/50 {isAdded
					? ''
					: 'opacity-0 transition-opacity duration-150  group-hover:opacity-100'}"
			>
				<span class="text-lg text-white">{isAdded ? '地図に追加済み' : 'プレビュー'}</span>
			</div>

			<span class="absolute bottom-0 right-0 rounded-ss-lg bg-black/40 p-2 pl-4 text-xs text-white"
				>{dataEntry.metaData.attribution}</span
			>
		{/await}
	</button>
	<div class="shrink-0">
		{#if isAdded}
			<button
				onclick={() => deleteData(dataEntry.id)}
				class="c-btn-cancel flex items-center gap-2 px-4"
			>
				<Icon icon="ic:round-minus" class=" h-8 w-8" />
			</button>
		{:else}
			<button
				onclick={() => addData(dataEntry.id)}
				class="c-btn-confirm flex shrink-0 grow items-center gap-2 px-4"
			>
				<Icon icon="material-symbols:add" class=" h-8 w-8" />
			</button>
		{/if}
	</div>

	<div class="flex w-full flex-col gap-1 py-2">
		<div class="text-base">{dataEntry.metaData.name}</div>
		<div class="flex items-center gap-1 text-sm text-gray-400">
			<Icon icon="lucide:map-pin" class="h-5 w-5" /><span>{dataEntry.metaData.location}</span>
		</div>
	</div>
</div>

<style>
	.c-bg {
		background: radial-gradient(
			circle,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0) 60%,
			rgba(0, 0, 0, 0.5) 100%
		);
	}
</style>
