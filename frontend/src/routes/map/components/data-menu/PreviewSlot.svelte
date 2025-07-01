<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	import 'maplibre-gl/dist/maplibre-gl.css';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import { createLayersItems } from '$routes/utils/layers';
	import { createSourcesItems } from '$routes/utils/sources';

	import { getLocationBbox } from '$routes/map/data/location_bbox';
	import { GeojsonCache } from '$routes/utils/file/geojson';
	import turfBbox from '@turf/bbox';
	import { handleStyleImageMissing } from '$routes/utils/icon';
	import { MAP_FONT_DATA_PATH } from '$routes/constants';

	interface Props {
		dataEntry: GeoDataEntry;
	}

	let { dataEntry }: Props = $props();

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	// コンポーネントがマウントされたときにマップを初期化
	onMount(async () => {
		if (!mapContainer) {
			console.error('Map container is not defined');
			return;
		}

		const sources = await createSourcesItems([dataEntry], 'preview');
		const layers = await createLayersItems([dataEntry], 'preview');

		// const imageData = await loadRasterData(`${ENTRY_TIFF_DATA_PATH}/HYP_50M_SR.tif`);
		// const imageData = await loadRasterData(
		// 	`${ENTRY_TIFF_DATA_PATH}/E000.00-S90.00-E180.00-N90.00-LST.tiff`
		// );
		// const imageData = await loadRasterData('./ensyurin_dem.tiff');

		// TODO: 共通化

		let bbox: [number, number, number, number] | undefined;
		if (dataEntry.metaData.bounds) {
			bbox = dataEntry.metaData.bounds as [number, number, number, number];
		} else if (dataEntry.metaData.location) {
			bbox = getLocationBbox(dataEntry.metaData.location) as [number, number, number, number];
		} else {
			console.warn('フォーカスの処理に対応してません', dataEntry.id);
		}

		// MapLibreマップの初期化
		map = new maplibregl.Map({
			container: mapContainer,
			style: {
				version: 8,
				glyphs: MAP_FONT_DATA_PATH,
				sprite: 'https://gsi-cyberjapan.github.io/optimal_bvmap/sprite/std', // TODO: スプライトの保存
				sources: {
					// pales: {
					// 	type: 'raster',
					// 	tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
					// 	tileSize: 256,
					// 	maxzoom: 18,
					// 	attribution: "<a href='https://www.gsi.go.jp/' target='_blank'>国土地理院</a>"
					// },
					tile_grid: {
						type: 'raster',
						tiles: ['./tile_grid.png'],
						tileSize: 256
					},
					...sources
				},
				layers: [
					// {
					// 	id: 'pales_layer',
					// 	source: 'pales',
					// 	type: 'raster'
					// },
					{
						id: 'tile_grid',
						type: 'raster',
						source: 'tile_grid',
						paint: {
							'raster-opacity': 0.5
						}
					},
					...layers
				]
			},
			center: [139.7454, 35.6586],

			renderWorldCopies: false,

			bounds: bbox
		});

		// TODO: 使用してない
		// map.on('styleimagemissing', (e) => handleStyleImageMissing(e, map));

		// function rotateCamera(timestamp) {
		// 	// clamp the rotation between 0 -360 degrees
		// 	// Divide timestamp by 100 to slow rotation to ~10 degrees / sec
		// 	map.rotateTo((timestamp / 100) % 360, { duration: 0 });
		// 	// Request the next frame of the animation.
		// 	requestAnimationFrame(rotateCamera);
		// }

		map.on('load', () => {
			// Start the animation.
			if (dataEntry.metaData.minZoom && map && map.getZoom() + 1.5 < dataEntry.metaData.minZoom) {
				map.zoomIn(dataEntry.metaData.minZoom + 1.5);
				// map?.setZoom(dataEntry.metaData.minZoom + 1.5);
			}
		});
	});

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null; // マップをnullに設定してガーベジコレクションの対象にする
		}
	});
</script>

<div
	bind:this={mapContainer}
	class="bg-main pointer-events-none absolute z-10 grid h-full w-full place-items-center"
></div>
