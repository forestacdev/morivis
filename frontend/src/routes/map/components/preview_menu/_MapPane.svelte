<script lang="ts">
	import turfBboxPlygon from '@turf/bbox-polygon';
	import { Map } from 'maplibre-gl';
	import type { StyleSpecification } from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	import { MAP_FONT_DATA_PATH } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { isBBoxInside } from '$routes/map/utils/map';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();

	let mapContainer = $state<HTMLElement | null>(null);
	let hasBbox = $state<boolean>(true);

	const createMapStyle = async (
		_showDataEntry: GeoDataEntry
	): Promise<{
		style: StyleSpecification;
		bbox: [number, number, number, number] | null;
	}> => {
		let bbox: [number, number, number, number] | null = null;
		if (_showDataEntry.metaData.bounds) {
			bbox = _showDataEntry.metaData.bounds;
		} else {
			console.warn('データ範囲を取得できません', _showDataEntry.id);
		}

		const polygon = bbox
			? turfBboxPlygon(bbox)
			: {
					type: 'FeatureCollection',
					features: []
				};

		const mapStyle = {
			version: 8,
			glyphs: MAP_FONT_DATA_PATH, // TODO; フォントの検討
			sources: {
				earthhillshade: {
					type: 'raster',
					tiles: ['https://cyberjapandata.gsi.go.jp/xyz/earthhillshade/{z}/{x}/{y}.png'],
					tileSize: 256,
					minzoom: 0,
					maxzoom: 18,
					attribution: '地理院タイル'
				},
				hillshademap: {
					type: 'raster',
					tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
					tileSize: 256,
					minzoom: 2,
					maxzoom: 16,
					attribution: '地理院タイル'
				},
				bbox: {
					type: 'geojson',
					data: polygon
				}
			},

			layers: [
				{
					id: 'background_layer',
					type: 'background',
					paint: {
						'background-color': '#FFFFEE'
					}
				},
				{
					id: 'earthhillshade_layer',
					source: 'earthhillshade',
					type: 'raster',
					maxzoom: 8,
					paint: {
						'raster-opacity': 1.0
					}
				},
				{
					id: 'hillshademap_layer',
					source: 'hillshademap',
					type: 'raster',
					minzoom: 2,
					maxzoom: 24,
					paint: {
						'raster-opacity': 1.0
					}
				},
				{
					id: 'bbox_layer',
					source: 'bbox',
					type: 'fill',
					paint: {
						'fill-color': '#529F81',
						'fill-opacity': 0.5
					}
				},
				{
					id: 'bbox_outline_layer',
					source: 'bbox',
					type: 'line',
					paint: {
						'line-color': '#FFFFFF',
						'line-width': 1
					}
				}
				// {
				// 	id: '@overlay_layer',
				// 	type: 'background',
				// 	paint: {
				// 		'background-color': '#000000',
				// 		'background-opacity': 0.8
				// 	}
				// }
			]
		};

		return {
			style: mapStyle as StyleSpecification,
			bbox: bbox
		};
	};

	let map: Map | null = null;

	onMount(() => {
		$effect(() => {
			if (showDataEntry) {
				(async () => {
					const data = await createMapStyle(showDataEntry);
					if (data.bbox) {
						map = new Map({
							container: mapContainer as HTMLElement, // 地図を表示する要素
							style: data.style, // スタイル設定
							pitch: 0,
							bearing: 0,
							// interactive: false,
							attributionControl: false,
							renderWorldCopies: false
						});

						map.fitBounds(data.bbox, {
							bearing: 0,
							padding: 40,
							duration: 0
						});

						const mapBbox = mapStore.getMapBounds();
						if (!isBBoxInside(mapBbox, data.bbox)) {
							// mapStore.focusLayer(showDataEntry);
							// return;
						}

						//TODO: 自動ズーム
						// let z = mapStore.getZoom();
						// let isZoomOffset = false;

						// if (!z) return;

						// if ('tileSize' in showDataEntry.metaData && showDataEntry.metaData.tileSize === 256) {
						// 	isZoomOffset = true;
						// 	z = z + 1.5; // タイルサイズが256の場合、ズームレベルを調整
						// }

						// console.log(showDataEntry.metaData.minZoom);
						// console.log(z);

						// // ズームレベル範囲内かのチェック
						// if (showDataEntry.metaData.minZoom && z > showDataEntry.metaData.minZoom) {
						// 	mapStore.setZoom(showDataEntry.metaData.minZoom - (isZoomOffset ? 1.5 : 0));
						// 	return;
						// }
					} else {
						hasBbox = false;
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
</script>

{#if hasBbox}
	<div class="aspect-video w-full rounded-lg bg-black" bind:this={mapContainer}>
		{#if import.meta.env.DEV}
			<div class="absolute right-0 bottom-0 z-10 p-1">
				{showDataEntry?.metaData.bounds}
			</div>
		{/if}
	</div>
{/if}

<style>
</style>
