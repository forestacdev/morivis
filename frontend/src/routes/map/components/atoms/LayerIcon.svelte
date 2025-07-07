<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';
	import type { ImageResult } from '$routes/map/utils/image';

	import type { GeoDataEntry, AnyRasterEntry, AnyVectorEntry } from '$routes/map/data/types';

	import { getLayerImage } from '$routes/map/utils/image';

	interface Props {
		layerEntry: GeoDataEntry;
	}
	let { layerEntry }: Props = $props();

	let isImageError = $state<boolean>(false);

	// 画像読み込み完了後のクリーンアップ
	const handleImageLoad = (_imageResult: ImageResult) => {
		if (_imageResult.cleanup) {
			_imageResult.cleanup();
		}
	};

	const promise = (() => {
		try {
			return getLayerImage(layerEntry);
		} catch (error) {
			isImageError = true;
			console.error('Error generating icon image:', error);
			return Promise.resolve(undefined);
		}
	})();
</script>

{#if !isImageError}
	{#await promise then imageResult}
		{#if imageResult}
			<img
				transition:fade
				class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
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
			{:else if layerEntry.format.geometryType === 'Label'}
				<Icon icon="mynaui:label-solid" class="pointer-events-none" width={30} />
			{/if}
		{/if}
	{/await}
{/if}

<style>
</style>
