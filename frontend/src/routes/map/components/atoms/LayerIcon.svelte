<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import type { GeoDataEntry, AnyRasterEntry, AnyVectorEntry } from '$routes/map/data/types';

	import { getLayerImage } from '$routes/map/utils/image';

	interface Props {
		layerEntry: GeoDataEntry;
	}
	let { layerEntry }: Props = $props();

	// メイン処理
	const promise = (() => {
		try {
			return getLayerImage(layerEntry);
		} catch (error) {
			isImageError = true;
			console.error('Error generating icon image:', error);
			return Promise.resolve(undefined);
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
