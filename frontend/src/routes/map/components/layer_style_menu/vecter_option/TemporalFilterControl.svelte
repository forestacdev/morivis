<script lang="ts">
	import turfBbox from '@turf/bbox';
	import turfDistance from '@turf/distance';
	import { onDestroy } from 'svelte';
	import { slide } from 'svelte/transition';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import type {
		MorivisVectorEntry,
		GeoJsonMetaData,
		TileMetaData,
		VectorTemporalFilterState
	} from '$routes/map/data/types/vector';
	import {
		getVectorTemporalFilterBehavior,
		getVectorTemporalItems,
		type VectorTemporalCameraTrackingMode,
		type VectorTemporalItem
	} from '$routes/map/data/types/vector/properties';
	import type { Feature } from '$routes/map/types/geojson';
	import type { AnyGeometry } from '$routes/map/types/geometry';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import { HighlightLayerRegistry } from '$routes/map/utils/layers/highlight';
	import { createSublayerId } from '$routes/map/utils/layers/id';
	import {
		LngLat,
		type ExpressionSpecification,
		type FilterSpecification
	} from '$routes/map/utils/maplibre';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: MorivisVectorEntry<GeoJsonMetaData | TileMetaData>;
		showDimensionOption: boolean;
	}

	interface TemporalTrackPoint {
		raw: string;
		lng: number;
		lat: number;
		bearing: number | null;
	}

	interface TemporalTrackPointSet {
		points: TemporalTrackPoint[];
		cumulativeMeters: number[];
	}

	interface TemporalCameraTrackingState {
		enabled: boolean;
	}

	type TemporalCameraTrackingUiMode = 'feature' | 'route' | 'route_auto_bearing';

	const defaultCameraTrackingDurationMs = 220;

	// 時間フィルターの初期状態。
	// 実際の選択範囲は、時間候補数が分かった後に補正する。
	const createDefaultTemporalFilterState = (): VectorTemporalFilterState => ({
		enabled: false,
		startIndex: 0,
		endIndex: 0,
		mode: 'range'
	});

	const createDefaultTemporalCameraTrackingState = (): TemporalCameraTrackingState => ({
		enabled: false
	});

	let { layerEntry = $bindable(), showDimensionOption = $bindable() }: Props = $props();

	let temporalFilterState = $state<VectorTemporalFilterState>(createDefaultTemporalFilterState());
	let cameraTrackingState = $state<TemporalCameraTrackingState>(
		createDefaultTemporalCameraTrackingState()
	);
	let cameraTrackingModeOverride = $state<TemporalCameraTrackingUiMode | null>(null);
	let cameraTrackingDurationMs = $state(defaultCameraTrackingDurationMs);
	let isPlaying = $state(false);
	let loopPlayback = $state(false);
	let playbackSpeed = $state(1201);
	let singleStartFilterMode = $state(false);
	let restoredLayerId = $state<string | null>(null);
	let lastTrackedTarget = $state<string | null>(null);
	let playbackFrameId: number | null = null;
	let playbackLastTimestamp: number | null = null;
	let smoothedCameraCenter: LngLat | null = null;
	let smoothedCameraBearing: number | null = null;
	let cachedTrackPointsLayerId: string | null = null;
	let cachedTrackPointsGeojson: unknown = null;
	let cachedTrackPointsItems: VectorTemporalItem[] | null = null;
	let cachedTrackPointsKeySignature = '';
	let cachedTrackPointSet: TemporalTrackPointSet = { points: [], cumulativeMeters: [] };

	// 時間軸の定義は properties.temporal を正とし、
	// 既存データのために attributeView.timeKey も後方互換で見る。
	const temporalConfig = $derived(
		(layerEntry.properties.temporal ??
			(layerEntry.properties.attributeView.timeKey
				? { key: layerEntry.properties.attributeView.timeKey }
				: undefined)) as typeof layerEntry.properties.temporal | undefined
	);

	const filterBehavior = $derived(
		temporalConfig ? getVectorTemporalFilterBehavior(temporalConfig) : undefined
	);

	// 複数の時間キー候補がある場合でも、比較用の参照順をここで一本化する。
	const temporalKeys = $derived.by(() => {
		const keys = [filterBehavior?.key, ...(filterBehavior?.alternateKeys ?? [])].filter(
			(key): key is string => Boolean(key)
		);
		return Array.from(new Set(keys));
	});

	// スライダーの目盛りは、読み込み時に作った時刻一覧をそのまま使う。
	const temporalItems = $derived.by(() => {
		return getVectorTemporalItems(layerEntry.properties.temporal) as VectorTemporalItem[];
	});
	const isSingleStartFilterMode = $derived(singleStartFilterMode);
	const activeTemporalIndex = $derived(
		isSingleStartFilterMode ? temporalFilterState.startIndex : temporalFilterState.endIndex
	);

	const canTrackCamera = $derived(layerEntry.format.type === 'geojson');
	const defaultCameraTrackingMode = $derived<VectorTemporalCameraTrackingMode>(
		layerEntry.properties.temporal?.cameraTrackingMode ?? 'feature'
	);
	const defaultCameraTrackingUiMode = $derived<TemporalCameraTrackingUiMode>(
		defaultCameraTrackingMode === 'route' ? 'route' : 'feature'
	);
	const activeCameraTrackingMode = $derived<TemporalCameraTrackingUiMode>(
		cameraTrackingModeOverride ?? defaultCameraTrackingUiMode
	);
	const activeCameraTrackingBaseMode = $derived<VectorTemporalCameraTrackingMode>(
		activeCameraTrackingMode === 'feature' ? 'feature' : 'route'
	);
	const shouldAutoBearing = $derived(activeCameraTrackingMode === 'route_auto_bearing');
	const isRouteTrackingMode = $derived(activeCameraTrackingBaseMode === 'route');
	const playbackIntervalMs = $derived(2001 - playbackSpeed);
	// 参考:
	// Mapbox cinematic route animation
	// https://www.mapbox.com/ja/blog/building-cinematic-route-animations-with-mapboxgl
	// Android Location bearing / speed
	// https://developer.android.com/reference/android/location/Location
	const cameraFollowBackDistanceMeters = 12;
	const cameraBearingLookAheadMeters = 8;
	const cameraMaxLookAheadDistanceMeters = 36;
	const cameraBearingUpdateThresholdDegrees = 2;
	const cameraCenterSmoothing = 0.18;
	const cameraBearingSmoothing = 0.14;

	const clamp = (value: number, min: number, max: number) => {
		return Math.min(Math.max(value, min), max);
	};

	const lerp = (start: number, end: number, amount: number) => {
		return start + (end - start) * amount;
	};

	const normalizeBearing = (bearing: number) => {
		return ((((bearing + 180) % 360) + 360) % 360) - 180;
	};

	const interpolateBearing = (start: number, end: number, amount: number) => {
		const delta = normalizeBearing(end - start);
		return normalizeBearing(start + delta * amount);
	};

	const getBearingDelta = (from: number, to: number) => {
		return Math.abs(normalizeBearing(to - from));
	};

	const getBearingBetweenPoints = (
		from: { lng: number; lat: number },
		to: { lng: number; lat: number }
	) => {
		const fromLat = (from.lat * Math.PI) / 180;
		const toLat = (to.lat * Math.PI) / 180;
		const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
		const y = Math.sin(deltaLng) * Math.cos(toLat);
		const x =
			Math.cos(fromLat) * Math.sin(toLat) -
			Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

		return normalizeBearing((Math.atan2(y, x) * 180) / Math.PI);
	};

	// 累積距離配列から、指定距離地点の補間座標を引く。
	const getPointAtDistance = (
		points: TemporalTrackPoint[],
		cumulativeMeters: number[],
		targetDistanceMeters: number
	) => {
		if (points.length === 0) return null;
		if (targetDistanceMeters <= 0) return points[0];

		const lastIndex = points.length - 1;
		if (targetDistanceMeters >= cumulativeMeters[lastIndex]) {
			return points[lastIndex];
		}

		for (let index = 1; index < points.length; index += 1) {
			if (cumulativeMeters[index] < targetDistanceMeters) continue;

			const previousPoint = points[index - 1];
			const currentPoint = points[index];
			const previousDistance = cumulativeMeters[index - 1];
			const currentDistance = cumulativeMeters[index];
			const segmentDistance = currentDistance - previousDistance;
			const segmentProgress =
				segmentDistance > 0 ? (targetDistanceMeters - previousDistance) / segmentDistance : 0;

			return {
				raw: currentPoint.raw,
				lng: lerp(previousPoint.lng, currentPoint.lng, segmentProgress),
				lat: lerp(previousPoint.lat, currentPoint.lat, segmentProgress),
				bearing: currentPoint.bearing
			};
		}

		return points[lastIndex];
	};

	// 近接点のノイズに引っ張られないよう、現在距離から少し先の点に対する方位を使う。
	// 参考:
	// Mapbox cinematic route animation
	// https://www.mapbox.com/ja/blog/building-cinematic-route-animations-with-mapboxgl
	// speed / bearing を分けて扱う考え方は Android Location API も同系統。
	// https://developer.android.com/reference/android/location/Location
	const getLookAheadPoint = (
		points: TemporalTrackPoint[],
		cumulativeMeters: number[],
		currentDistanceMeters: number,
		lookAheadDistanceMeters: number
	) => {
		const lookAheadPoint = getPointAtDistance(
			points,
			cumulativeMeters,
			currentDistanceMeters + lookAheadDistanceMeters
		);
		if (!lookAheadPoint) return null;
		if (
			Math.abs(lookAheadPoint.lng - points[points.length - 1].lng) < 1e-9 &&
			Math.abs(lookAheadPoint.lat - points[points.length - 1].lat) < 1e-9 &&
			currentDistanceMeters >= cumulativeMeters[cumulativeMeters.length - 1]
		) {
			return points[points.length - 1];
		}
		return lookAheadPoint;
	};

	const getAdaptiveLookAheadDistance = (segmentDistanceMeters: number) => {
		return clamp(
			Math.max(cameraBearingLookAheadMeters, segmentDistanceMeters * 2),
			cameraBearingLookAheadMeters,
			cameraMaxLookAheadDistanceMeters
		);
	};

	// ベースレイヤーに加えて、色分けやラベルなどの派生サブレイヤーにも
	// 同じ時間フィルターをかけるため、対象レイヤーIDをまとめる。
	const targetLayerIds = $derived.by(() => {
		const ids = [layerEntry.id];
		const { style } = layerEntry;

		if (style.type === 'circle') {
			if (style.imageIcon?.show) {
				return ids;
			}
			if (style.colors.show) {
				ids.push(createSublayerId(layerEntry.id, 'point_icon'));
			}
			if (style.labels.show) {
				ids.push(createSublayerId(layerEntry.id, 'label'));
			}
			return ids;
		}

		if (style.type === 'line') {
			if (style.colors.show) {
				ids.push(createSublayerId(layerEntry.id, 'line_pattern'));
			}
			if (style.labels.show) {
				ids.push(createSublayerId(layerEntry.id, 'label'));
			}
			return ids;
		}

		if (style.type === 'fill') {
			if (style.extrusion?.show) {
				if (style.colors.show) {
					ids.push(createSublayerId(layerEntry.id, 'fill_extrusion_pattern'));
				}
			} else if (style.colors.show) {
				ids.push(createSublayerId(layerEntry.id, 'fill_pattern'));
			}

			if (style.outline.show) {
				ids.push(createSublayerId(layerEntry.id, 'fill_outline'));
			}
			if (style.extrusion?.show) {
				ids.push(createSublayerId(layerEntry.id, 'fill_extrusion'));
			}
			if (style.labels.show) {
				ids.push(createSublayerId(layerEntry.id, 'label'));
			}
		}

		return ids;
	});

	// MapLibre の filter 式で時間属性を読むための expression。
	// 代替キーがある場合は coalesce で最初に見つかった値を使う。
	const temporalExpression = $derived.by((): ExpressionSpecification | null => {
		if (temporalKeys.length === 0) return null;
		if (temporalKeys.length === 1) return ['get', temporalKeys[0]] as ExpressionSpecification;
		return [
			'coalesce',
			...temporalKeys.map((key) => ['get', key]),
			''
		] as unknown as ExpressionSpecification;
	});

	// 1フィーチャーから、時間比較に使う文字列値を取り出す。
	const getFeatureTemporalValue = (properties: Record<string, unknown> | null | undefined) => {
		if (!properties) return null;

		for (const key of temporalKeys) {
			const value = properties[key];
			if (value == null || String(value) === '') continue;
			return String(value);
		}

		return null;
	};

	// カメラ追跡用に、現在の終了時刻に対応するフィーチャーを1件拾う。
	const getCurrentTemporalFeature = () => {
		if (!canTrackCamera) return null;

		const currentValue = temporalItems[activeTemporalIndex]?.raw;
		if (!currentValue) return null;

		const geojson = GeojsonCache.get(layerEntry.id);
		if (!geojson) return null;

		return (
			geojson.features.find((feature) => {
				const properties = feature.properties as Record<string, unknown> | null | undefined;
				return getFeatureTemporalValue(properties) === currentValue;
			}) ?? null
		);
	};

	const getFeatureTrackingPoint = (feature: Feature<AnyGeometry>): TemporalTrackPoint | null => {
		if (!feature.geometry) return null;

		if (feature.geometry.type === 'Point') {
			const [lng, lat] = feature.geometry.coordinates;
			const bearing = Number(
				(feature.properties as Record<string, unknown> | null | undefined)?.angle
			);

			return {
				raw:
					getFeatureTemporalValue(
						feature.properties as Record<string, unknown> | null | undefined
					) ?? '',
				lng,
				lat,
				bearing: Number.isFinite(bearing) ? bearing : null
			};
		}

		if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates.length > 0) {
			const [lng, lat] = feature.geometry.coordinates[0];
			const bearing = Number(
				(feature.properties as Record<string, unknown> | null | undefined)?.angle
			);

			return {
				raw:
					getFeatureTemporalValue(
						feature.properties as Record<string, unknown> | null | undefined
					) ?? '',
				lng,
				lat,
				bearing: Number.isFinite(bearing) ? bearing : null
			};
		}

		return null;
	};

	const invalidateTrackPointCache = () => {
		cachedTrackPointsLayerId = null;
		cachedTrackPointsGeojson = null;
		cachedTrackPointsItems = null;
		cachedTrackPointsKeySignature = '';
		cachedTrackPointSet = { points: [], cumulativeMeters: [] };
	};

	const getTemporalTrackPointSet = () => {
		if (!canTrackCamera || temporalItems.length === 0) {
			return { points: [], cumulativeMeters: [] } as TemporalTrackPointSet;
		}

		const geojson = GeojsonCache.get(layerEntry.id);
		if (!geojson) return { points: [], cumulativeMeters: [] } as TemporalTrackPointSet;

		const keySignature = temporalKeys.join('|');
		if (
			cachedTrackPointsLayerId === layerEntry.id &&
			cachedTrackPointsGeojson === geojson &&
			cachedTrackPointsItems === temporalItems &&
			cachedTrackPointsKeySignature === keySignature
		) {
			return cachedTrackPointSet;
		}

		const pointsByRaw: Record<string, TemporalTrackPoint> = {};
		for (const feature of geojson.features) {
			const trackPoint = getFeatureTrackingPoint(feature as Feature<AnyGeometry>);
			if (!trackPoint || trackPoint.raw === '' || pointsByRaw[trackPoint.raw]) continue;
			pointsByRaw[trackPoint.raw] = trackPoint;
		}

		const points = temporalItems
			.map((item) => pointsByRaw[item.raw])
			.filter((point): point is TemporalTrackPoint => point != null);
		const cumulativeMeters: number[] = [0];
		for (let index = 1; index < points.length; index += 1) {
			const previousPoint = points[index - 1];
			const point = points[index];
			cumulativeMeters[index] =
				cumulativeMeters[index - 1] +
				turfDistance([previousPoint.lng, previousPoint.lat], [point.lng, point.lat], {
					units: 'meters'
				});
		}

		cachedTrackPointSet = { points, cumulativeMeters };
		cachedTrackPointsLayerId = layerEntry.id;
		cachedTrackPointsGeojson = geojson;
		cachedTrackPointsItems = temporalItems;
		cachedTrackPointsKeySignature = keySignature;

		return cachedTrackPointSet;
	};

	const resetCameraTrackingState = () => {
		smoothedCameraCenter = null;
		smoothedCameraBearing = null;
	};

	const syncTerrainCamera = (lngLat: LngLat) => {
		if (!mapStore.getTerrain()) return;
		mapStore.setCamera(lngLat);
	};

	const resetTerrainCamera = () => {
		if (!mapStore.getTerrain()) return;
		mapStore.resetCamera();
	};

	const touchDependencies = (..._values: unknown[]) => _values;

	const getTrackingBearingBase = () => {
		const map = mapStore.getMap();
		if (smoothedCameraBearing != null) return smoothedCameraBearing;
		return map?.getBearing() ?? 0;
	};

	const getFeatureTransitionDuration = () => cameraTrackingDurationMs;

	const getRouteTransitionDuration = () => cameraTrackingDurationMs;

	const moveCameraToPoint = (
		point: { lng: number; lat: number },
		bearing: number | null,
		duration = getFeatureTransitionDuration()
	) => {
		const map = mapStore.getMap();
		if (!map) return;

		const options = {
			center: new LngLat(point.lng, point.lat),
			...(bearing != null ? { bearing } : {}),
			duration
		};

		map.flyTo(options);
	};

	const updateCameraTracking = (
		cameraPoint: { lng: number; lat: number },
		lookAtPoint: { lng: number; lat: number },
		targetBearing: number
	) => {
		const map = mapStore.getMap();
		if (!map) return;

		const center = smoothedCameraCenter ?? map.getCenter();
		const bearing = smoothedCameraBearing ?? map.getBearing();

		smoothedCameraCenter = new LngLat(
			lerp(center.lng, cameraPoint.lng, cameraCenterSmoothing),
			lerp(center.lat, cameraPoint.lat, cameraCenterSmoothing)
		);
		if (!shouldAutoBearing) {
			smoothedCameraBearing = bearing;
		} else if (getBearingDelta(bearing, targetBearing) >= cameraBearingUpdateThresholdDegrees) {
			smoothedCameraBearing = interpolateBearing(bearing, targetBearing, cameraBearingSmoothing);
		} else {
			smoothedCameraBearing = bearing;
		}

		mapStore.easeTo({
			center: smoothedCameraCenter,
			...(smoothedCameraBearing != null ? { bearing: smoothedCameraBearing } : {}),
			duration: getRouteTransitionDuration()
		});
		syncTerrainCamera(new LngLat(lookAtPoint.lng, lookAtPoint.lat));
	};

	const trackCameraAlongRoute = (index: number, segmentProgress = 0) => {
		const { points: temporalTrackPoints, cumulativeMeters } = getTemporalTrackPointSet();
		if (temporalTrackPoints.length === 0) return false;

		const currentIndex = clamp(index, 0, temporalTrackPoints.length - 1);
		const currentPoint = temporalTrackPoints[currentIndex];
		if (!currentPoint) return false;

		const nextPoint =
			temporalTrackPoints[Math.min(currentIndex + 1, temporalTrackPoints.length - 1)];
		const progress = clamp(segmentProgress, 0, 1);
		const fallbackBearing = getTrackingBearingBase();
		const nextDistanceMeters =
			cumulativeMeters[Math.min(currentIndex + 1, cumulativeMeters.length - 1)] ??
			cumulativeMeters[currentIndex] ??
			0;
		const currentDistanceBase = cumulativeMeters[currentIndex] ?? 0;
		const currentDistanceMeters = nextPoint
			? lerp(currentDistanceBase, nextDistanceMeters, progress)
			: currentDistanceBase;
		const interpolatedPoint =
			getPointAtDistance(temporalTrackPoints, cumulativeMeters, currentDistanceMeters) ??
			currentPoint;
		const lookAheadDistanceMeters = getAdaptiveLookAheadDistance(
			Math.max(nextDistanceMeters - currentDistanceBase, 0)
		);
		const lookAheadPoint = getLookAheadPoint(
			temporalTrackPoints,
			cumulativeMeters,
			currentDistanceMeters,
			lookAheadDistanceMeters
		);
		const cameraPoint =
			getPointAtDistance(
				temporalTrackPoints,
				cumulativeMeters,
				Math.max(currentDistanceMeters - cameraFollowBackDistanceMeters, 0)
			) ?? interpolatedPoint;
		const targetPoint = lookAheadPoint ?? interpolatedPoint;

		const computedBearing =
			currentPoint.bearing ??
			(targetPoint ? getBearingBetweenPoints(cameraPoint, targetPoint) : fallbackBearing);
		const targetCameraBearing = shouldAutoBearing
			? (computedBearing ?? fallbackBearing)
			: fallbackBearing;

		updateCameraTracking(cameraPoint, targetPoint, targetCameraBearing);
		return true;
	};

	// 点はその座標へ、線や面は bbox へカメラを寄せる。
	const trackCameraToFeature = (feature: Feature<AnyGeometry>) => {
		if (!feature.geometry) return;

		if (feature.geometry.type === 'Point') {
			const coordinates = feature.geometry.coordinates;
			const lngLat = new LngLat(coordinates[0], coordinates[1]);
			const rawBearing = Number(
				(feature.properties as Record<string, unknown> | null | undefined)?.angle
			);
			const bearing =
				shouldAutoBearing && !Number.isNaN(rawBearing)
					? rawBearing
					: shouldAutoBearing
						? getTrackingBearingBase()
						: null;
			moveCameraToPoint({ lng: lngLat.lng, lat: lngLat.lat }, bearing);
			syncTerrainCamera(lngLat);

			return;
		}

		if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates.length > 0) {
			const [lng, lat] = feature.geometry.coordinates[0];
			const lngLat = new LngLat(lng, lat);
			const rawBearing = Number(
				(feature.properties as Record<string, unknown> | null | undefined)?.angle
			);
			const bearing =
				shouldAutoBearing && !Number.isNaN(rawBearing)
					? rawBearing
					: shouldAutoBearing
						? getTrackingBearingBase()
						: null;
			moveCameraToPoint({ lng: lngLat.lng, lat: lngLat.lat }, bearing);
			syncTerrainCamera(lngLat);
			return;
		}

		const bbox = turfBbox(feature) as [number, number, number, number];
		mapStore.fitBounds(bbox, {
			padding: 48,
			duration: 0,
			animate: false
		});
	};

	// 現在の開始・終了インデックスから filter 式を組み立てて、
	// 表示中の実レイヤーへ命令的に適用する。
	const applyTemporalFilter = () => {
		const startValue = temporalItems[temporalFilterState.startIndex]?.raw;
		const endValue = temporalItems[temporalFilterState.endIndex]?.raw;

		let filter: FilterSpecification | null = null;
		if (temporalFilterState.enabled && temporalExpression && startValue && endValue) {
			if (isSingleStartFilterMode) {
				filter = ['==', temporalExpression, startValue] as unknown as FilterSpecification;
			} else {
				filter = [
					'all',
					['>=', temporalExpression, startValue],
					['<=', temporalExpression, endValue]
				] as unknown as FilterSpecification;
			}
		}

		// 地物クリック時のハイライト更新でも同じ時間条件を維持できるよう、
		// registry に保持している実行時 filter も同期する。
		HighlightLayerRegistry.setRuntimeFilter(layerEntry.id, filter);

		for (const layerId of targetLayerIds) {
			if (!mapStore.getLayer(layerId)) continue;
			mapStore.setFilter(layerId, filter);
		}
	};

	// レイヤー切り替え時に、entry.state に保存してある時間フィルター状態を復元する。
	const restoreTemporalFilterState = () => {
		if (restoredLayerId === layerEntry.id) return;

		const savedState = layerEntry.state?.temporalFilter;
		if (savedState && temporalItems.length > 0) {
			temporalFilterState = {
				enabled: savedState.enabled,
				startIndex: Math.min(savedState.startIndex, temporalItems.length - 1),
				endIndex: Math.min(savedState.endIndex, temporalItems.length - 1),
				mode: savedState.mode ?? 'range'
			};
		} else {
			temporalFilterState = {
				...createDefaultTemporalFilterState(),
				endIndex: Math.max(temporalItems.length - 1, 0)
			};
		}
		singleStartFilterMode = temporalFilterState.mode === 'single_start';
		cameraTrackingState = createDefaultTemporalCameraTrackingState();
		cameraTrackingModeOverride = null;
		cameraTrackingDurationMs = defaultCameraTrackingDurationMs;

		restoredLayerId = layerEntry.id;
	};

	// UI と追跡状態を初期値へ戻す。
	const resetTemporalFilter = () => {
		stopPlayback();
		cameraTrackingState = createDefaultTemporalCameraTrackingState();
		cameraTrackingModeOverride = null;
		cameraTrackingDurationMs = defaultCameraTrackingDurationMs;
		lastTrackedTarget = null;
		resetCameraTrackingState();
		temporalFilterState = {
			...createDefaultTemporalFilterState(),
			endIndex: Math.max(temporalItems.length - 1, 0)
		};
		singleStartFilterMode = false;
	};

	// 開始側が終了側を追い越したら、終了側を押し出す。
	const handleStartInput = () => {
		if (isSingleStartFilterMode) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
			return;
		}
		if (temporalFilterState.startIndex > temporalFilterState.endIndex) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
		}
	};

	// 終了側が開始側を追い越したら、開始側を押し出す。
	const handleEndInput = () => {
		if (temporalFilterState.endIndex < temporalFilterState.startIndex) {
			temporalFilterState.startIndex = temporalFilterState.endIndex;
		}
	};

	const handleRangeInput = () => {
		handleStartInput();
		handleEndInput();
	};

	const stopPlayback = () => {
		if (playbackFrameId !== null) {
			cancelAnimationFrame(playbackFrameId);
			playbackFrameId = null;
		}
		playbackLastTimestamp = null;
		isPlaying = false;
		resetCameraTrackingState();
		resetTerrainCamera();
	};

	const startPlayback = () => {
		if (temporalItems.length === 0) return;
		stopPlayback();

		if (!temporalFilterState.enabled) {
			temporalFilterState.enabled = true;
		}

		if (isSingleStartFilterMode) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
		}

		if (temporalFilterState.endIndex >= temporalItems.length - 1) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
		}

		const stepPlayback = (timestamp: number) => {
			if (playbackLastTimestamp === null) {
				playbackLastTimestamp = timestamp;
			}

			let hasAdvancedFrame = false;
			while (timestamp - playbackLastTimestamp >= playbackIntervalMs) {
				playbackLastTimestamp += playbackIntervalMs;
				if (temporalFilterState.endIndex >= temporalItems.length - 1) {
					if (loopPlayback) {
						temporalFilterState.endIndex = temporalFilterState.startIndex;
						if (isSingleStartFilterMode) {
							temporalFilterState.startIndex = temporalFilterState.endIndex;
						}
						resetCameraTrackingState();
						continue;
					}
					stopPlayback();
					return;
				}
				temporalFilterState.endIndex += 1;
				hasAdvancedFrame = true;
				if (isSingleStartFilterMode) {
					temporalFilterState.startIndex = temporalFilterState.endIndex;
				}
			}

			if (cameraTrackingState.enabled) {
				if (isRouteTrackingMode) {
					if (hasAdvancedFrame) {
						trackCameraAlongRoute(temporalFilterState.endIndex, 0);
					}
				} else if (hasAdvancedFrame) {
					const feature = getCurrentTemporalFeature();
					if (feature) {
						trackCameraToFeature(feature as Feature<AnyGeometry>);
					}
				}
			}

			if (temporalFilterState.endIndex >= temporalItems.length - 1) {
				if (loopPlayback) {
					playbackFrameId = requestAnimationFrame(stepPlayback);
					return;
				}
				stopPlayback();
				return;
			}
			playbackFrameId = requestAnimationFrame(stepPlayback);
		};

		playbackLastTimestamp = null;
		playbackFrameId = requestAnimationFrame(stepPlayback);

		isPlaying = true;
	};

	const togglePlayback = () => {
		if (isPlaying) {
			stopPlayback();
			return;
		}
		startPlayback();
	};

	// レイヤーIDまたは時刻候補数が変わったときだけ、保存済み状態の復元を試みる。
	$effect(() => {
		touchDependencies(layerEntry.id, temporalItems.length, temporalKeys.length);
		stopPlayback();
		invalidateTrackPointCache();
		restoreTemporalFilterState();
	});

	// UI で変えた時間フィルター範囲を entry.state に同期し、
	// あわせて map.setFilter() で即時反映する。
	$effect(() => {
		temporalFilterState.mode = singleStartFilterMode ? 'single_start' : 'range';
		if (singleStartFilterMode) {
			temporalFilterState.endIndex = temporalFilterState.startIndex;
		}
	});

	$effect(() => {
		if (temporalItems.length === 0) return;
		touchDependencies(
			temporalFilterState.enabled,
			temporalFilterState.startIndex,
			temporalFilterState.endIndex,
			temporalFilterState.mode,
			targetLayerIds,
			temporalExpression
		);
		const currentTemporalFilter = layerEntry.state?.temporalFilter;

		if (
			!currentTemporalFilter ||
			currentTemporalFilter.enabled !== temporalFilterState.enabled ||
			currentTemporalFilter.startIndex !== temporalFilterState.startIndex ||
			currentTemporalFilter.endIndex !== temporalFilterState.endIndex
		) {
			layerEntry.state = {
				...layerEntry.state,
				temporalFilter: { ...temporalFilterState }
			};
		}
		applyTemporalFilter();
	});

	// カメラ追跡は、同じレイヤー・同じ時刻に対しては再実行しない。
	// 追跡対象が変わったときだけ移動する。
	$effect(() => {
		if (
			!canTrackCamera ||
			!cameraTrackingState.enabled ||
			!temporalFilterState.enabled ||
			temporalItems.length === 0
		) {
			lastTrackedTarget = null;
			resetCameraTrackingState();
			resetTerrainCamera();
			return;
		}
		touchDependencies(activeTemporalIndex);
		const currentValue = temporalItems[activeTemporalIndex]?.raw;
		if (!currentValue) return;
		const nextTrackedTarget = `${layerEntry.id}:${currentValue}`;
		if (lastTrackedTarget === nextTrackedTarget) return;
		lastTrackedTarget = nextTrackedTarget;
		if (isPlaying) return;
		if (isRouteTrackingMode && trackCameraAlongRoute(activeTemporalIndex, 0)) {
			return;
		}
		const feature = getCurrentTemporalFeature();
		if (!feature) return;
		trackCameraToFeature(feature as Feature<AnyGeometry>);
	});

	$effect(() => {
		touchDependencies(temporalItems.length, activeTemporalIndex, loopPlayback);
		if (
			temporalItems.length === 0 ||
			(!loopPlayback && activeTemporalIndex >= temporalItems.length - 1)
		) {
			stopPlayback();
		}
	});

	onDestroy(() => {
		stopPlayback();
	});
