import type { ProjectedModelGeoreference } from '$routes/map/data/types/model';
import { getProjContext, isValidEpsg } from '$routes/map/utils/proj/dict';
import { ensureProjNadgridsReady } from '$routes/map/utils/proj/nadgrid';
import proj4 from 'proj4';
import * as THREE from 'three';

const CENTIMETERS_PER_METER = 100;
const MIN_PROJECTED_WORLD_OFFSET_METERS = 10_000;
const MAX_PROJECTED_WORLD_OFFSET_METERS = 1_000_000;
const MIN_PROJECTED_OFFSET_RATIO = 20;

export type ModelCoordinateMode = 'local' | 'projected';

/**
 * Mago 3D Tiler に CRS を渡すべき、平面直角座標らしい入力範囲かを判定する。
 * EPSG 自体はファイルから確定できないため、この結果はゾーン選択の表示にだけ使う。
 */
export const getModelCoordinateMode = (
	bbox: [number, number, number, number] | null
): ModelCoordinateMode => {
	if (!bbox || bbox.some((value) => !Number.isFinite(value))) return 'local';

	const [minX, minY, maxX, maxY] = bbox;
	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;
	const maxAbsPlanarOffset = Math.max(Math.abs(centerX), Math.abs(centerY));
	const maxPlanarExtent = Math.max(Math.abs(maxX - minX), Math.abs(maxY - minY));
	const offsetRatio = maxPlanarExtent > 1e-6 ? maxAbsPlanarOffset / maxPlanarExtent : 0;

	return maxAbsPlanarOffset >= MIN_PROJECTED_WORLD_OFFSET_METERS &&
		maxAbsPlanarOffset <= MAX_PROJECTED_WORLD_OFFSET_METERS &&
		offsetRatio >= MIN_PROJECTED_OFFSET_RATIO
		? 'projected'
		: 'local';
};

const ensureProjDefinition = (epsg: string) => {
	const normalized = epsg.replace(/^EPSG:/i, '');
	if (!isValidEpsg(normalized)) {
		throw new Error(`未対応のEPSGコードです: ${epsg}`);
	}

	const epsgName = `EPSG:${normalized}`;
	const projContext = getProjContext(normalized);
	if (!proj4.defs(epsgName)) {
		proj4.defs(epsgName, projContext);
	}

	return { epsgName, projContext };
};

export interface ResolvedProjectedModelPlacement {
	lng: number;
	lat: number;
	altitude: number;
	georeference: ProjectedModelGeoreference;
}

export const getModelUnitScaleMeters = (unitScaleFactor?: number) => {
	const resolvedUnitScaleFactor =
		typeof unitScaleFactor === 'number' && Number.isFinite(unitScaleFactor)
			? unitScaleFactor
			: null;

	if (resolvedUnitScaleFactor == null || resolvedUnitScaleFactor === 0) {
		return 1;
	}

	return Math.abs(resolvedUnitScaleFactor) / CENTIMETERS_PER_METER;
};

export const resolveFbxUnitScaleMeters = (box: THREE.Box3, unitScaleFactor?: number) => {
	const metadataUnitScaleMeters = getModelUnitScaleMeters(unitScaleFactor);
	if (box.isEmpty()) {
		return metadataUnitScaleMeters;
	}

	const center = box.getCenter(new THREE.Vector3());
	const size = box.getSize(new THREE.Vector3());
	const maxAbsPlanarOffset = Math.max(Math.abs(center.x), Math.abs(center.y));
	const maxPlanarExtent = Math.max(size.x, size.y);
	const offsetRatio = maxPlanarExtent > 1e-6 ? maxAbsPlanarOffset / maxPlanarExtent : 0;

	// 一部のFBXは unitScaleFactor=1 を持ちながら、座標値自体はすでに meter の
	// 平面直角座標になっている。大きな世界座標オフセットを持つ場合は縮尺を上書きする。
	const looksLikeProjectedMeterCoordinates = metadataUnitScaleMeters < 1
		&& maxAbsPlanarOffset >= MIN_PROJECTED_WORLD_OFFSET_METERS
		&& maxAbsPlanarOffset <= MAX_PROJECTED_WORLD_OFFSET_METERS
		&& offsetRatio >= MIN_PROJECTED_OFFSET_RATIO;

	return looksLikeProjectedMeterCoordinates ? 1 : metadataUnitScaleMeters;
};

export const resolveProjectedModelPlacementFromBox = async (
	box: THREE.Box3,
	epsg: string,
	unitScaleMeters = 1,
	coordinateSpace: ProjectedModelGeoreference['coordinateSpace'] = 'object'
): Promise<ResolvedProjectedModelPlacement> => {
	if (box.isEmpty()) {
		throw new Error('3Dモデルの範囲を取得できませんでした');
	}

	const center = box.getCenter(new THREE.Vector3());
	const projectedOrigin: [number, number, number] = [center.x, center.y, box.min.z];
	const { epsgName, projContext } = ensureProjDefinition(epsg);
	await ensureProjNadgridsReady(projContext);
	const [lng, lat] = proj4(epsgName, 'EPSG:4326', [
		projectedOrigin[0] * unitScaleMeters,
		projectedOrigin[1] * unitScaleMeters
	]) as [number, number];

	return {
		lng,
		lat,
		altitude: projectedOrigin[2] * unitScaleMeters,
		georeference: {
			type: 'projected',
			epsg: epsgName.replace(/^EPSG:/i, ''),
			projectedOrigin,
			unitScaleMeters,
			coordinateSpace
		}
	};
};

export const applyProjectedModelGeoreference = (
	object: THREE.Object3D,
	georeference: ProjectedModelGeoreference
) => {
	const [originX, originY, originZ] = georeference.projectedOrigin;
	const unitScaleMeters = georeference.unitScaleMeters ?? 1;

	if (georeference.coordinateSpace === 'root-children') {
		getProjectedModelCoordinateRoots(object).forEach((child) => {
			// GLB のルート変換は T * R * S で適用される。入力座標系で原点を引くには、
			// 平行移動へ回転・縮尺済みのオフセットを反映する必要がある。
			const offset = new THREE.Vector3(originX, originY, originZ)
				.multiply(child.scale)
				.applyQuaternion(child.quaternion);
			child.position.sub(offset);
		});
	} else if (georeference.coordinateSpace === 'ifc-z-up') {
		const offset = new THREE.Vector3(originX, originZ, -originY);
		getProjectedModelCoordinateRoots(object).forEach((child) => {
			child.position.sub(offset);
		});
	} else {
		object.position.x -= originX;
		object.position.y -= originY;
		object.position.z -= originZ;
	}

	if (unitScaleMeters !== 1) {
		object.scale.multiplyScalar(unitScaleMeters);
	}

	object.updateMatrixWorld(true);
};

export const getProjectedModelCoordinateRoots = (object: THREE.Object3D) =>
	object.children.length > 0 ? object.children : [object];

export const georeferenceCornerToLocal = (
	corner: THREE.Vector3,
	georeference: ProjectedModelGeoreference
) => {
	const [originX, originY, originZ] = georeference.projectedOrigin;
	const unitScaleMeters = georeference.unitScaleMeters ?? 1;

	return new THREE.Vector3(
		(corner.x - originX) * unitScaleMeters,
		(corner.y - originY) * unitScaleMeters,
		(corner.z - originZ) * unitScaleMeters
	);
};
