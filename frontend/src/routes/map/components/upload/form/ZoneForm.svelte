<script lang="ts">
	import { isBboxValid } from '$routes/map/utils/map';
	import { transformBbox } from '$routes/map/utils/proj';
	import { getEpsgInfoArray, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { mapStore } from '$routes/stores/map';
	import { useEventTrigger } from '$routes/stores/ui';
	import type { Geometry, GeoJsonProperties, Feature, FeatureCollection, Polygon } from 'geojson';
	import { fly } from 'svelte/transition';
	import turfCenter from '@turf/center';
	import ZoneMarker from '$routes/map/components/marker/ZoneMarker.svelte';
	import maplibregl from 'maplibre-gl';

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
			name_ja: string;
			prefecture?: string;
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

						const prj = info.proj_context;
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
					'zone_bbox',
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

			mapStore.setFilter('@zone_bbox_select', [
				'all',
				['==', '$type', 'Polygon'],
				['==', 'code', selectedEpsgCode]
			]);
		}
	});

	const onClick = (code: EpsgCode) => {
		selectedEpsgCode = code;
	};
</script>

{#if showZoneForm}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="w-side-menu bg-main absolute top-0 left-0 z-30 flex h-full flex-col items-center justify-center p-4 text-base"
	>
		<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
			<span class="text-2xl font-bold">投影法の選択</span>
		</div>

		<div
			class="c-scroll flex h-full w-full grow flex-col items-center overflow-x-hidden overflow-y-auto"
		>
			{#each poiData as info}
				<label
					class="z-10 flex w-full cursor-pointer items-center justify-start rounded-md px-2 py-4 {info
						.properties.code === selectedEpsgCode
						? 'bg-accent '
						: 'text-white'}"
				>
					<input
						type="radio"
						bind:group={selectedEpsgCode}
						value={info.properties.code}
						class="hidden"
					/>
					<div class="flex flex-col">
						<span class="transition-colors duration-200 select-none"
							>{info.properties.name_ja}
						</span>
						<span class="text text-xs text-gray-300 transition-colors duration-200 select-none"
							>{info.properties.prefecture ?? ''}
						</span>
					</div>
				</label>
			{/each}
		</div>
		<div class="flex shrink-0 flex-col justify-center gap-4 overflow-auto pt-2">
			<div class="flex w-full max-w-[300px] flex-col items-center gap-2">
				<span class="text-lg">選択されたEPSGコード: {selectedEpsgCode}</span>
			</div>
			<div class="flex gap-2">
				<button onclick={() => (showZoneForm = false)} class="c-btn-sub cursor-pointer p-4 text-lg">
					キャンセル
				</button>
				<button onclick={registration} class="c-btn-confirm pointer min-w-[200px] p-4 text-lg">
					決定
				</button>
			</div>
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
