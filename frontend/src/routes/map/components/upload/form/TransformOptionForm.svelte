<script lang="ts">
	import turfBbox from '@turf/bbox';
	import turfCenter from '@turf/center';
	import turfNearestPoint from '@turf/nearest-point';
	import maplibregl from 'maplibre-gl';
	import type { ImageSource } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';

	import { MAP_ANIMATION_DURATION, MAP_EASING } from '$routes/constants';
	import GeoRefMarker from '$routes/map/components/marker/GeoRefMarker.svelte';
	import ZoneMarker from '$routes/map/components/marker/ZoneMarker.svelte';
	import type {
		GeoRefData,
		GeoRefPreviewData,
		RasterRegistrationMode
	} from '$routes/map/components/upload/form/GeoRefForm.svelte';
	import GeoRefMenu from '$routes/map/components/upload/form/GeoRefMenu.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import ZoneMenu from '$routes/map/components/upload/form/ZoneMenu.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LNG,
		WEB_MERCATOR_MAX_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection, Feature } from '$routes/map/types/geojson';
	import type { PointGeometry, PolygonGeometry } from '$routes/map/types/geometry';
	import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
	import { encodeAllBandsToTerrarium } from '$routes/map/utils/formats/geotiff';
	import { createRasterMeshEntry } from '$routes/map/utils/formats/geotiff/mesh';
	import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';
	import { isBboxValid, isFiniteBbox } from '$routes/map/utils/map/bbox';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { transformBbox } from '$routes/map/utils/proj';
	import {
		getEpsgInfoArray,
		type EpsgCode,
		type EpsgInfoWithCode
	} from '$routes/map/utils/proj/dict';
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
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		transformOptionMode: TransformOptionMode;
		canSwitchToGeoRef: boolean;
		canSwitchToZone: boolean;
		onZoneConfirm: (epsgCode: EpsgCode) => void;
		onZoneGeoRef: (epsgCode: EpsgCode) => void;
		onSelectTab: (tab: 'zone' | 'georef') => void;
	}

	let {
		map,
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneBboxGeojsonData = $bindable(),
		geoRefData = $bindable(),
		geoRefPreviewData = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		canSwitchToGeoRef,
		canSwitchToZone,
		onZoneConfirm,
		onZoneGeoRef,
		onSelectTab
	}: Props = $props();

	const PREVIEW_SOURCE_ID = 'georef_image_preview';
	const registrationModeOptions: { key: RasterRegistrationMode; name: string }[] = [
		{ key: 'raster', name: 'ラスター' },
		{ key: 'mesh', name: '3Dメッシュ' }
	];
	const isZoneVisible = $derived(transformOptionMode === 'zone');
	const isGeoRefVisible = $derived(transformOptionMode === 'georef');
	const primaryLabel = $derived(isZoneVisible ? '決定' : '登録');

	let originalBbox = $derived.by(() => focusBbox ?? null);
	let poiData = $state<PoiData[]>([]);
	let zoneFeatures: FeatureCollection<PolygonGeometry | PointGeometry, PoiData['properties']> = {
		type: 'FeatureCollection',
		features: []
	};

	let imageUrl = $state<string | null>(null);
	let initialized = $state(false);
	let rafId: number | null = null;

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
		transformOptionMode = null;
		geoRefData = null;
		showDialogType = null;
		dropFile = null;
	};

	const handleCancel = () => {
		if (isGeoRefVisible) {
			cleanupGeoRef();
			return;
		}
		resetZone();
	};

	const handleConfirm = async () => {
		if (isZoneVisible) {
			const code = selectedEpsgCode;
			resetZone();
			onZoneConfirm(code);
			return;
		}

		if (!geoRefData) return;

		isProcessing.set(true);
		try {
			const data = geoRefData;
			const bbox = getBbox();
			const corners = getCornerCoordinates();

			GeoTiffCache.setBbox(data.entryId, bbox);
			GeoTiffCache.setSize(data.entryId, data.imageWidth, data.imageHeight);
			GeoTiffCache.setNumBands(data.entryId, data.numBands);

			const mapImage = generateThumbnail({
				bands: data.parsedBands,
				width: data.imageWidth,
				height: data.imageHeight
			});

			if (data.registrationMode === 'mesh' && data.numBands === 1) {
				const entry = await createRasterMeshEntry({
					id: data.entryId,
					name: data.entryName || 'GeoTIFF 3Dメッシュ',
					band: data.parsedBands[0],
					width: data.imageWidth,
					height: data.imageHeight,
					nodata: data.parsedNodata,
					bounds: bbox,
					corners,
					mapImage
				});

				showDataEntry = entry;
				cleanupGeoRef();
				showNotification('3Dメッシュを生成しました', 'success');
				return;
			}

			await encodeAllBandsToTerrarium(
				data.entryId,
				data.parsedBands,
				data.imageWidth,
				data.imageHeight,
				data.parsedNodata,
				data.dataRanges
			);

			const isSingleBand = data.numBands === 1;
			const entry: RasterImageEntry<RasterTiffStyle> = {
				id: data.entryId,
				type: 'raster',
				format: {
					type: 'image',
					url: ''
				},
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'GeoTIFF',
					name: data.entryName || '画像データ',
					tileSize: 256,
					bounds: bbox,
					imageCorners: corners,
					xyzImageTile: findCenterTile(bbox),
					mapImage
				},
				properties: {
					bands: {
						numBands: data.numBands
					}
				},
				interaction: {
					...DEFAULT_RASTER_BASEMAP_INTERACTION
				},
				style: {
					type: 'tiff',
					opacity: 1,
					visible: true,
					visualization: {
						mode: isSingleBand ? 'single' : 'multi',
						uniformsData: {
							single: {
								index: 0,
								min: data.bandMinMax.min,
								max: data.bandMinMax.max,
								colorMap: 'jet'
							},
							multi: {
								r: { index: 0, min: data.multiBandMinMax.r.min, max: data.multiBandMinMax.r.max },
								g: {
									index: data.numBands >= 2 ? 1 : 0,
									min: data.multiBandMinMax.g.min,
									max: data.multiBandMinMax.g.max
								},
								b: {
									index: data.numBands >= 3 ? 2 : 0,
									min: data.multiBandMinMax.b.min,
									max: data.multiBandMinMax.b.max
								}
							}
						}
					}
				}
			};

			showDataEntry = entry;
			cleanupGeoRef();
			showNotification('画像の位置を設定しました', 'success');
		} catch (error) {
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
		if (geoRefData && isGeoRefVisible && !initialized) {
			const data = geoRefData;
			untrack(() => {
				showDataMenu.set(false);
				if (data.initialCorners) {
					nw = new maplibregl.LngLat(data.initialCorners[0][0], data.initialCorners[0][1]);
					ne = new maplibregl.LngLat(data.initialCorners[1][0], data.initialCorners[1][1]);
					se = new maplibregl.LngLat(data.initialCorners[2][0], data.initialCorners[2][1]);
					sw = new maplibregl.LngLat(data.initialCorners[3][0], data.initialCorners[3][1]);
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
</script>

{#if transformOptionMode}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="w-side-menu bg-main absolute top-0 left-0 z-30 flex h-full flex-col items-center justify-center p-4 text-base"
	>
		{#if isZoneVisible}
			<ZoneMenu
				{selectedEpsgCode}
				{poiData}
				{canSwitchToGeoRef}
				onSwitchToGeoRef={handleZoneToGeoRef}
			/>
		{:else if isGeoRefVisible && geoRefData}
			<GeoRefMenu
				{geoRefData}
				{bboxDisplay}
				{canSwitchToZone}
				onSwitchToZone={() => onSelectTab('zone')}
				{registrationModeOptions}
			/>
		{/if}

		<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2 pb-2">
			<button onclick={handleCancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button
			>
			<button
				onclick={handleConfirm}
				disabled={$isProcessing}
				class="c-btn-confirm min-w-[200px] p-4 text-lg {$isProcessing
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer'}"
			>
				{primaryLabel}
			</button>
		</div>
	</div>

	{#if isZoneVisible}
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
	{:else if isGeoRefVisible && geoRefData}
		<GeoRefMarker {map} bind:lngLat={nw} label="NW" onDrag={onDragCorner} />
		<GeoRefMarker {map} bind:lngLat={ne} label="NE" onDrag={onDragCorner} />
		<GeoRefMarker {map} bind:lngLat={se} label="SE" onDrag={onDragCorner} />
		<GeoRefMarker {map} bind:lngLat={sw} label="SW" onDrag={onDragCorner} />
	{/if}
{/if}
