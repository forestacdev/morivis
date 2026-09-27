<script lang="ts">
	import { fade } from 'svelte/transition';

	import IcBaselineModeStandbyIcon from '$lib/components/svgs/icons/ic/BaselineModeStandbyIcon.svelte';
	import IcBaselinePentagonIcon from '$lib/components/svgs/icons/ic/BaselinePentagonIcon.svelte';
	import IcBaselinePolymerIcon from '$lib/components/svgs/icons/ic/BaselinePolymerIcon.svelte';
	import MdiCubeOutlineIcon from '$lib/components/svgs/icons/mdi/CubeOutlineIcon.svelte';
	import MdiRasterIcon from '$lib/components/svgs/icons/mdi/RasterIcon.svelte';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { ImageResult } from '$routes/map/utils/image';
	import { getLayerImage } from '$routes/map/utils/image';
	import { getBaseMapImageUrl } from '$routes/map/utils/image/vector';

	interface Props {
		layerEntry: MorivisLayerEntry;
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
		<!-- {#if layerEntry.metaData.xyzImageTile && layerEntry.type === 'vector'}
			<img
				transition:fade
				class="c-basemap-img pointer-events-none absolute block h-full w-full object-cover {rounded
					? 'rounded-full'
					: ''}"
				alt="背景地図画像"
				src={getBaseMapImageUrl(layerEntry.metaData.xyzImageTile)}
			/>
		{/if} -->
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
			<MdiRasterIcon class="pointer-events-none" width={30} />
		{:else if layerEntry.type === 'vector'}
			{#if layerEntry.format.geometryType === 'Point'}
				<IcBaselineModeStandbyIcon class="pointer-events-none" width={30} />
			{:else if layerEntry.format.geometryType === 'LineString'}
				<IcBaselinePolymerIcon class="pointer-events-none" width={30} />
			{:else if layerEntry.format.geometryType === 'Polygon'}
				<IcBaselinePentagonIcon class="pointer-events-none" width={30} />
			{/if}
		{:else if layerEntry.type === 'model'}
			<MdiCubeOutlineIcon class="pointer-events-none" width={30} />
		{/if}
	{/await}
{/if}

<style>
</style>
