<script lang="ts">
	import type { ContextMenuState } from '../types/ui';
	import { getGoogleMapLink, getGoogleStreetViewLink } from '$routes/map/api/google';
	import { getOsmLink } from '$routes/map/api/osm';
	import { mapStore } from '$routes/stores/map';
	import { fade } from 'svelte/transition';
	import { gsiGetElevation } from '$routes/map/api/gsi';

	let { contextMenuState = $bindable() }: { contextMenuState: ContextMenuState | null } = $props();

	let containerRef = $state<HTMLElement>();

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				contextMenuState &&
				contextMenuState.show &&
				containerRef &&
				!containerRef.contains(event.target as Node)
			) {
				contextMenuState.show = false;
			}
		};

		if (contextMenuState && contextMenuState.show) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});
</script>

{#if contextMenuState && contextMenuState.show}
	<div
		transition:fade={{ duration: 150 }}
		bind:this={containerRef}
		class="bg-base absolute z-50 flex flex-col overflow-hidden rounded-lg shadow-md"
		style="top: {contextMenuState.y + 10}px;left: {contextMenuState.x + 10}px;"
	>
		<button class="hover:bg-accent cursor-pointer p-2 transition-colors duration-100">
			{contextMenuState.lngLat.lat.toFixed(6)},{' '}{contextMenuState.lngLat.lng.toFixed(6)}
		</button>

		<button class="hover:bg-accent cursor-pointer p-2 transition-colors duration-100">
			{#await gsiGetElevation(contextMenuState.lngLat.lng, contextMenuState.lngLat.lat)}
				読み込み中...
			{:then elevation}
				標高: {elevation} m
			{:catch error}
				標高情報の取得に失敗しました
			{/await}
		</button>
		<a
			class="hover:bg-accent cursor-pointer p-2 transition-colors duration-100"
			href={getGoogleMapLink(contextMenuState.lngLat.lat, contextMenuState.lngLat.lng)}
			target="_blank"
			rel="noopener noreferrer"
		>
			Google Mapsで開く
		</a>
		<a
			class="hover:bg-accent cursor-pointer p-2 transition-colors duration-100"
			href={getGoogleStreetViewLink(contextMenuState.lngLat.lat, contextMenuState.lngLat.lng)}
			target="_blank"
			rel="noopener noreferrer"
		>
			Google Street Viewで開く
		</a>
		<a
			class="hover:bg-accent cursor-pointer p-2 transition-colors duration-100"
			href={getOsmLink(
				contextMenuState.lngLat.lat,
				contextMenuState.lngLat.lng,
				mapStore.getZoom()
			)}
			target="_blank"
			rel="noopener noreferrer"
		>
			OpenStreetMapで開く
		</a>
	</div>
{/if}
