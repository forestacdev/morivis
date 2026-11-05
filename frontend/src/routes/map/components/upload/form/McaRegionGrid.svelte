<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	import {
		indexPreviewRegions,
		MCA_PREVIEW_ZOOM,
		previewLngLat,
		previewMapStyle,
		previewRegion,
		previewTile
	} from '$routes/map/utils/formats/mca/preview-map';
	import { registerPreviewTiles } from '$routes/map/utils/formats/mca/preview-tiles';
	import { toggleMcaUploadRegion } from '$routes/map/utils/formats/mca/upload-grid';
	import { Map as PreviewMap } from '$routes/map/utils/maplibre';

	interface Props {
		files: File[];
		excludedFiles?: File[];
		disabled?: boolean;
	}
	let { files, excludedFiles = $bindable([]), disabled = false }: Props = $props();
	let container: HTMLDivElement;
	let map = $state.raw<PreviewMap>();
	let protocol = $state('');
	let mapError = $state('');
	const cache = new Map<File, Blob>();
	const errors = new SvelteMap<File, string>();
	const worldOrigin = { x: 0, z: 0 };
	const regions = $derived(indexPreviewRegions(files, worldOrigin));

	onMount(() => {
		const { x, y } = previewTile(worldOrigin, worldOrigin);
		let preview: PreviewMap;
		try {
			preview = new PreviewMap({
				container,
				style: { version: 8, sources: {}, layers: [] },
				minZoom: MCA_PREVIEW_ZOOM - 4,
				maxZoom: MCA_PREVIEW_ZOOM + 3,
				// 原点を中央に、横幅に4区画分が収まる縮尺で開く。
				bounds: [previewLngLat(x - 2, y), previewLngLat(x + 2, y)],
				renderWorldCopies: false,
				attributionControl: false,
				dragRotate: false,
				pitchWithRotate: false,
				maxPitch: 0,
				canvasContextAttributes: { antialias: false }
			});
		} catch {
			mapError = 'プレビュー地図を表示できませんでした。';
			return;
		}
		preview.touchZoomRotate.disableRotation();
		preview.keyboard.disableRotation();
		preview.doubleClickZoom.disable();
		preview.on('click', ({ lngLat }) => {
			const region = previewRegion(lngLat.lng, lngLat.lat, worldOrigin);
			const { x, y } = previewTile(region, worldOrigin);
			if (!disabled && regions.has(`${x}/${y}`))
				excludedFiles = toggleMcaUploadRegion(files, excludedFiles, region);
		});
		const observer = new ResizeObserver(() => preview.resize());
		observer.observe(container);
		map = preview;
		return () => {
			observer.disconnect();
			preview.remove();
			cache.clear();
		};
	});

	$effect(() => {
		if (!map || disabled) return;
		const session = registerPreviewTiles(regions, cache, (file, error) => errors.set(file, error));
		protocol = session.protocol;
		return () => {
			session.dispose();
			protocol = '';
		};
	});
	$effect(() => {
		if (map && protocol)
			map.setStyle(previewMapStyle(protocol, regions, worldOrigin, excludedFiles));
	});
	$effect(() => {
		const current = new Set(files);
		untrack(() => {
			for (const file of errors.keys()) if (!current.has(file)) errors.delete(file);
			for (const file of cache.keys()) if (!current.has(file)) cache.delete(file);
		});
	});
</script>

<section class="flex flex-col gap-2" aria-label="リージョン配置図">
	<div class="flex items-center justify-between gap-2 text-xs">
		<p>クリックで選択・解除</p>
		<div class="flex shrink-0 gap-2">
			<button
				type="button"
				class="c-btn-sub px-3 py-2"
				disabled={disabled || !files.length}
				onclick={() => (excludedFiles = [])}>全選択</button
			>
			<button
				type="button"
				class="c-btn-sub px-3 py-2"
				disabled={disabled || !files.length}
				onclick={() => (excludedFiles = [...files])}>全選択解除</button
			>
		</div>
	</div>
	<div class="relative">
		<div bind:this={container} class="h-72 w-full overflow-hidden rounded bg-gray-800"></div>
		{#if map}
			<div class="absolute top-2 right-2 flex flex-col gap-px">
				<button
					type="button"
					class="c-btn-sub grid size-8 place-items-center p-0"
					aria-label="拡大"
					onclick={() => map?.zoomIn()}
				>
					<svg aria-hidden="true" class="size-4" viewBox="0 0 16 16">
						<path d="M2 8h12M8 2v12" stroke="currentColor" stroke-width="2" />
					</svg>
				</button>
				<button
					type="button"
					class="c-btn-sub grid size-8 place-items-center p-0"
					aria-label="縮小"
					onclick={() => map?.zoomOut()}
				>
					<svg aria-hidden="true" class="size-4" viewBox="0 0 16 16">
						<path d="M2 8h12" stroke="currentColor" stroke-width="2" />
					</svg>
				</button>
			</div>
		{/if}
	</div>
	{#if mapError}<p role="status">{mapError}</p>{/if}
	{#each errors as [file, error] (file)}
		<p class="text-xs" role="status">{file.name} のプレビューを生成できませんでした。{error}</p>
	{/each}
</section>
