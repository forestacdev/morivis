<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { ImageResult } from '$routes/map/utils/image';
	import { getLayerImage } from '$routes/map/utils/image';
	import { getBaseMapImageUrl } from '$routes/map/utils/image/vector';

	interface Props {
		layerEntry: GeoDataEntry;
		rounded?: boolean;
	}
	let { layerEntry, rounded = true }: Props = $props();

	let isImageError = $state<boolean>(false);

	// 画像読み込み完了後のクリーンアップ
	const handleImageLoad = (_imageResult: ImageResult) => {
		if (_imageResult.cleanup) {
			_imageResult.cleanup();
		}
	};

	const promise = $derived.by(() => {
		try {
			return getLayerImage(layerEntry);
		} catch (error) {
			console.error('Error generating icon image:', error);
			return Promise.resolve(undefined);
		}
	});

	$effect(() => {
		// layerEntryが変わったらエラー状態をリセット
		void layerEntry.id;
		isImageError = false;
	});
</script>

{#if !isImageError}
	{#await promise then imageResult}
		{#if layerEntry.metaData.xyzImageTile && layerEntry.type === 'vector'}
			<img
				transition:fade
				class="c-basemap-img pointer-events-none absolute block h-full w-full object-cover {rounded
					? 'rounded-full'
					: ''}"
				alt="背景地図画像"
				src={getBaseMapImageUrl(layerEntry.metaData.xyzImageTile)}
			/>
		{/if}
		{#if imageResult}
			<img
				transition:fade
				class="pointer-events-none absolute block h-full w-full object-cover {rounded
					? 'rounded-full'
					: ''}"
				alt={layerEntry.metaData.name}
				src={imageResult.url}
				onload={() => handleImageLoad(imageResult)}
				onerror={() => {
					isImageError = true;
				}}
			/>
		{/if}
	{:catch}
		{#if layerEntry.type === 'raster'}
			<Icon icon="mdi:raster" class="pointer-events-none" width={30} />
		{:else if layerEntry.type === 'vector'}
			{#if layerEntry.format.geometryType === 'Point'}
				<Icon icon="ic:baseline-mode-standby" class="pointer-events-none" width={30} />
			{:else if layerEntry.format.geometryType === 'LineString'}
				<Icon icon="ic:baseline-polymer" class="pointer-events-none" width={30} />
			{:else if layerEntry.format.geometryType === 'Polygon'}
				<Icon icon="ic:baseline-pentagon" class="pointer-events-none" width={30} />
			{/if}
		{:else if layerEntry.type === 'model'}
			<Icon icon="mdi:cube-outline" class="pointer-events-none" width={30} />
		{/if}
	{/await}
{/if}

<style>
</style>
