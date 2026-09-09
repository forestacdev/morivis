import type { ModelLocalBounds, ModelTransformStyle } from '$routes/map/data/types/model';
import { MercatorCoordinate } from '$routes/map/utils/maplibre';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import * as THREE from 'three';

export type ModelScaleHandleKey =
	| 'min-min-min'
	| 'min-min-max'
	| 'min-max-min'
	| 'min-max-max'
	| 'max-min-min'
	| 'max-min-max'
	| 'max-max-min'
	| 'max-max-max';

export interface ModelScaleHandle {
	key: ModelScaleHandleKey;
	position: [number, number, number];
}

export type ModelPlacementTransform = ModelTransformStyle['transform'];

const OPPOSITE_HANDLE: Record<ModelScaleHandleKey, ModelScaleHandleKey> = {
	'min-min-min': 'max-max-max',
	'min-min-max': 'max-max-min',
	'min-max-min': 'max-min-max',
	'min-max-max': 'max-min-min',
	'max-min-min': 'min-max-max',
	'max-min-max': 'min-max-min',
	'max-max-min': 'min-min-max',
	'max-max-max': 'min-min-min'
};

export const getModelScaleHandles = (localBounds: ModelLocalBounds): ModelScaleHandle[] => {
	const [minX, minY, minZ, maxX, maxY, maxZ] = localBounds;
	return [
		{ key: 'min-min-min', position: [minX, minY, minZ] },
		{ key: 'min-min-max', position: [minX, minY, maxZ] },
		{ key: 'min-max-min', position: [minX, maxY, minZ] },
		{ key: 'min-max-max', position: [minX, maxY, maxZ] },
		{ key: 'max-min-min', position: [maxX, minY, minZ] },
		{ key: 'max-min-max', position: [maxX, minY, maxZ] },
		{ key: 'max-max-min', position: [maxX, maxY, minZ] },
		{ key: 'max-max-max', position: [maxX, maxY, maxZ] }
	] as ModelScaleHandle[];
};

export const getOppositeModelScaleHandle = (
	localBounds: ModelLocalBounds,
	handleKey: ModelScaleHandleKey
): ModelScaleHandle => {
	const oppositeKey = OPPOSITE_HANDLE[handleKey];
	const opposite = getModelScaleHandles(localBounds).find(({ key }) => key === oppositeKey);
	if (!opposite) throw new Error(`Opposite model scale handle not found: ${handleKey}`);
	return opposite;
};

export const getModelScaleFromHandleDrag = ({
	currentDistance,
	startDistance,
	startScale
}: {
	currentDistance: number;
	startDistance: number;
	startScale: number;
}): number => {
	if (
		!Number.isFinite(currentDistance)
		|| !Number.isFinite(startDistance)
		|| !Number.isFinite(startScale)
		|| startDistance <= Number.EPSILON
	) {
		return startScale;
	}

	const scale = startScale * (currentDistance / startDistance);
	return Number.isFinite(scale) ? scale : startScale;
};

const getEffectiveAltitude = (transform: ModelPlacementTransform, terrainEnabled: boolean) =>
	(terrainEnabled ? transform.altitude : 0) + (transform.heightOffset ?? 0);

const offsetTransformAnchor = (
	transform: ModelPlacementTransform,
	offset: THREE.Vector3,
	terrainEnabled: boolean
): ModelPlacementTransform => {
	const anchor = MercatorCoordinate.fromLngLat(
		{ lng: transform.lng, lat: transform.lat },
		getEffectiveAltitude(transform, terrainEnabled)
	);
	const movedAnchor = new MercatorCoordinate(
		anchor.x + offset.x,
		anchor.y + offset.y,
		anchor.z + offset.z
	);
	const lngLat = movedAnchor.toLngLat();
	const effectiveAltitude = movedAnchor.toAltitude();

	return {
		...transform,
		lng: lngLat.lng,
		lat: lngLat.lat,
		...(terrainEnabled
			? { altitude: effectiveAltitude - (transform.heightOffset ?? 0) }
			: { heightOffset: effectiveAltitude })
	};
};

export const preserveModelLocalPointPosition = ({
	fixedLocalPosition,
	nextTransform,
	startTransform,
	terrainEnabled
}: {
	fixedLocalPosition: [number, number, number];
	nextTransform: ModelPlacementTransform;
	startTransform: ModelPlacementTransform;
	terrainEnabled: boolean;
}): ModelPlacementTransform => {
	const localPoint = new THREE.Vector3(...fixedLocalPosition);
	const fixedWorldPosition = localPoint
		.clone()
		.applyMatrix4(buildMercatorModelMatrix(startTransform, terrainEnabled));
	let result = { ...nextTransform };

	// 緯度が変わるとメートル換算係数も変わるため、支点誤差を数回収束させる。
	for (let index = 0; index < 4; index += 1) {
		const nextWorldPosition = localPoint
			.clone()
			.applyMatrix4(buildMercatorModelMatrix(result, terrainEnabled));
		result = offsetTransformAnchor(
			result,
			fixedWorldPosition.clone().sub(nextWorldPosition),
			terrainEnabled
		);
	}

	return result;
};
