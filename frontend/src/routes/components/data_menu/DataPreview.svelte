<script lang="ts">
	import Icon from '@iconify/svelte';
	import turfBbox from '@turf/bbox';
	import DOMPurify from 'dompurify';
	import { Map } from 'maplibre-gl';
	import type { StyleSpecification } from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';

	// formatDescription.ts

	import { MAP_POSITION, BASE_PATH } from '$routes/constants';
	import { MAP_FONT_DATA_PATH } from '$routes/constants';
	import { getLocationBbox } from '$routes/data/locationBbox';
	import { propData } from '$routes/data/propData';
	import type { GeoDataEntry } from '$routes/data/types';
	import { orderedLayerIds, groupedLayerStore, type LayerType } from '$routes/store/layers';
	import { GeojsonCache } from '$routes/utils/geojson';
	import { createLayersItems } from '$routes/utils/layers';
	import { createSourcesItems } from '$routes/utils/sources';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();
	let mapContainer = $state<HTMLElement | null>(null);
	let iconWorker: Worker;

	let dataType = $derived.by(() => {
		if (showDataEntry) {
			if (showDataEntry.type === 'raster') {
				return 'ラスター';
			} else if (showDataEntry.type === 'vector') {
				return 'ベクター';
			}
		}
	});
	let layerType = $derived.by((): LayerType | unknown => {
		if (showDataEntry) {
			if (showDataEntry.type === 'raster') {
				return 'raster';
			} else if (showDataEntry.type === 'vector') {
				if (showDataEntry.format.geometryType === 'Label') {
					return 'label';
				} else if (showDataEntry.format.geometryType === 'Point') {
					return 'point';
				} else if (showDataEntry.format.geometryType === 'LineString') {
					return 'line';
				} else if (showDataEntry.format.geometryType === 'Polygon') {
					return 'polygon';
				}
			}
		}
	});

	const createMapStyle = async (_dataEntries: GeoDataEntry[]): Promise<StyleSpecification> => {
		// ソースとレイヤーの作成
		const sources = await createSourcesItems(_dataEntries);
		const layers = await createLayersItems(_dataEntries);

		const mapStyle = {
			version: 8,
			glyphs: MAP_FONT_DATA_PATH, // TODO; フォントの検討
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
						...MAP_POSITION, // 地図の初期位置
						pitch: 0,
						bearing: 0
					});

					iconWorker = new Worker(new URL('../../utils/icon/worker.ts', import.meta.url), {
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

		if (iconWorker) {
			iconWorker.terminate();
			iconWorker = undefined;
		}
	});

	const addData = () => {
		if (showDataEntry) {
			groupedLayerStore.add(showDataEntry.id, layerType as LayerType);
			showDataEntry = null;
		}
	};
	const deleteData = () => {
		if (showDataEntry) {
			groupedLayerStore.remove(showDataEntry.id);
			showDataEntry = null;
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			showDataEntry = null;
		}
	};

	const formatDescription = (text: string): string => {
		const urlRegex = /(https?:\/\/[^\s））\]」」＞>、。,]+)/g;
		const linked = text.replace(urlRegex, (url) => {
			return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
		});
		const withBreaks = linked.replace(/\n/g, '<br>');
		return DOMPurify.sanitize(withBreaks, {
			ALLOWED_TAGS: ['a', 'br'],
			ALLOWED_ATTR: ['href', 'target', 'rel']
		});
	};
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	transition:fly={{ duration: 200, y: 100, opacity: 0 }}
	class="bg-main absolute inset-0 flex h-full w-full flex-grow"
>
	<div class="bg-main flex w-[400px] flex-col gap-2 p-2 text-base">
		<div>{showDataEntry?.metaData.name}</div>
		<div>{showDataEntry?.metaData.location}</div>

		{#if showDataEntry}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div>{@html formatDescription(showDataEntry?.metaData.description)}</div>
		{/if}
		<div>{dataType}</div>
		{#if showDataEntry?.metaData.downloadUrl}
			<a
				class="hover:text-accent transition-text flex w-full items-center justify-start gap-2 p-2 duration-150"
				href={showDataEntry?.metaData.downloadUrl}
				target="_blank"
				rel="noopener noreferrer"
				><Icon icon="el:download" class="h-8 w-8" />
				<span>提供元からダウンロード</span></a
			>
		{/if}
	</div>
	<div class="absolute h-full w-full" bind:this={mapContainer}>
		<div
			class="pointer-events-none absolute bottom-0 z-10 flex w-full items-center justify-center gap-4 p-4"
		>
			<button class="c-btn-confirm pointer-events-auto px-6 text-lg" onclick={addData}
				>地図に追加
			</button>
			<button
				class="c-btn-cancel pointer-events-auto px-4 text-lg"
				onclick={() => (showDataEntry = null)}
				>キャンセル
			</button>
		</div>
	</div>
</div>

<style>
</style>
