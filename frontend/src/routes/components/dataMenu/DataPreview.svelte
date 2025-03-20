<script lang="ts">
	import Icon from '@iconify/svelte';
	import turfBbox from '@turf/bbox';
	import { Map, ScaleControl, AttributionControl } from 'maplibre-gl';
	import type { StyleSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import { MAP_POSITION } from '$routes/constants';
	import { IMAGE_TILE_XYZ } from '$routes/constants';
	import { getLocationBbox } from '$routes/data/locationBbox';
	import { createLayersItems } from '$routes/layers';
	import { createSourcesItems } from '$routes/sources';
	import { GeojsonCache } from '$routes/utils/geojson';
	import { getImagePmtiles } from '$routes/utils/raster';
	import { geoDataEntry } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import { addedLayerIds, showDataMenu } from '$routes/store';

	let { showDataEntry = $bindable() }: { showDataEntry: GeoDataEntry | null } = $props();
	let mapContainer = $state<HTMLElement | null>(null);

	const createMapStyle = async (_dataEntries: GeoDataEntry[]): Promise<StyleSpecification> => {
		// ソースとレイヤーの作成
		const sources = await createSourcesItems(_dataEntries);
		const layers = await createLayersItems(_dataEntries);

		const mapStyle = {
			version: 8,
			glyphs: './font/{fontstack}/{range}.pbf', // TODO; フォントの検討
			sources: {
				mierune_mono: {
					type: 'raster',
					tiles: ['https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png'],
					tileSize: 256,
					minzoom: 0,
					maxzoom: 18,
					attribution:
						'<a href="https://mierune.co.jp">MIERUNE Inc.</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
				},
				...sources
			},

			layers: [
				{
					id: 'mierune_mono_layer',
					source: 'mierune_mono',
					type: 'raster'
				},
				{
					id: '@overlay_layer',
					type: 'background',
					paint: {
						'background-color': '#000000',
						'background-opacity': 0.8
					}
				},
				...layers
			]
		};

		return mapStyle as StyleSpecification;
	};

	onMount(() => {
		$effect(() => {
			if (showDataEntry) {
				(async () => {
					const map = new Map({
						container: mapContainer as HTMLElement, // 地図を表示する要素
						style: await createMapStyle([showDataEntry]), // スタイル設定
						...MAP_POSITION // 地図の初期位置
					});

					if (showDataEntry.format.type === 'fgb') {
						try {
							const geojson = GeojsonCache.get(showDataEntry.id);
							if (!geojson) return;
							const bbox = turfBbox(geojson) as [number, number, number, number];
							map.fitBounds(bbox, {
								bearing: map.getBearing(),
								padding: 100,
								duration: 0
							});
						} catch (error) {
							console.error(error);
						}
					} else if (showDataEntry.metaData.bounds) {
						map.fitBounds(showDataEntry.metaData.bounds, {
							bearing: map.getBearing(),
							padding: 100,
							duration: 0
						});
					} else if (showDataEntry.metaData.location) {
						const bbox = getLocationBbox(showDataEntry.metaData.location);
						if (bbox) {
							map.fitBounds(bbox, {
								bearing: map.getBearing(),
								padding: 100,
								duration: 0
							});
						}
					} else {
						console.warn('フォーカスの処理に対応してません', showDataEntry.id);
					}
				})();
			}
		});
	});

	const addData = () => {
		if (showDataEntry) {
			addedLayerIds.addLayer(showDataEntry.id);
			showDataEntry = null;
		}
	};
	const deleteData = () => {
		if (showDataEntry) {
			addedLayerIds.removeLayer(showDataEntry.id);
			showDataEntry = null;
		}
	};
</script>

{#if showDataEntry}
	<div
		transition:fade={{ duration: 100, delay: 400 }}
		class="relative z-30 h-full w-full flex-grow"
	>
		<div class="absolute h-full w-full flex-grow" bind:this={mapContainer}></div>
		<div
			class="pointer-events-none absolute bottom-0 z-10 flex w-full items-center justify-center gap-4 p-4"
		>
			<button class="c-btn-confirm pointer-events-auto" onclick={addData}>地図に追加 </button>
			<button class="c-btn-delete pointer-events-auto" onclick={deleteData}>地図から削除 </button>
		</div>
	</div>
{/if}

<style>
</style>
