<script lang="ts">
	import { fade, fly, slide } from 'svelte/transition';

	import DemStyleModePulldownBoxImage from './DemStyleModePulldownBoxImage.svelte';

	import type { DemStyleMode, RasterDemEntry, RasterDemStyle } from '$routes/map/data/types/raster';
	import { getLayerImage, type ImageResult } from '$routes/map/utils/image';

	interface Props {
		isMode: DemStyleMode;
		layerEntry: RasterDemEntry;
	}
	let { isMode = $bindable(), layerEntry }: Props = $props();
	interface DemStyleModeOptions {
		key: DemStyleMode;
		name: string;
	}
	// 1. 基本的な全モードの定義
	const allDemStyleModes: DemStyleModeOptions[] = [
		{ key: 'relief', name: '段彩図' },
		{ key: 'slope', name: '傾斜量' },
		{ key: 'aspect', name: '傾斜方位' }
		// { key: 'default', name: 'なし' }
		// { key: 'curvature', name: '曲率' },
		// { key: 'shadow', name: '陰影' },
	];

	// 2. uniformsDataに基づいてフィルタリング
	let availableDemStyleModes = $derived.by(() =>
		allDemStyleModes.filter((mode) => {
			const uniformsData = layerEntry?.style?.visualization?.uniformsData;

			if (!uniformsData) return false;

			// 各モードがuniforms Dataに定義されているかチェック
			switch (mode.key) {
				case 'relief':
					return uniformsData.relief !== undefined;
				case 'slope':
					return uniformsData.slope !== undefined;
				case 'aspect':
					return uniformsData.aspect !== undefined;
				// case 'curvature':
				//     return uniformsData.curvature !== undefined;
				// case 'shadow':
				//     return uniformsData.shadow !== undefined;
				// case 'default':
				//     return true; // defaultは常に利用可能
				default:
					return false;
			}
		})
	);

	let showPullDown = $state<boolean>(false);

	let containerRef = $state<HTMLElement>();

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showPullDown && containerRef && !containerRef.contains(event.target as Node)) {
				showPullDown = false;
			}
		};

		if (showPullDown) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	let promise = $state<Promise<ImageResult | undefined>>();
	let isImageError = $state<boolean>(false);

	$effect(() => {
		try {
			promise = getLayerImage(layerEntry);
		} catch (error) {
			isImageError = true;
			console.error('Error generating icon image:', error);
			promise = Promise.resolve(undefined);
		}
	});
</script>

<h2 class="text-base">描画モード</h2>
<div class="relative py-2" bind:this={containerRef}>
	<button
		onclick={() => (showPullDown = !showPullDown)}
		class="c-select flex h-28 w-full justify-between"
	>
		<div class="flex items-center gap-2">
			<span>{availableDemStyleModes.find((mode) => mode.key === isMode)?.name}</span>
		</div>
		{#await promise then imageResult}
			{#if imageResult}
				<img
					src={imageResult.url}
					alt={availableDemStyleModes.find((mode) => mode.key === isMode)?.name}
					class="c-no-drag-icon aspect-square h-24 rounded bg-black object-cover"
				/>
			{/if}
		{:catch}
			<div>画像の取得に失敗</div>
		{/await}
	</button>

	{#if showPullDown}
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub absolute top-[130px] left-0 z-10 grid w-full grid-cols-3 gap-1 overflow-hidden rounded-lg shadow-md"
		>
			{#each availableDemStyleModes as { key, name } (key)}
				<DemStyleModePulldownBoxImage
					bind:isMode
					mode={key}
					{name}
					bind:showPullDown
					{layerEntry}
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
</style>
