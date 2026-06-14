<script lang="ts">
	import turfBbox from '@turf/bbox';
	import turfCenter from '@turf/center';
	import turfNearestPoint from '@turf/nearest-point';
	import maplibregl from 'maplibre-gl';
	import type { ImageSource } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';

	import { MAP_ANIMATION_DURATION, MAP_EASING } from '$routes/constants';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import GeoRefMarker from '$routes/map/components/marker/GeoRefMarker.svelte';
	import ZoneMarker from '$routes/map/components/marker/ZoneMarker.svelte';
	import type {
		ActiveTransformOptionMode,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import type {
		GeoRefConfirmPayload,
		GeoRefData,
		GeoRefPreviewData,
		GeoRefTransformMode,
		RasterRegistrationMode
	} from '$routes/map/components/upload/form/transform/georef-types';
	import GeoRefMenu from '$routes/map/components/upload/form/transform/GeoRefMenu.svelte';
	import ZoneMenu from '$routes/map/components/upload/form/transform/ZoneMenu.svelte';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LNG,
		WEB_MERCATOR_MAX_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection, Feature } from '$routes/map/types/geojson';
	import type { PointGeometry, PolygonGeometry } from '$routes/map/types/geometry';
	import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';
	import { isBboxValid, isFiniteBbox } from '$routes/map/utils/map/bbox';
	import { transformBbox } from '$routes/map/utils/proj';
	import {
		getEpsgInfoArray,
		type EpsgCode,
		type EpsgInfoWithCode
	} from '$routes/map/utils/proj/dict';
	import {
		applyAspectLockedGeoRefDrag,
		getGeoRefAspectRatio,
		type GeoRefCornerKey
	} from '$routes/map/utils/transform/georef/aspect-locked';
	import { debugLog } from '$routes/stores/debug';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing, showDataMenu } from '$routes/stores/ui';

	interface PoiData {
		coordinates: [number, number];
		properties: EpsgInfoWithCode;
	}

	interface Props {
		map: maplibregl.Map;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneBboxGeojsonData: FeatureCollection<PolygonGeometry | PointGeometry, EpsgInfoWithCode>;
		geoRefData: GeoRefData | null;
		geoRefPreviewData: GeoRefPreviewData | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		transformOptionMode: TransformOptionMode;
		onZoneConfirm: (epsgCode: EpsgCode) => void;
		onZoneGeoRef: (epsgCode: EpsgCode) => void;
		onGeoRefConfirm: (payload: GeoRefConfirmPayload) => Promise<void>;
	}

	let {
		map,
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneBboxGeojsonData = $bindable(),
		geoRefData = $bindable(),
		geoRefPreviewData = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		onZoneConfirm,
		onZoneGeoRef,
		onGeoRefConfirm
	}: Props = $props();

	const PREVIEW_SOURCE_ID = 'georef_image_preview';
	const registrationModeOptions: { key: RasterRegistrationMode; name: string }[] = [
		{ key: 'raster', name: 'ラスター' },
		{ key: 'mesh', name: '3Dメッシュ' }
	];

	let originalBbox = $derived.by(() => focusBbox ?? null);
	let poiData = $state<PoiData[]>([]);
	let zoneFeatures: FeatureCollection<PolygonGeometry | PointGeometry, PoiData['properties']> = {
		type: 'FeatureCollection',
		features: []
	};

	let imageUrl = $state<string | null>(null);
	let initialized = $state(false);
	let rafId: number | null = null;
	let geoRefTransformMode = $state<GeoRefTransformMode>('projective');

	let nw = $state<maplibregl.LngLat>(new maplibregl.LngLat(0, 0));
	let ne = $state<maplibregl.LngLat>(new maplibregl.LngLat(0, 0));
	let se = $state<maplibregl.LngLat>(new maplibregl.LngLat(0, 0));
	let sw = $state<maplibregl.LngLat>(new maplibregl.LngLat(0, 0));

	const getCornerCoordinates = (): [
		[number, number],
		[number, number],
		[number, number],
		[number, number]
	] => [
		[nw.lng, nw.lat],
		[ne.lng, ne.lat],
		[se.lng, se.lat],
		[sw.lng, sw.lat]
	];

	const getBbox = (): [number, number, number, number] => {
		const lngs = [nw.lng, ne.lng, se.lng, sw.lng];
		const lats = [nw.lat, ne.lat, se.lat, sw.lat];
		return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
	};

	const clampCornerCoordinate = ([lng, lat]: [number, number]): [number, number] => [
		Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, lng)),
		Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, lat))
	];

	const setCornerCoordinates = (
		corners: [[number, number], [number, number], [number, number], [number, number]]
	) => {
		const [nextNw, nextNe, nextSe, nextSw] = corners.map(clampCornerCoordinate) as [
			[number, number],
			[number, number],
			[number, number],
			[number, number]
		];
		nw = new maplibregl.LngLat(nextNw[0], nextNw[1]);
		ne = new maplibregl.LngLat(nextNe[0], nextNe[1]);
		se = new maplibregl.LngLat(nextSe[0], nextSe[1]);
		sw = new maplibregl.LngLat(nextSw[0], nextSw[1]);
	};

	const resetZone = () => {
		transformOptionMode = null;
		focusBbox = null;
		zoneBboxGeojsonData = {
			type: 'FeatureCollection',
			features: []
		};
		zoneFeatures = {
			type: 'FeatureCollection',
			features: []
		};
		poiData = [];
	};

	const removePreview = () => {
		geoRefPreviewData = null;
		if (imageUrl && imageUrl.startsWith('blob:')) {
			URL.revokeObjectURL(imageUrl);
		}
		imageUrl = null;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	};

	const cleanupGeoRef = () => {
		removePreview();
		initialized = false;
		geoRefTransformMode = 'projective';
		transformOptionMode = null;
		geoRefData = null;
		showDialogType = null;
		dropFile = null;
	};

	const handleCancel = () => {
		if (transformOptionMode === 'georef') {
			cleanupGeoRef();
			return;
		}
		resetZone();
	};

	const handleConfirm = async () => {
		if (transformOptionMode === 'zone') {
			const code = selectedEpsgCode;
			resetZone();
			onZoneConfirm(code);
			return;
		}

		if (!geoRefData) return;

		isProcessing.set(true);
		try {
			const data = geoRefData;
			debugLog.info(
				`GeoRef確定開始: id=${data.entryId}, mode=${data.registrationMode}, size=${data.imageWidth}x${data.imageHeight}`
			);
			const bbox = getBbox();
			const corners = getCornerCoordinates();
			await onGeoRefConfirm({ bbox, corners });
		} catch (error) {
			debugLog.error(`GeoRef確定失敗: ${error instanceof Error ? error.message : String(error)}`);
			showNotification(
				error instanceof Error ? error.message : 'エンコードに失敗しました',
				'error'
			);
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const handleZoneToGeoRef = () => {
		onZoneGeoRef(selectedEpsgCode);
	};

	const onDragCorner = () => {
		if (!imageUrl) return;

		if (!geoRefPreviewData || geoRefPreviewData.url !== imageUrl) {
			geoRefPreviewData = {
				url: imageUrl,
				coordinates: getCornerCoordinates()
			};
		} else {
			geoRefPreviewData.coordinates = getCornerCoordinates();
		}

		if (rafId !== null) return;
		const nextImageUrl = imageUrl;
		rafId = requestAnimationFrame(() => {
			rafId = null;
			const source = map.getSource(PREVIEW_SOURCE_ID) as ImageSource | undefined;
			if (!source) return;
			source.updateImage({
				url: nextImageUrl,
				coordinates: getCornerCoordinates()
			});
		});
	};

	const handleGeoRefCornerDrag = (cornerKey: GeoRefCornerKey, lngLat: maplibregl.LngLat) => {
		if (geoRefTransformMode === 'aspect-locked' && geoRefData) {
			const nextCorners = applyAspectLockedGeoRefDrag(
				getCornerCoordinates(),
				cornerKey,
				[lngLat.lng, lngLat.lat],
				getGeoRefAspectRatio(geoRefData.imageWidth, geoRefData.imageHeight)
			);
			setCornerCoordinates(nextCorners);
		}

		onDragCorner();
	};

	$effect(() => {
		if (!originalBbox) {
			zoneFeatures = { type: 'FeatureCollection', features: [] };
			poiData = [];
			return;
		}

		if (!isFiniteBbox(originalBbox)) {
			zoneFeatures = { type: 'FeatureCollection', features: [] };
			poiData = [];
			zoneBboxGeojsonData = {
				type: 'FeatureCollection',
				features: []
			};
			return;
		}

		zoneFeatures = {
			type: 'FeatureCollection',
			features: getEpsgInfoArray()
				.flatMap((info) => {
					let transformedBbox: [number, number, number, number];

					if (info.code === '4326') {
						transformedBbox = [
							Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, originalBbox[0])),
							Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, originalBbox[1])),
							Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, originalBbox[2])),
							Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, originalBbox[3]))
						];
						if (
							transformedBbox[0] >= transformedBbox[2] ||
							transformedBbox[1] >= transformedBbox[3]
						) {
							return [];
						}
					} else {
						transformedBbox = transformBbox(originalBbox, info.proj_context);
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

		poiData = zoneFeatures.features
			.filter((feature) => feature.geometry.type === 'Point')
			.map((feature) => ({
				coordinates: feature.geometry.coordinates as [number, number],
				properties: feature.properties || {}
			}));

		const mapCenter = map.getCenter();
		const points = zoneFeatures.features.filter(
			(feature) => feature.geometry.type === 'Point'
		) as Feature<PointGeometry, PoiData['properties']>[];
		if (points.length > 0) {
			const nearest = turfNearestPoint([mapCenter.lng, mapCenter.lat], {
				type: 'FeatureCollection',
				features: points
			});
			selectedEpsgCode = points[nearest.properties.featureIndex].properties.code;
		}

		zoneBboxGeojsonData = {
			type: 'FeatureCollection',
			features: zoneFeatures.features.filter((feature) => feature.geometry.type === 'Polygon')
		} as FeatureCollection<PolygonGeometry, EpsgInfoWithCode>;
	});

	$effect(() => {
		if (!selectedEpsgCode) return;

		const feature = zoneFeatures.features.find(
			(item) => item.properties?.code === selectedEpsgCode && item.geometry.type === 'Polygon'
		);
		if (!feature) return;

		const bbox = turfBbox(feature as Feature<PolygonGeometry, PoiData['properties']>);
		mapStore.fitBounds(bbox as [number, number, number, number], {
			padding: 100,
			duration: MAP_ANIMATION_DURATION,
			easing: MAP_EASING
		});

		mapStore.setFilter('@zone_bbox_select', [
			'all',
			['==', '$type', 'Polygon'],
			['==', 'code', selectedEpsgCode]
		]);
	});

	$effect(() => {
		if (geoRefData && transformOptionMode === 'georef' && !initialized) {
			const data = geoRefData;
			untrack(() => {
				geoRefTransformMode = 'projective';
				showDataMenu.set(false);
				if (data.initialCorners) {
					setCornerCoordinates(data.initialCorners);
					map.fitBounds(
						[
							[Math.min(nw.lng, sw.lng), Math.min(sw.lat, se.lat)],
							[Math.max(ne.lng, se.lng), Math.max(nw.lat, ne.lat)]
						],
						{ padding: 80, duration: 0 }
					);
				} else {
					const center = map.getCenter();
					const bounds = map.getBounds();
					const viewWidth = bounds.getEast() - bounds.getWest();
					const viewHeight = bounds.getNorth() - bounds.getSouth();
					const cosLat = Math.cos((center.lat * Math.PI) / 180);
					const aspect = data.imageWidth / data.imageHeight;
					const size = Math.min(viewWidth, viewHeight) * 0.3;

					let halfW: number;
					let halfH: number;
					if (aspect >= 1) {
						halfW = size / 2 / cosLat;
						halfH = size / (2 * aspect);
					} else {
						halfW = (size * aspect) / 2 / cosLat;
						halfH = size / 2;
					}

					nw = new maplibregl.LngLat(center.lng - halfW, center.lat + halfH);
					ne = new maplibregl.LngLat(center.lng + halfW, center.lat + halfH);
					se = new maplibregl.LngLat(center.lng + halfW, center.lat - halfH);
					sw = new maplibregl.LngLat(center.lng - halfW, center.lat - halfH);
				}

				imageUrl =
					data.previewImageUrl ??
					generateThumbnail({
						bands: data.parsedBands,
						width: data.imageWidth,
						height: data.imageHeight,
						nodata: data.parsedNodata,
						ranges: data.dataRanges
					});

				if (imageUrl) {
					geoRefPreviewData = {
						url: imageUrl,
						coordinates: getCornerCoordinates()
					};
				}

				initialized = true;
			});
		}
	});

	const bboxDisplay = $derived.by(() => {
		const bbox = getBbox();
		return `[${bbox.map((value) => value.toFixed(6)).join(', ')}]`;
	});

	const transModeOptions = [
		{ key: 'zone', name: '投影法選択' },
		{ key: 'georef', name: '位置合わせ' }
	] as { key: ActiveTransformOptionMode; name: string }[];
