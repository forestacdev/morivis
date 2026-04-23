<script lang="ts">
	import turfBbox from '@turf/bbox';
	import turfCenter from '@turf/center';
	import turfNearestPoint from '@turf/nearest-point';
	import maplibregl from 'maplibre-gl';
	import { fly } from 'svelte/transition';

	import { MAP_ANIMATION_DURATION, MAP_EASING } from '$routes/constants';
	import ZoneMarker from '$routes/map/components/marker/ZoneMarker.svelte';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LNG,
		WEB_MERCATOR_MAX_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import type { FeatureCollection, Feature } from '$routes/map/types/geojson';
	import type { PolygonGeometry, PointGeometry } from '$routes/map/types/geometry';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformBbox } from '$routes/map/utils/proj';
	import {
		getEpsgInfoArray,
		type EpsgCode,
		type EpsgInfoWithCode
	} from '$routes/map/utils/proj/dict';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		map: maplibregl.Map; // MapLibre GL JSのマップインスタンス
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null; // フォーカスするバウンディングボックス
		zoneBboxGeojsonData: FeatureCollection<PolygonGeometry | PointGeometry, EpsgInfoWithCode>;
		onConfirm: (epsgCode: EpsgCode) => void;
	}

	let {
		map,
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneBboxGeojsonData = $bindable(),
		onConfirm
	}: Props = $props();

	// リセット処理
	const reset = () => {
		showZoneForm = false;
		focusBbox = null; // リセットして次回のeffect再実行を保証
		zoneBboxGeojsonData = {
			type: 'FeatureCollection',
			features: []
		};
	};

	const registration = () => {
		const code = selectedEpsgCode;
		reset();
		onConfirm(code);
	};
	let originalBbox = $derived.by(() => {
		if (focusBbox) {
			return focusBbox;
		}
		return null;
	});

	interface PoiData {
		coordinates: [number, number];
		properties: EpsgInfoWithCode;
	}

	let _internalGeojson: FeatureCollection<PolygonGeometry | PointGeometry, PoiData['properties']> =
		{
			type: 'FeatureCollection',
			features: []
		};

	let poiData = $state<PoiData[]>([]);

	$effect(() => {
		if (!originalBbox) {
			// bboxリセット時にデータもクリア
			_internalGeojson = { type: 'FeatureCollection', features: [] };
			poiData = [];
			return;
		}

		_internalGeojson = {
			type: 'FeatureCollection',
			features: getEpsgInfoArray()
				.flatMap((info) => {
					let transformedBbox: [number, number, number, number];

					if (info.code === '4326') {
						// 4326の場合は座標変換不要、WebMercator範囲にクリップして表示
						transformedBbox = [
							Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, originalBbox[0])),
							Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, originalBbox[1])),
							Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, originalBbox[2])),
							Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, originalBbox[3]))
						];
						// クリップ後に有効でなければスキップ
						if (
							transformedBbox[0] >= transformedBbox[2] ||
							transformedBbox[1] >= transformedBbox[3]
						) {
							return [];
						}
					} else {
						const prj = info.proj_context;
						transformedBbox = transformBbox(originalBbox, prj);
						if (!isBboxValid(transformedBbox)) return [];
					}

					const polygonFeature: Feature<PolygonGeometry, PoiData['properties']> = {
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
						properties: {
							...info
						}
					};

					const centerPoint: Feature<PointGeometry, PoiData['properties']> = {
						type: 'Feature',
						geometry: turfCenter(polygonFeature).geometry as PointGeometry,
						properties: {
							...info
						}
					};

					return [polygonFeature, centerPoint];
				})
				.filter((feature) => feature !== undefined)
		};

		poiData = _internalGeojson.features
			.filter((feature) => feature.geometry.type === 'Point')
			.map((feature) => ({
				coordinates: feature.geometry.coordinates as [number, number],
				properties: feature.properties || {}
			}));

		// 現在の地図の中心から一番近いフィーチャーを見つけて、そのpoiDataの座標系を選択する
		const mapCenter = map.getCenter();
		const points = _internalGeojson.features.filter((f) => f.geometry.type === 'Point') as Feature<
			PointGeometry,
			PoiData['properties']
		>[];
		if (points.length > 0) {
			const nearest = turfNearestPoint([mapCenter.lng, mapCenter.lat], {
				type: 'FeatureCollection',
				features: points
			});
			const idx = nearest.properties.featureIndex;
			selectedEpsgCode = points[idx].properties.code;
		}

		zoneBboxGeojsonData = {
			type: 'FeatureCollection',
			features: _internalGeojson.features.filter((feature) => feature.geometry.type === 'Polygon')
		} as FeatureCollection<PolygonGeometry, EpsgInfoWithCode>;
	});

	$effect(() => {
		if (selectedEpsgCode) {
			const feature = _internalGeojson.features.find(
				(feature) =>
					feature.properties?.code === selectedEpsgCode && feature.geometry.type === 'Polygon'
			);

			if (!feature) {
				return;
			}

			const bbox = turfBbox(feature as Feature<PolygonGeometry, PoiData['properties']>);

			if (feature) {
				mapStore.fitBounds(bbox as [number, number, number, number], {
					padding: 100,
					duration: MAP_ANIMATION_DURATION,
					easing: MAP_EASING
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
		<div class="c-scroll-hidden relative flex h-full flex-col overflow-x-hidden">
			<!-- スクロールコンテンツ -->
			<div
				class="c-scroll-hidden flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto pb-[250px]"
			>
				{#each poiData as info}
					<label
						class="border-sub lg:hover:border-accent z-10 flex w-full cursor-pointer items-center justify-start rounded-md border p-3 transition-colors duration-200 {info
							.properties.code === selectedEpsgCode
							? 'bg-accent'
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
							<span class="text text-sm text-gray-300 transition-colors duration-200 select-none"
								>{info.properties.prefecture ?? ''}
							</span>
						</div>
					</label>
				{/each}
			</div>
			<!-- フォグ効果の背景 -->
			<div
				class="c-bg-fog-bottom pointer-events-none absolute bottom-0 z-10 h-[150px] w-full"
			></div>
		</div>
		<div class="flex shrink-0 flex-col justify-center gap-4 overflow-auto pt-2 pb-2">
			<div class="flex w-full max-w-[300px] flex-col items-center gap-2">
				<span class="text-lg">選択されたEPSGコード: {selectedEpsgCode}</span>
			</div>
			<div class="flex gap-2">
				<button onclick={reset} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
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
