import type {
	GeoJsonMetaData,
	MorivisVectorEntry,
	TileMetaData
} from '$routes/map/data/types/vector';
import type { VectorTemporalItem } from '$routes/map/data/types/vector/properties';
import type { Feature } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { LngLat } from '$routes/map/utils/maplibre';
import { mapStore } from '$routes/stores/map';
import turfBbox from '@turf/bbox';
import turfDistance from '@turf/distance';
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
	from: { lng: number; lat: number; },
	to: { lng: number; lat: number; }
) => {
	const fromLat = (from.lat * Math.PI) / 180;
	const toLat = (to.lat * Math.PI) / 180;
	const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
	const y = Math.sin(deltaLng) * Math.cos(toLat);
	const x = Math.cos(fromLat) * Math.sin(toLat)
		- Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

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
		const segmentProgress = segmentDistance > 0
			? (targetDistanceMeters - previousDistance) / segmentDistance
			: 0;

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
		Math.abs(lookAheadPoint.lng - points[points.length - 1].lng) < 1e-9
		&& Math.abs(lookAheadPoint.lat - points[points.length - 1].lat) < 1e-9
		&& currentDistanceMeters >= cumulativeMeters[cumulativeMeters.length - 1]
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

interface TrackingOptions {
	getEntry: () => MorivisVectorEntry<GeoJsonMetaData | TileMetaData>;
	getItems: () => VectorTemporalItem[];
	getKeys: () => string[];
	getIndex: () => number;
	getAutoBearing: () => boolean;
	getDuration: () => number;
}

/** UIごとに追跡キャッシュと補間状態を持つ。entryには描画中の状態を保存しない。 */
export const createTemporalCameraTracker = (
	{ getEntry, getItems, getKeys, getIndex, getAutoBearing, getDuration }: TrackingOptions
) => {
	let smoothedCameraCenter: LngLat | null = null;
	let smoothedCameraBearing: number | null = null;
	let cachedTrackPointsLayerId: string | null = null;
	let cachedTrackPointsGeojson: unknown = null;
	let cachedTrackPointsItems: VectorTemporalItem[] | null = null;
	let cachedTrackPointsKeySignature = '';
	let cachedTrackPointSet: TemporalTrackPointSet = { points: [], cumulativeMeters: [] };
	// 1フィーチャーから、時間比較に使う文字列値を取り出す。
	const getFeatureTemporalValue = (properties: Record<string, unknown> | null | undefined) => {
		if (!properties) return null;

		for (const key of getKeys()) {
			const value = properties[key];
			if (value == null || String(value) === '') continue;
			return String(value);
		}

		return null;
	};

	// カメラ追跡用に、現在の終了時刻に対応するフィーチャーを1件拾う。
	const getCurrentTemporalFeature = () => {
		if (!(getEntry().format.type === 'geojson')) return null;

		const currentValue = getItems()[getIndex()]?.raw;
		if (!currentValue) return null;

		const geojson = GeojsonCache.get(getEntry().id);
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
				raw: getFeatureTemporalValue(
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
				raw: getFeatureTemporalValue(
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
		if (!(getEntry().format.type === 'geojson') || getItems().length === 0) {
			return { points: [], cumulativeMeters: [] } as TemporalTrackPointSet;
		}

		const geojson = GeojsonCache.get(getEntry().id);
		if (!geojson) return { points: [], cumulativeMeters: [] } as TemporalTrackPointSet;

		const keySignature = getKeys().join('|');
		if (
			cachedTrackPointsLayerId === getEntry().id
			&& cachedTrackPointsGeojson === geojson
			&& cachedTrackPointsItems === getItems()
			&& cachedTrackPointsKeySignature === keySignature
		) {
			return cachedTrackPointSet;
		}

		const pointsByRaw: Record<string, TemporalTrackPoint> = {};
		for (const feature of geojson.features) {
			const trackPoint = getFeatureTrackingPoint(feature as Feature<AnyGeometry>);
			if (!trackPoint || trackPoint.raw === '' || pointsByRaw[trackPoint.raw]) continue;
			pointsByRaw[trackPoint.raw] = trackPoint;
		}

		const points = getItems()
			.map((item) => pointsByRaw[item.raw])
			.filter((point): point is TemporalTrackPoint => point != null);
		const cumulativeMeters: number[] = [0];
		for (let index = 1; index < points.length; index += 1) {
			const previousPoint = points[index - 1];
			const point = points[index];
			cumulativeMeters[index] = cumulativeMeters[index - 1]
				+ turfDistance([previousPoint.lng, previousPoint.lat], [point.lng, point.lat], {
					units: 'meters'
				});
		}

		cachedTrackPointSet = { points, cumulativeMeters };
		cachedTrackPointsLayerId = getEntry().id;
		cachedTrackPointsGeojson = geojson;
		cachedTrackPointsItems = getItems();
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

	const getTrackingBearingBase = () => {
		const map = mapStore.getMap();
		if (smoothedCameraBearing != null) return smoothedCameraBearing;
		return map?.getBearing() ?? 0;
	};

	const getFeatureTransitionDuration = () => getDuration();

	const getRouteTransitionDuration = () => getDuration();

	const moveCameraToPoint = (
		point: { lng: number; lat: number; },
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
		cameraPoint: { lng: number; lat: number; },
		lookAtPoint: { lng: number; lat: number; },
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
		if (!getAutoBearing()) {
			smoothedCameraBearing = bearing;
		} else if (getBearingDelta(bearing, targetBearing) >= cameraBearingUpdateThresholdDegrees) {
			smoothedCameraBearing = interpolateBearing(
				bearing,
				targetBearing,
				cameraBearingSmoothing
			);
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
			cumulativeMeters[Math.min(currentIndex + 1, cumulativeMeters.length - 1)]
				?? cumulativeMeters[currentIndex]
				?? 0;
		const currentDistanceBase = cumulativeMeters[currentIndex] ?? 0;
		const currentDistanceMeters = nextPoint
			? lerp(currentDistanceBase, nextDistanceMeters, progress)
			: currentDistanceBase;
		const interpolatedPoint =
			getPointAtDistance(temporalTrackPoints, cumulativeMeters, currentDistanceMeters)
				?? currentPoint;
		const lookAheadDistanceMeters = getAdaptiveLookAheadDistance(
			Math.max(nextDistanceMeters - currentDistanceBase, 0)
		);
		const lookAheadPoint = getLookAheadPoint(
			temporalTrackPoints,
			cumulativeMeters,
			currentDistanceMeters,
			lookAheadDistanceMeters
		);
		const cameraPoint = getPointAtDistance(
			temporalTrackPoints,
			cumulativeMeters,
			Math.max(currentDistanceMeters - cameraFollowBackDistanceMeters, 0)
		) ?? interpolatedPoint;
		const targetPoint = lookAheadPoint ?? interpolatedPoint;

		const computedBearing = currentPoint.bearing
			?? (targetPoint ? getBearingBetweenPoints(cameraPoint, targetPoint) : fallbackBearing);
		const targetCameraBearing = getAutoBearing()
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
			const bearing = getAutoBearing() && !Number.isNaN(rawBearing)
				? rawBearing
				: getAutoBearing()
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
			const bearing = getAutoBearing() && !Number.isNaN(rawBearing)
				? rawBearing
				: getAutoBearing()
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

	const trackCurrentFeature = () => {
		const feature = getCurrentTemporalFeature();
		if (feature) trackCameraToFeature(feature as Feature<AnyGeometry>);
	};
	return {
		trackCurrentFeature,
		trackRoute: trackCameraAlongRoute,
		reset: resetCameraTrackingState,
		resetTerrain: resetTerrainCamera,
		invalidate: invalidateTrackPointCache
	};
};
