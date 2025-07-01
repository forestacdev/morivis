<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { IMAGE_TILE_XYZ } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { getImagePmtiles } from '$routes/utils/raster';
	import { convertTmsToXyz } from '$routes/utils/sources';
	import { xyzToWMSXYZ } from '$routes/utils/tile';

	interface Props {
		layerEntry: GeoDataEntry;
	}
	let { layerEntry }: Props = $props();

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

	const fetchCoverImage = async (_layerEntry: GeoDataEntry) => {
		// URLを生成して Promise として返す
		return await Promise.resolve(_layerEntry.metaData.coverImage);
	};

	const promise = (() => {
		try {
			if (layerEntry.type === 'raster') {
				if (layerEntry.format.type === 'image') {
					return generateIconImage(layerEntry);
				} else if (layerEntry.format.type === 'pmtiles') {
					return fetchTileImage(layerEntry);
				}
			} else if (layerEntry.type === 'vector') {
				return fetchCoverImage(layerEntry);
			}
		} catch (e) {
			isImageError = true;
			console.error('Error generating icon image:', e);
		}
	})();

	let isImageError = $state<boolean>(false);
</script>

{#if layerEntry.type === 'raster'}
	{#if !isImageError}
		{#if layerEntry.format.type === 'image'}
			{#await promise then url}
				<img
					transition:fade
					class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
					alt={layerEntry.metaData.name}
					src={url}
					onerror={() => {
						isImageError = true;
					}}
				/>
			{:catch}
				<Icon icon="mdi:raster" class="pointer-events-none" width={30} />
			{/await}
		{:else if layerEntry.format.type === 'pmtiles'}
			{#await promise then url}
				<img
					transition:fade
					class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
					alt={layerEntry.metaData.name}
					src={url}
					onerror={() => {
						isImageError = true;
					}}
				/>
			{:catch}
				<Icon icon="mdi:raster" class="pointer-events-none" width={30} />
			{/await}
		{/if}
	{:else}
		<Icon icon="mdi:raster" class="pointer-events-none" width={30} />
	{/if}
{:else if layerEntry.type === 'vector'}
	{#if layerEntry.metaData.coverImage}
		{#await promise then url}
			<img
				transition:fade
				class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
				alt={layerEntry.metaData.name}
				src={url}
			/>
		{/await}
	{:else if layerEntry.format.geometryType === 'Point'}
		<Icon icon="ic:baseline-mode-standby" class="pointer-events-none" width={30} />
	{:else if layerEntry.format.geometryType === 'LineString'}
		<Icon icon="ic:baseline-polymer" class="pointer-events-none" width={30} />
	{:else if layerEntry.format.geometryType === 'Polygon'}
		<Icon icon="ic:baseline-pentagon" class="pointer-events-none" width={30} />
	{:else if layerEntry.format.geometryType === 'Label'}
		<Icon icon="mynaui:label-solid" class="pointer-events-none" width={30} />
	{/if}
{/if}

<style>
</style>