</script>

{#if temporalConfig}
	<Accordion
		label="時間フィルター"
		icon="mdi:timeline-clock-outline"
		bind:value={showDimensionOption}
	>
		{#if temporalItems.length > 0}
			<div class="flex flex-col w-full">
				<Switch label="時間フィルターを有効化" bind:value={temporalFilterState.enabled} />
				{#if temporalFilterState.enabled}
					<div transition:slide class="flex flex-col w-full">
						{#if canTrackCamera}
							<Switch label="カメラ追跡" bind:value={cameraTrackingState.enabled} />
							{#if cameraTrackingState.enabled}
								<div class="mt-2 rounded-lg bg-black/20 p-3">
									<div class="mb-2 text-xs text-white/70">追跡方法</div>
									<div class="flex gap-2">
										<button
											type="button"
											class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${
												activeCameraTrackingMode === 'feature'
													? 'bg-main-accent text-white'
													: 'bg-sub text-white hover:bg-white/10'
											}`}
											aria-pressed={activeCameraTrackingMode === 'feature'}
											onclick={() => {
												cameraTrackingModeOverride = 'feature';
												resetCameraTrackingState();
												lastTrackedTarget = null;
											}}
										>
											点ごと
										</button>
										<button
											type="button"
											class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${
												activeCameraTrackingMode === 'route'
													? 'bg-main-accent text-white'
													: 'bg-sub text-white hover:bg-white/10'
											}`}
											aria-pressed={activeCameraTrackingMode === 'route'}
											onclick={() => {
												cameraTrackingModeOverride = 'route';
												resetCameraTrackingState();
												lastTrackedTarget = null;
											}}
										>
											ルート
										</button>
										<button
											type="button"
											class={`cursor-pointer rounded-full px-4 py-1 text-sm transition-colors ${
												activeCameraTrackingMode === 'route_auto_bearing'
													? 'bg-main-accent text-white'
													: 'bg-sub text-white hover:bg-white/10'
											}`}
											aria-pressed={activeCameraTrackingMode === 'route_auto_bearing'}
											onclick={() => {
												cameraTrackingModeOverride = 'route_auto_bearing';
												resetCameraTrackingState();
												lastTrackedTarget = null;
											}}
										>
											自動角度ルート
										</button>
									</div>
									<div class="mb-2 text-xs text-white/70">
										{activeCameraTrackingMode === 'route_auto_bearing'
											? 'ルート追跡しながら進行方向へ自動で角度を合わせます。'
											: isRouteTrackingMode
												? 'ルート追跡で移動します。'
												: '各時点の地物へ移動します。'}
									</div>
									<RangeSlider
										label="移動時間"
										bind:value={cameraTrackingDurationMs}
										min={80}
										max={800}
										step={10}
										isInt={true}
									/>
									<div class="mt-[-8px] pb-2 text-right text-xs text-white/70">
										短いほど速くなります
									</div>
								</div>
							{/if}
						{/if}
						<Switch label="開始時刻のみで絞る" bind:value={singleStartFilterMode} />
						{#if !isSingleStartFilterMode}
							<RangeSliderDouble
								label="時間範囲"
								lowerLabel="開始"
								upperLabel="終了"
								lowerDisplayValue={temporalItems[temporalFilterState.startIndex]?.label}
								upperDisplayValue={temporalItems[temporalFilterState.endIndex]?.label}
								min={0}
								max={Math.max(temporalItems.length - 1, 0)}
								step={1}
								bind:lowerValue={temporalFilterState.startIndex}
								bind:upperValue={temporalFilterState.endIndex}
								onChange={handleRangeInput}
								disabled={!temporalFilterState.enabled}
							/>
						{:else}
							<RangeSlider
								label="開始"
								min={0}
								max={Math.max(temporalItems.length - 1, 0)}
								step={1}
								isInt={true}
								showValue={false}
								bind:value={temporalFilterState.startIndex}
								onInput={handleStartInput}
								disabled={!temporalFilterState.enabled}
							/>
							<div class="mt-[-8px] pb-4 text-right text-sm text-white">
								{temporalItems[temporalFilterState.startIndex]?.label}
							</div>
						{/if}

						<div class="mt-4 flex items-center justify-center gap-3">
							<button
								onclick={togglePlayback}
								class="bg-sub flex w-[200px] cursor-pointer items-center justify-center gap-1 rounded-full p-1 text-sm text-white select-none hover:bg-white/10"
								aria-label={isPlaying ? '停止' : '再生'}
								disabled={temporalItems.length === 0}
							>
								{#if isPlaying}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
									>
										<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
									</svg>
									停止
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
									>
										<path fill="currentColor" d="M8 5v14l11-7z" />
									</svg>
									再生
								{/if}
							</button>
							<button
								type="button"
								onclick={() => {
									loopPlayback = !loopPlayback;
								}}
								class="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-4 py-1 text-sm text-white transition-colors duration-150 select-none {loopPlayback
									? 'bg-main-accent'
									: 'bg-sub hover:bg-white/10'}"
								aria-pressed={loopPlayback}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
									<path
										fill="currentColor"
										d="M17 17H7v-3l-4 4l4 4v-3h12a2 2 0 0 0 2-2v-4h-2zm0-10H5a2 2 0 0 0-2 2v4h2V9h10v3l4-4l-4-4z"
									/>
								</svg>
								ループ
							</button>
						</div>

						<div class="m-4">
							<RangeSlider
								label="再生速度"
								min={1}
								max={2000}
								step={1}
								isInt={true}
								bind:value={playbackSpeed}
							/>
						</div>

						<!-- <div class="m-2 flex items-center justify-center">
							<button
								onclick={resetTemporalFilter}
								class="c-btn-sub cursor-pointer p-3 text-sm select-none"
							>
								時間フィルターをリセット
							</button>
						</div> -->
					</div>
				{/if}
			</div>
		{:else}
			<div class="rounded-lg bg-black/20 p-3 text-base/80 text-sm">
				時間フィールドは設定されていますが、利用できる日時データが見つかりません。
			</div>
		{/if}
	</Accordion>
{/if}
