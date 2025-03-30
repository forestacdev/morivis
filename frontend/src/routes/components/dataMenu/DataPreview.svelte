<script lang="ts">
	import Icon from '@iconify/svelte';
	import turfBbox from '@turf/bbox';
	import { Map, ScaleControl, AttributionControl } from 'maplibre-gl';
	import type { StyleSpecification } from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import { MAP_POSITION } from '$routes/constants';
	import { IMAGE_TILE_XYZ } from '$routes/constants';
	import { geoDataEntry } from '$routes/data';
	import { getLocationBbox } from '$routes/data/locationBbox';
	import { propData } from '$routes/data/propData';
	import type { GeoDataEntry } from '$routes/data/types';
	import { createLayersItems } from '$routes/layers';
	import { createSourcesItems } from '$routes/sources';
	import { addedLayerIds, showDataMenu } from '$routes/store';
	import { GeojsonCache } from '$routes/utils/geojson';
	import { getImagePmtiles } from '$routes/utils/raster';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();
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

	let map: Map | null = null;

	onMount(() => {
		$effect(() => {
			if (showDataEntry) {
				(async () => {
					map = new Map({
						container: mapContainer as HTMLElement, // 地図を表示する要素
						style: await createMapStyle([showDataEntry]), // スタイル設定
						...MAP_POSITION // 地図の初期位置
					});

					const iconWorker = new Worker(new URL('../../utils/icon/worker.ts', import.meta.url), {
						type: 'module'
					});

					// メッセージハンドラーを一度だけ定義
					iconWorker.onmessage = async (e) => {
						const { imageBitmap, id } = e.data;

						if (map && !map.hasImage(id)) {
							map.addImage(id, imageBitmap);
						}
					};

					// エラーハンドリングを追加
					iconWorker.onerror = (error) => {
						console.error('Worker error:', error);
					};

					// 処理中の画像IDを追跡
					const processingImages = new Set();

					map.on('styleimagemissing', async (e) => {
						if (!map) return;
						const id = e.id;

						// すでに処理中または追加済みの画像はスキップ
						if (processingImages.has(id) || map.hasImage(id)) return;

						try {
							processingImages.add(id);
							const imageUrl = propData[id].image;
							if (!imageUrl) return;

							iconWorker.postMessage({ id, url: imageUrl });
						} catch (error) {
							console.error(`Error processing image for id ${id}:`, error);
							processingImages.delete(id);
						}
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

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
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

	const handleKeydown = (e) => {
		if (e.key === 'Escape') {
			showDataEntry = null;
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- <div
	transition:fly={{ duration: 200, y: 100, opacity: 0 }}
	class="bg-main absolute flex h-full w-full"
>
	<div class="bg-main flex flex-col p-2">ここに説明書く</div>
	<div class="absolute h-full w-full" bind:this={mapContainer}>
		<div
			class="pointer-events-none absolute bottom-0 z-10 flex w-full items-center justify-center gap-4 p-4"
		>
			<button class="c-btn-confirm pointer-events-auto" onclick={addData}>地図に追加 </button>
			<button class="c-btn-cancel pointer-events-auto" onclick={() => (showDataEntry = null)}
				>キャンセル
			</button>
		</div>
	</div>
</div> -->
<div class="absolute flex h-full w-full bg-red-400">sss</div>

<style>
</style>
