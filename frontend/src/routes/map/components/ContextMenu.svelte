<script lang="ts">
	import { fade, slide } from 'svelte/transition';

	import type { ContextMenuState } from '../types/ui';

	import { lonLatToAddress } from '$routes/map/api/address';
	import { getGSIGeology } from '$routes/map/api/gbank';
	import { getGoogleMapLink, getGoogleStreetViewLink } from '$routes/map/api/google';
	import { gsiGetElevation } from '$routes/map/api/gsi';
	import { getOsmLink } from '$routes/map/api/osm';
	import { showConfirmDialog } from '$routes/stores/confirmation';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
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

	interface ContextData {
		elevation: number | null;
		address: string | null;
	}

	const fetchContextData = async (lng: number, lat: number): Promise<ContextData> => {
		const minDelay = new Promise((resolve) => setTimeout(resolve, 300));

		const fetchData = async (): Promise<ContextData> => {
			const [elev, addr] = await Promise.allSettled([
				gsiGetElevation(lng, lat),
				lonLatToAddress(lng, lat)
			]);

			return {
				elevation: elev.status === 'fulfilled' ? elev.value : null,
				address: addr.status === 'fulfilled' ? addr.value : null
			};
		};

		const [result] = await Promise.all([fetchData(), minDelay]);
		return result;
	};

	let contextDataPromise = $derived.by(() => {
		if (contextMenuState && contextMenuState.show) {
			return fetchContextData(contextMenuState.lngLat.lng, contextMenuState.lngLat.lat);
		}
		return null;
	});
</script>

{#if contextMenuState && contextMenuState.show}
	{#if contextDataPromise}
		{#await contextDataPromise}
			<!-- ローディング中 -->
			<div
				transition:fade={{ duration: 150 }}
				class="bg-main absolute z-50 flex items-center gap-2 overflow-hidden rounded-lg p-3 text-base shadow-md"
				style="top: {contextMenuState.y + 10}px;left: {contextMenuState.x + 10}px;"
			>
				<div
					class="border-t-accent h-5 w-5 animate-spin rounded-full border-2 border-gray-300"
				></div>
				<span class="text-sm text-gray-400">読み込み中...</span>
			</div>
		{:then data}
			<div
				transition:slide={{ duration: 250 }}
				bind:this={containerRef}
				class="bg-main absolute z-50 flex flex-col overflow-hidden rounded-lg text-base shadow-md"
				style="top: {contextMenuState.y + 10}px;left: {contextMenuState.x + 10}px;"
			>
				<button
					onclick={() => {
						navigator.clipboard.writeText(
							`${contextMenuState.lngLat.lat.toFixed(6)}, ${contextMenuState.lngLat.lng.toFixed(6)}`
						);
						showNotification('クリップボードに座標をコピーしました', 'info');
					}}
					class="hover:bg-accent w-full cursor-pointer p-2 text-left transition-colors duration-100"
				>
					{contextMenuState.lngLat.lat.toFixed(6)},{' '}{contextMenuState.lngLat.lng.toFixed(6)}
				</button>

				{#if data.address}
					<button
						onclick={() => {
							navigator.clipboard.writeText(data.address ?? '');
							showNotification('クリップボードに住所をコピーしました', 'info');
						}}
						class="hover:bg-accent cursor-pointer p-2 text-left transition-colors duration-100"
					>
						{data.address}
					</button>
				{/if}

				{#if data.elevation !== null}
					<button
						onclick={() => {
							navigator.clipboard.writeText(`${data.elevation} m`);
							showNotification('クリップボードに標高をコピーしました', 'info');
						}}
						class="hover:bg-accent cursor-pointer p-2 text-left transition-colors duration-100"
					>
						標高: {data.elevation} m
					</button>
				{/if}

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
		{/await}
	{/if}
{/if}
