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
	import type { McaRegionPosition } from '$routes/map/utils/formats/mca/types';
	import {
		createMcaUploadGrid,
		toggleMcaUploadRegion
	} from '$routes/map/utils/formats/mca/upload-grid';
	import { Map as PreviewMap } from '$routes/map/utils/maplibre';

	interface Props {
		files: File[];
		center?: McaRegionPosition;
		excludedFiles?: File[];
		disabled?: boolean;
	}
	let {
		files,
		center = $bindable(),
		excludedFiles = $bindable([]),
		disabled = false
	}: Props = $props();
	let container: HTMLDivElement;
	let map = $state.raw<PreviewMap>();
	let protocol = $state('');
	let mapError = $state('');
	let hovered = $state('');
	const cache = new Map<File, Blob>();
	const errors = new SvelteMap<File, string>();
	const grid = $derived(createMcaUploadGrid(files, center));
	const anchor = $derived(grid.center);
	const regions = $derived(indexPreviewRegions(files, anchor));

	onMount(() => {
		let preview: PreviewMap;
		try {
			preview = new PreviewMap({
				container,
				style: { version: 8, sources: {}, layers: [] },
				minZoom: MCA_PREVIEW_ZOOM - 4,
				maxZoom: MCA_PREVIEW_ZOOM + 3,
				zoom: MCA_PREVIEW_ZOOM - 1,
				renderWorldCopies: false,
				attributionControl: false,
				dragRotate: false,
				pitchWithRotate: false,
				maxPitch: 0,
				canvasContextAttributes: { antialias: false }
			});
		} catch {
			mapError = '地図を表示できません。下の一覧から区画を選択できます。';
			return;
		}
		preview.touchZoomRotate.disableRotation();
		preview.keyboard.disableRotation();
		preview.doubleClickZoom.disable();
		const regionAt = ({ lng, lat }: { lng: number; lat: number }) =>
			previewRegion(lng, lat, anchor);
		preview.on('mousemove', ({ lngLat }) => {
			const region = regionAt(lngLat);
			const tile = previewTile(region, anchor);
			hovered = regions.get(`${tile.x}/${tile.y}`)?.files[0]?.name ?? '';
			preview.getCanvas().style.cursor = hovered && !disabled ? 'pointer' : '';
		});
		preview.on('mouseout', () => {
			hovered = '';
		});
		preview.on('click', ({ lngLat }) => {
			const region = regionAt(lngLat);
			const { x, y } = previewTile(region, anchor);
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
		if (map && protocol) map.setStyle(previewMapStyle(protocol, regions, anchor, excludedFiles));
	});
	$effect(() => {
		if (!map) return;
		const cells = center ? [center] : grid.cells.filter((cell) => cell.loaded);
		const tiles = (cells.length ? cells : [anchor]).map((region) => previewTile(region, anchor));
		const west = Math.min(...tiles.map((tile) => tile.x));
		const north = Math.min(...tiles.map((tile) => tile.y));
		const east = Math.max(...tiles.map((tile) => tile.x)) + 1;
		const south = Math.max(...tiles.map((tile) => tile.y)) + 1;
		map.fitBounds([previewLngLat(west, south), previewLngLat(east, north)], {
			padding: 16,
			maxZoom: MCA_PREVIEW_ZOOM - 1,
			duration: 0
		});
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
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h3 class="font-bold">リージョン配置図</h3>
		<p class="text-xs">{hovered || 'クリックで選択・解除'}</p>
	</div>
	<div class="relative">
		<div bind:this={container} class="h-72 w-full overflow-hidden rounded bg-gray-800"></div>
		{#if map}
			<div class="absolute top-2 right-2 flex flex-col gap-px">
				<button
					type="button"
					class="c-btn-sub h-8 w-8"
					aria-label="拡大"
					onclick={() => map?.zoomIn()}>＋</button
				>
				<button
					type="button"
					class="c-btn-sub h-8 w-8"
					aria-label="縮小"
					onclick={() => map?.zoomOut()}>−</button
				>
			</div>
		{/if}
	</div>
	{#if mapError}<p role="status">{mapError}</p>{/if}
	{#each errors as [file, error] (file)}
		<p class="text-xs" role="status">{file.name} の画像なし — {error}</p>
	{/each}
	<div class="flex flex-wrap items-center justify-between gap-2 text-xs">
		<p><span class="text-cyan-300">青枠：読み込み対象</span>・黄点：ワールド原点</p>
		<div class="flex gap-2">
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
</section>
