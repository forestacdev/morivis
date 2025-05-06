<script lang="ts">
	import turfBbox from '@turf/bbox';
	import turfBboxPlygon from '@turf/bbox-polygon';
	import { Map } from 'maplibre-gl';
	import type { StyleSpecification } from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	// formatDescription.ts

	import { MAP_FONT_DATA_PATH, MAP_POSITION } from '$routes/constants';
	import { getLocationBbox } from '$routes/data/locationBbox';
	import type { GeoDataEntry } from '$routes/data/types';
	import { GeojsonCache } from '$routes/utils/geojson';
	import { getGeojson, getFgbToGeojson } from '$routes/utils/geojson';

	interface Props {
		showDataEntry: GeoDataEntry | null;
	}

	let { showDataEntry = $bindable() }: Props = $props();

	let mapContainer = $state<HTMLElement | null>(null);

	const createMapStyle = async (
		_showDataEntry: GeoDataEntry
	): Promise<{
		style: StyleSpecification;
		bbox: [number, number, number, number];
	}> => {
		let bbox: [number, number, number, number] | null = null;
		if (_showDataEntry.metaData.bounds) {
			bbox = _showDataEntry.metaData.bounds;
		} else if (_showDataEntry.format.type === 'fgb' || _showDataEntry.format.type === 'geojson') {
			try {
				let geojson;
				if (GeojsonCache.has(_showDataEntry.id)) {
					geojson = GeojsonCache.get(_showDataEntry.id);
				} else if (_showDataEntry.format.type === 'fgb') {
					geojson = await getFgbToGeojson(_showDataEntry.format.url);
					GeojsonCache.set(_showDataEntry.id, geojson);
				} else {
					geojson = await getGeojson(_showDataEntry.format.url);
					GeojsonCache.set(_showDataEntry.id, geojson);
				}

				if (!geojson) {
					throw new Error('GeoJSON not found in cache');
				}
				bbox = turfBbox(geojson) as [number, number, number, number];
			} catch (error) {
				console.error(error);
			}
		} else if (_showDataEntry.metaData.location) {
			bbox = getLocationBbox(_showDataEntry.metaData.location);
		} else {
			console.warn('データ範囲を取得できません', _showDataEntry.id);
		}

		if (!bbox) {
			throw new Error('Bounding box not found');
		}

		const polygon = turfBboxPlygon(bbox);

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
				bbox: {
					type: 'geojson',
					data: polygon
				}
			},

			layers: [
				{
					id: 'mierune_mono_layer',
					source: 'mierune_mono',
					type: 'raster'
				},
				{
					id: 'bbox_layer',
					source: 'bbox',
					type: 'fill',
					paint: {
						'fill-color': '#007508',
						'fill-opacity': 0.5
					}
				},
				{
					id: 'bbox_outline_layer',
					source: 'bbox',
					type: 'line',
					paint: {
						'line-color': '#FFFFFF',
						'line-width': 2
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
					map = new Map({
						container: mapContainer as HTMLElement, // 地図を表示する要素
						style: data.style, // スタイル設定
						bounds: getLocationBbox('全国') as [number, number, number, number], // 初期表示範囲
						pitch: 0,
						bearing: 0
					});

					map.fitBounds(data.bbox, {
						bearing: map.getBearing(),
						padding: 10,
						duration: 1000
					});

					map.on('load', () => {
						if (!map) return;
						map.fitBounds(data.bbox, {
							bearing: map.getBearing(),
							padding: 50,
							duration: 0
						});
					});
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

<div class="aspect-video w-full rounded-lg" bind:this={mapContainer}></div>

<style>
</style>
