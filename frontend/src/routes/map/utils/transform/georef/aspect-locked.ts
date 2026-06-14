import { MercatorCoordinate } from 'maplibre-gl';

import type { GeoRefCorners } from './homography';

export type GeoRefCornerKey = 'nw' | 'ne' | 'se' | 'sw';

type Point = [number, number];

const CORNER_INDEX: Record<GeoRefCornerKey, number> = {
	nw: 0,
	ne: 1,
	se: 2,
	sw: 3
};

const OPPOSITE_CORNER: Record<GeoRefCornerKey, GeoRefCornerKey> = {
	nw: 'se',
	ne: 'sw',
	se: 'nw',
	sw: 'ne'
};

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const distanceSq = (a: Point, b: Point): number => {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	return dx * dx + dy * dy;
};

const resolveDiagonalCorners = (
	diagonalStart: Point,
	diagonalEnd: Point,
	aspectRatio: number,
	sign: 1 | -1
): GeoRefCorners => {
	const diagonal = sub(diagonalEnd, diagonalStart);
	const length = Math.hypot(diagonal[0], diagonal[1]);

	if (length < 1e-9 || aspectRatio <= 0) {
		return [
			[diagonalStart[0], diagonalStart[1]],
			[diagonalStart[0], diagonalStart[1]],
			[diagonalEnd[0], diagonalEnd[1]],
			[diagonalStart[0], diagonalStart[1]]
		];
	}

	const ex = diagonal[0] / length;
	const ey = diagonal[1] / length;
	const px = -ey;
	const py = ex;
	const ratio2 = aspectRatio * aspectRatio + 1;

	const widthVector: Point = [
		(length / ratio2) * (aspectRatio * aspectRatio * ex + sign * aspectRatio * px),
		(length / ratio2) * (aspectRatio * aspectRatio * ey + sign * aspectRatio * py)
	];
	const heightVector: Point = [
		(length / ratio2) * (ex - sign * aspectRatio * px),
		(length / ratio2) * (ey - sign * aspectRatio * py)
	];

	return [
		[diagonalStart[0], diagonalStart[1]],
		add(diagonalStart, widthVector),
		[diagonalEnd[0], diagonalEnd[1]],
		add(diagonalStart, heightVector)
	];
};

const resolveAntiDiagonalCorners = (
	diagonalStart: Point,
	diagonalEnd: Point,
	aspectRatio: number,
	sign: 1 | -1
): GeoRefCorners => {
	const diagonal = sub(diagonalEnd, diagonalStart);
	const length = Math.hypot(diagonal[0], diagonal[1]);

	if (length < 1e-9 || aspectRatio <= 0) {
		return [
			[diagonalStart[0], diagonalStart[1]],
			[diagonalEnd[0], diagonalEnd[1]],
			[diagonalEnd[0], diagonalEnd[1]],
			[diagonalStart[0], diagonalStart[1]]
		];
	}

	const ex = diagonal[0] / length;
	const ey = diagonal[1] / length;
	const px = -ey;
	const py = ex;
	const ratio2 = aspectRatio * aspectRatio + 1;

	const widthVector: Point = [
		(length / ratio2) * (aspectRatio * aspectRatio * ex + sign * aspectRatio * px),
		(length / ratio2) * (aspectRatio * aspectRatio * ey + sign * aspectRatio * py)
	];
	const heightVector: Point = [
		(length / ratio2) * (-ex + sign * aspectRatio * px),
		(length / ratio2) * (-ey + sign * aspectRatio * py)
	];

	const sw = diagonalStart;
	const ne = diagonalEnd;
	const nw = sub(sw, heightVector);
	const se = add(sw, widthVector);

	return [
		[nw[0], nw[1]],
		[ne[0], ne[1]],
		[se[0], se[1]],
		[sw[0], sw[1]]
	];
};

const chooseBetterCandidate = (
	currentCorners: GeoRefCorners,
	candidateA: GeoRefCorners,
	candidateB: GeoRefCorners
): GeoRefCorners => {
	const score = (corners: GeoRefCorners) =>
		corners.reduce((sum, point, index) => sum + distanceSq(point, currentCorners[index]), 0);

	return score(candidateA) <= score(candidateB) ? candidateA : candidateB;
};

export const applyAspectLockedPlaneDrag = (
	currentCorners: GeoRefCorners,
	draggedCorner: GeoRefCornerKey,
	draggedPosition: Point,
	aspectRatio: number
): GeoRefCorners => {
	if (aspectRatio <= 0) return currentCorners;

	const nextCorners = currentCorners.map((point) => [point[0], point[1]] as Point) as GeoRefCorners;
	nextCorners[CORNER_INDEX[draggedCorner]] = [draggedPosition[0], draggedPosition[1]];

	const oppositeCorner = OPPOSITE_CORNER[draggedCorner];
	const fixedPoint = currentCorners[CORNER_INDEX[oppositeCorner]];

	if (draggedCorner === 'nw' || draggedCorner === 'se') {
		const diagonalStart = draggedCorner === 'nw' ? draggedPosition : fixedPoint;
		const diagonalEnd = draggedCorner === 'nw' ? fixedPoint : draggedPosition;
		return chooseBetterCandidate(
			currentCorners,
			resolveDiagonalCorners(diagonalStart, diagonalEnd, aspectRatio, 1),
			resolveDiagonalCorners(diagonalStart, diagonalEnd, aspectRatio, -1)
		);
	}

	const diagonalStart = draggedCorner === 'sw' ? draggedPosition : fixedPoint;
	const diagonalEnd = draggedCorner === 'sw' ? fixedPoint : draggedPosition;
	return chooseBetterCandidate(
		currentCorners,
		resolveAntiDiagonalCorners(diagonalStart, diagonalEnd, aspectRatio, 1),
		resolveAntiDiagonalCorners(diagonalStart, diagonalEnd, aspectRatio, -1)
	);
};

const projectToMercatorPlane = (point: Point): Point => {
	const mercator = MercatorCoordinate.fromLngLat({ lng: point[0], lat: point[1] });
	return [mercator.x, mercator.y];
};

const unprojectFromMercatorPlane = (point: Point): Point => {
	const lngLat = new MercatorCoordinate(point[0], point[1], 0).toLngLat();
	return [lngLat.lng, lngLat.lat];
};

export const applyAspectLockedGeoRefDrag = (
	currentCorners: GeoRefCorners,
	draggedCorner: GeoRefCornerKey,
	draggedPosition: Point,
	aspectRatio: number
): GeoRefCorners => {
	const mercatorCorners = currentCorners.map((point) => projectToMercatorPlane(point)) as GeoRefCorners;
	const mercatorDraggedPosition = projectToMercatorPlane(draggedPosition);
	const nextMercatorCorners = applyAspectLockedPlaneDrag(
		mercatorCorners,
		draggedCorner,
		mercatorDraggedPosition,
		aspectRatio
	);

	return nextMercatorCorners.map((point) => unprojectFromMercatorPlane(point)) as GeoRefCorners;
};

export const measureMercatorAspectRatio = (corners: GeoRefCorners): number => {
	const localCorners = corners.map((point) => projectToMercatorPlane(point)) as GeoRefCorners;
	const width = Math.hypot(
		localCorners[1][0] - localCorners[0][0],
		localCorners[1][1] - localCorners[0][1]
	);
	const height = Math.hypot(
		localCorners[3][0] - localCorners[0][0],
		localCorners[3][1] - localCorners[0][1]
	);

	return height === 0 ? 1 : width / height;
};

export const getGeoRefAspectRatio = (width: number, height: number): number =>
	height === 0 ? 1 : width / height;
