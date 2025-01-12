<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { IMAGE_TILE_XYZ } from '$map/constants';
	import type { GeoDataEntry } from '$map/data/types';
	import { getImagePmtiles } from '$map/utils/raster';

	let { layerEntry }: { layerEntry: GeoDataEntry } = $props();

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

	// 非同期関数を初期化時に実行
	const promise = (() => {
		if (layerEntry.type === 'raster') {
			if (layerEntry.format.type === 'image') {
				return generateIconImage(layerEntry);
			} else if (layerEntry.format.type === 'pmtiles') {
				return fetchTileImage(layerEntry);
			}
		}
	})();
</script>

{#if layerEntry.type === 'raster'}
	{#if layerEntry.format.type === 'image'}
		{#await promise then url}
			<img
				transition:fade
				class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
				crossOrigin="anonymous"
				alt={layerEntry.metaData.name}
				src={url}
			/>
		{/await}
	{:else if layerEntry.format.type === 'pmtiles'}
		{#await promise then url}
			<img
				transition:fade
				crossOrigin="anonymous"
				class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
				alt={layerEntry.metaData.name}
				src={url}
			/>
		{/await}
	{/if}
{:else if layerEntry.type === 'vector'}
	<div transition:fade={{ duration: 100 }} class="pointer-events-none absolute">
		{#if layerEntry.format.geometryType === 'Point'}
			<Icon icon="ic:baseline-mode-standby" class="pointer-events-none" width={30} />
		{:else if layerEntry.format.geometryType === 'LineString'}
			<Icon icon="ic:baseline-polymer" class="pointer-events-none" width={30} />
		{:else if layerEntry.format.geometryType === 'Polygon'}
			<Icon icon="ic:baseline-pentagon" class="pointer-events-none" width={30} />
		{/if}
	</div>
{/if}

<style>
</style>
