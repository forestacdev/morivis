<script lang="ts">
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { getLayerType } from '$routes/map/utils/entries';
	import { getLayerImage, type ImageResult } from '$routes/map/utils/image';
	import { getBaseMapImageUrl } from '$routes/map/utils/image/vector';
	import { activeLayerIdsStore } from '$routes/stores/layers';

	interface Props {
		dataEntry: GeoDataEntry;
	}

	let { dataEntry }: Props = $props();

	let isHover = $state(false);
	// Blob URLとクリーンアップ関数を管理するための状態

	let isImageError = $state<boolean>(false);

	let layertype = $derived.by(() => {
		return getLayerType(dataEntry);
	});

	// 画像読み込み完了後のクリーンアップ
	const handleImageLoad = (_imageResult: ImageResult) => {
		if (_imageResult.cleanup) {
			_imageResult.cleanup();
		}
	};

	let isAdded = $derived.by(() => {
		return $activeLayerIdsStore.includes(dataEntry.id);
	});

	let promise = $state<Promise<ImageResult | undefined>>();

	$effect(() => {
		try {
			promise = getLayerImage(dataEntry);
		} catch (error) {
			isImageError = true;
			console.error('Error generating icon image:', error);
			promise = Promise.resolve(undefined);
		}
	});
</script>

{#await promise then imageResult}
	{#if imageResult}
		{#if dataEntry.metaData.xyzImageTile && !isImageError && dataEntry.type === 'vector'}
			<!-- 背景地図画像 -->
			<img
				src={getBaseMapImageUrl(dataEntry.metaData.xyzImageTile)}
				class="c-basemap-img absolute h-full w-full object-cover transition-transform duration-150 {dataEntry
					.format.geometryType === 'Point'
					? 'scale-200'
					: ''}"
				alt="背景地図画像"
				loading="lazy"
				onerror={() => {
					console.error('Image loading failed: BaseMap Image');
					isImageError = true;
				}}
			/>
		{/if}
		<img
			src={imageResult.url}
			class="c-no-drag-icon absolute h-full w-full object-cover transition-transform duration-150 {dataEntry.type ===
				'vector' && dataEntry.format.geometryType === 'Point'
				? 'scale-200'
				: ''}"
			alt={dataEntry.metaData.name}
			onload={() => handleImageLoad(imageResult)}
			loading="lazy"
			onerror={() => {
				console.error('Image loading failed:', dataEntry.metaData.name);
				isImageError = true;
			}}
		/>
	{/if}
{:catch}
	<div class="text-accent">データが取得できませんでした</div>
{/await}

<style>
</style>