</script>

{#if transformOptionMode}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="w-side-menu bg-main absolute top-0 left-0 z-30 flex h-full flex-col items-center justify-between p-4 text-base"
	>
		<div class="w-full mb-4">
			<HorizontalSelectBox bind:group={transformOptionMode} options={transModeOptions} />
		</div>
		{#if transformOptionMode === 'zone'}
			<ZoneMenu bind:selectedEpsgCode {poiData} />
		{:else if transformOptionMode === 'georef' && geoRefData}
			<GeoRefMenu {geoRefData} {bboxDisplay} bind:geoRefTransformMode {registrationModeOptions} />
		{/if}

		<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2 pb-2">
			<button onclick={handleCancel} class="c-btn-sub cursor-pointer select-none p-4 text-lg"
				>キャンセル</button
			>
			<button
				onclick={handleConfirm}
				disabled={$isProcessing}
				class="c-btn-confirm min-w-[200px] p-4 select-none text-lg {$isProcessing
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer'}"
			>
				決定
			</button>
		</div>
	</div>

	{#if transformOptionMode === 'zone'}
		{#each poiData as poi (poi.properties.code)}
			<ZoneMarker
				{map}
				lngLat={new maplibregl.LngLat(poi.coordinates[0], poi.coordinates[1])}
				properties={poi.properties}
				onClick={(code) => {
					selectedEpsgCode = code;
				}}
				{selectedEpsgCode}
			/>
		{/each}
	{:else if transformOptionMode === 'georef' && geoRefData}
		<GeoRefMarker
			{map}
			bind:lngLat={nw}
			label="NW"
			onDrag={(lngLat) => {
				handleGeoRefCornerDrag('nw', lngLat);
			}}
		/>
		<GeoRefMarker
			{map}
			bind:lngLat={ne}
			label="NE"
			onDrag={(lngLat) => {
				handleGeoRefCornerDrag('ne', lngLat);
			}}
		/>
		<GeoRefMarker
			{map}
			bind:lngLat={se}
			label="SE"
			onDrag={(lngLat) => {
				handleGeoRefCornerDrag('se', lngLat);
			}}
		/>
		<GeoRefMarker
			{map}
			bind:lngLat={sw}
			label="SW"
			onDrag={(lngLat) => {
				handleGeoRefCornerDrag('sw', lngLat);
			}}
		/>
	{/if}
{/if}
