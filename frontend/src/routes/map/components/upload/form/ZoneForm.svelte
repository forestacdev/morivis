<script lang="ts">
	import { isBboxValid } from '$routes/map/utils/map';
	import { transformBbox } from '$routes/map/utils/proj';
	import { epsgPrefDict, getEpsgInfoArray, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { mapStore } from '$routes/stores/map';
	import { useEventTrigger } from '$routes/stores/ui';
	import type { Geometry, GeoJsonProperties, Feature, FeatureCollection, Polygon } from 'geojson';
	import { fade, fly, scale } from 'svelte/transition';
	import turfCenter from '@turf/center';
	import ZoneMarker from '$routes/map/components/marker/ZoneMarker.svelte';
	import maplibregl from 'maplibre-gl';
	import { filter } from 'es-toolkit/compat';

	interface Props {
		map: maplibregl.Map; // MapLibre GL JSのマップインスタンス
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null; // フォーカスするバウンディングボックス
	}

	let {
		map,
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();

	const registration = () => {
		showZoneForm = false;
		useEventTrigger.trigger('setZone'); // 座標系を設定したイベントをトリガー

		// 選択されたEPSGコードを使用して何らかの処理を行う
	};
	let originalBbox = $derived.by(() => {
		if (focusBbox) {
			console.log('focusBbox:', focusBbox);
			return focusBbox;
		}
		return null;
	});

	let geojsonData: FeatureCollection<Geometry, GeoJsonProperties> = {
		type: 'FeatureCollection',
		features: []
	};

	interface PoiData {
		coordinates: [number, number];
		properties: {
			name: string;
			code: EpsgCode;
		};
	}

	let poiData = $state<PoiData[]>([]);

	$effect(() => {
		if (originalBbox) {
			geojsonData = {
				type: 'FeatureCollection',
				features: getEpsgInfoArray({
					exclude4326: true
				})
					.flatMap((info) => {
						const code = info.code;

						const prj = info.projContext;
						const transformedBbox = transformBbox(originalBbox, prj);

						if (isBboxValid(transformedBbox)) {
							// ポリゴンフィーチャーを作成
							const polygonFeature: Feature<Polygon, GeoJsonProperties> = {
								type: 'Feature',
								geometry: {
									type: 'Polygon',
									coordinates: [
										[
											[transformedBbox[0], transformedBbox[1]],
											[transformedBbox[2], transformedBbox[1]],
											[transformedBbox[2], transformedBbox[3]],
											[transformedBbox[0], transformedBbox[3]],
											[transformedBbox[0], transformedBbox[1]]
										]
									]
								},
								bbox: transformedBbox,
								properties: {
									...info
								}
							};

							// 中心ポイントを計算
							const centerPoint = turfCenter(polygonFeature);
							centerPoint.properties = {
								...info
							};

							// ポリゴンと中心ポイントの両方を返す
							return [polygonFeature, centerPoint];
						}
					})
					.filter((feature) => feature !== undefined)
			};

			poiData = geojsonData.features
				.filter((feature) => feature.geometry.type === 'Point')
				.map((feature) => ({
					coordinates: feature.geometry.coordinates as [number, number],
					properties: feature.properties || {}
				}));

			// TODO
			setTimeout(() => {
				mapStore.setData(
					'focus_bbox',
					geojsonData as FeatureCollection<Geometry, GeoJsonProperties>
				);
			}, 500); // 1秒後にデータを設定
		}
	});

	$effect(() => {
		if (selectedEpsgCode) {
			const feature = geojsonData.features.find(
				(feature) =>
					feature.properties?.code === selectedEpsgCode && feature.geometry.type === 'Polygon'
			);

			if (feature) {
				mapStore.fitBounds(feature.bbox as [number, number, number, number], {
					padding: 100,
					maxZoom: 10,
					duration: 500
				});
			}
		}
	});

	const onClick = (code: EpsgCode) => {
		selectedEpsgCode = code;
	};
</script>

{#if showZoneForm}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="w-side-menu bg-main absolute left-0 top-0 z-30 flex h-full flex-col items-center justify-center p-4 text-base"
	>
		<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
			<span class="text-2xl font-bold">投影法の選択</span>
		</div>

		<div
			class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-y-auto overflow-x-hidden"
		>
			{#each getEpsgInfoArray({ exclude4326: true }) as info}
				<label class="z-10 flex w-full cursor-pointer items-center justify-center p-2 text-white">
					<input type="radio" bind:group={selectedEpsgCode} value={info.code} class="hidden" />
					<span
						class="select-none transition-colors duration-200 {info.code === selectedEpsgCode
							? 'text-black'
							: ''}"
						>{info.name}
					</span>
				</label>
			{/each}
			<div class="flex w-full max-w-[300px] flex-col items-center gap-2">
				<span class="text-lg">選択されたEPSGコード: {selectedEpsgCode}</span>
			</div>
		</div>
		<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
			<button
				onclick={() => (showZoneForm = false)}
				class="c-btn-cancel cursor-pointer p-4 text-lg"
			>
				キャンセル
			</button>
			<button onclick={registration} class="c-btn-confirm pointer min-w-[200px] p-4 text-lg">
				決定
			</button>
		</div>
	</div>
{/if}

{#if showZoneForm}
	{#each poiData as poi (poi.properties.code)}
		<ZoneMarker
			{map}
			lngLat={new maplibregl.LngLat(poi.coordinates[0] as number, poi.coordinates[1] as number)}
			properties={poi.properties}
			onClick={(code) => onClick(code)}
			{selectedEpsgCode}
		/>
	{/each}
{/if}
