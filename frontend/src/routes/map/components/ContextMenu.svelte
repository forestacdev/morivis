<script lang="ts">
	import { fade } from 'svelte/transition';

	import type { ContextMenuState } from '../types/ui';

	import { getGoogleMapLink, getGoogleStreetViewLink } from '$routes/map/api/google';
	import { gsiGetElevation } from '$routes/map/api/gsi';
	import { getOsmLink } from '$routes/map/api/osm';
	import { showConfirmDialog } from '$routes/stores/confirmation';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';

	let { contextMenuState = $bindable() }: { contextMenuState: ContextMenuState | null } = $props();

	let containerRef = $state<HTMLElement>();
	let elevation = $state<number | null | 'error'>(null);

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

	$effect(() => {
		if (contextMenuState && contextMenuState.show) {
			new Promise<number>(async (resolve, reject) => {
				try {
					const elev = await gsiGetElevation(
						contextMenuState.lngLat.lng,
						contextMenuState.lngLat.lat
					);
					resolve(elev);
				} catch (error) {
					reject(error);
				}
			})
				.then((elev) => {
					elevation = elev;
				})
				.catch((error) => {
					elevation = 'error';
				});
		} else {
			elevation = null;
		}
	});
</script>

{#if contextMenuState && contextMenuState.show}
	<div
		transition:fade={{ duration: 150 }}
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

		<button
			onclick={() => {
				navigator.clipboard.writeText(
					`${elevation !== null && elevation !== 'error' ? elevation : 'N/A'} m`
				);
				showNotification('クリップボードに標高をコピーしました', 'info');
			}}
			disabled={elevation === null || elevation === 'error'}
			class="hover:bg-accent cursor-pointer p-2 transition-colors duration-100"
		>
			{#if elevation === null}
				読み込み中...
			{:else if elevation !== null && elevation !== 'error'}
				標高: {elevation} m
			{:else}
				標高情報の取得に失敗しました
			{/if}
		</button>
		<a
			class="hover:bg-accent cursor-pointer p-2 transition-colors duration-100"
			href={getGoogleMapLink(contextMenuState.lngLat.lat, contextMenuState.lngLat.lng)}
			target="_blank"
			rel="noopener noreferrer"
		>
			Google Mapsで開く
		</a>
		<!-- <a
			class="hover:bg-accent cursor-pointer p-2 transition-colors duration-100"
			href={getGoogleStreetViewLink(contextMenuState.lngLat.lat, contextMenuState.lngLat.lng)}
			target="_blank"
			rel="noopener noreferrer"
		>
			Google Street Viewで開く
		</a> -->
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
