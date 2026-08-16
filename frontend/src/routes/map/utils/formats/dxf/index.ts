import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import DxfParser from 'dxf-parser';

type DxfHeader = Record<string, unknown>;
type DxfPointLike = { x?: unknown; y?: unknown; z?: unknown };
type DxfPoint = { x: number; y: number; z?: number };

const DXF_INSUNITS_TO_METERS: Record<number, number> = {
	0: 1,
	1: 0.0254,
	2: 0.3048,
	3: 1609.344,
	4: 0.001,
	5: 0.01,
	6: 1,
	7: 1000,
	8: 2.54e-8,
	9: 2.54e-5,
	10: 0.9144,
	11: 1e-10,
	12: 1e-9,
	13: 1e-6,
	14: 0.1,
	15: 10,
	16: 100,
	17: 1e9,
	18: 149597870700,
	19: 9.4607304725808e15,
	20: 3.085677581491367e16,
	21: 1200 / 3937,
	22: 100 / 3937,
	23: 3600 / 3937,
	24: 6336000 / 3937
};

/**
 * DXFファイルの内容をGeoJSONに変換
 */
export const dxfToGeoJson = (dxfText: string): FeatureCollection => {
	const parser = new DxfParser();
	const dxf = parser.parseSync(dxfText);

	if (!dxf) {
		throw new Error('DXFの解析に失敗しました');
	}

	const unitScaleFactor = getDxfUnitScaleFactor((dxf as { header?: DxfHeader; }).header);
	const features: Feature[] = [];

	dxf.entities.forEach((entity: any) => {
		const feature = entityToFeature(entity, unitScaleFactor);
		if (feature) {
			features.push(feature);
		}
	});

	return {
		type: 'FeatureCollection',
		features
	};
};

/**
 * DXFエンティティをGeoJSON Featureに変換
 */
const entityToFeature = (entity: any, unitScaleFactor: number): Feature | null => {
	let geometry: AnyGeometry | null = null;
	const colorHex = entity.color != null
		? `#${(entity.color as number).toString(16).padStart(6, '0')}`
		: undefined;
	const properties: Record<string, any> = {
		layer: entity.layer,
		color: colorHex,
		type: entity.type
	};

	switch (entity.type) {
		case 'POINT':
			if (isDxfPointLike(entity.position)) {
				geometry = createPointGeometry(toCoordinate(entity.position));
			}
			break;

		case 'LINE': {
			const vertices: DxfPoint[] = Array.isArray(entity.vertices)
				? entity.vertices.filter(isDxfPointLike)
				: [];
			const force3d = vertices.some(hasExplicitZ);
			geometry = createLineStringGeometry(
				vertices.map((vertex) => toCoordinate(vertex, { force3d }))
			);
			break;
		}

		case 'LWPOLYLINE':
		case 'POLYLINE': {
			const vertices: DxfPoint[] = Array.isArray(entity.vertices)
				? entity.vertices.filter(isDxfPointLike)
				: [];
			const force3d = vertices.some(hasExplicitZ)
				|| (isFiniteCoordinate(entity.elevation) && entity.elevation !== 0);
			const fallbackZ = isFiniteCoordinate(entity.elevation) ? entity.elevation : 0;
			const coordinates = vertices.map((vertex) =>
				toCoordinate(vertex, { force3d, fallbackZ })
			);

			// 閉じたポリライン → Polygon
			if (entity.shape && coordinates.length >= 3) {
				geometry = createPolygonGeometry([closeRing(coordinates)]);
			} else {
				// 開いたポリライン → LineString
				geometry = createLineStringGeometry(coordinates);
			}
			break;
		}
		case 'CIRCLE': {
			// 円を多角形として近似（36点）
			if (isDxfPointLike(entity.center) && isFiniteCoordinate(entity.radius)) {
				const circleCoords = approximateCircle(
					entity.center.x,
					entity.center.y,
					entity.radius,
					36,
					hasExplicitZ(entity.center) ? entity.center.z : undefined
				);
				geometry = createPolygonGeometry([circleCoords]);
				properties.radius = entity.radius;
			}
			break;
		}
		case 'ARC': {
			// 円弧をLineStringとして近似
			if (
				isDxfPointLike(entity.center)
				&& isFiniteCoordinate(entity.radius)
				&& isFiniteCoordinate(entity.startAngle)
				&& isFiniteCoordinate(entity.endAngle)
			) {
				const arcCoords = approximateArc(
					entity.center.x,
					entity.center.y,
					entity.radius,
					entity.startAngle,
					entity.endAngle,
					36,
					hasExplicitZ(entity.center) ? entity.center.z : undefined
				);
				geometry = createLineStringGeometry(arcCoords);
				properties.radius = entity.radius;
				properties.startAngle = entity.startAngle;
				properties.endAngle = entity.endAngle;
			}
			break;
		}
		case 'ELLIPSE': {
			// 楕円を多角形として近似
			if (
				isDxfPointLike(entity.center)
				&& isDxfPointLike(entity.majorAxisEndPoint)
				&& isFiniteCoordinate(entity.axisRatio)
			) {
				const ellipseCoords = approximateEllipse(
					entity.center.x,
					entity.center.y,
					entity.majorAxisEndPoint,
					entity.axisRatio,
					isFiniteCoordinate(entity.startAngle) ? entity.startAngle : 0,
					isFiniteCoordinate(entity.endAngle) ? entity.endAngle : Math.PI * 2,
					36,
					hasExplicitZ(entity.center) ? entity.center.z : undefined
				);
				geometry = createPolygonGeometry([ellipseCoords]);
			}
			break;
		}
		case 'SPLINE':
			// スプライン曲線をLineStringとして近似
			if (entity.controlPoints && entity.controlPoints.length > 0) {
				const controlPoints: DxfPoint[] = entity.controlPoints.filter(isDxfPointLike);
				const force3d = controlPoints.some(hasExplicitZ);
				const splineCoords = controlPoints.map((point) => toCoordinate(point, { force3d }));
				geometry = createLineStringGeometry(splineCoords);
			}
			break;

		case '3DFACE': {
			const faceVertices: DxfPoint[] = Array.isArray(entity.vertices)
				? entity.vertices.filter(isDxfPointLike)
				: [];
			const force3d = faceVertices.some(hasExplicitZ);
			const ring = closeRing(
				removeDuplicateAdjacentCoordinates(
					faceVertices.map((vertex) => toCoordinate(vertex, { force3d }))
				)
			);
			geometry = createPolygonGeometry([ring]);
			break;
		}

		case 'SOLID': {
			const solidPoints: DxfPoint[] = Array.isArray(entity.points)
				? entity.points.filter(isDxfPointLike)
				: [];
			const force3d = solidPoints.some(hasExplicitZ);
			const ring = closeRing(
				removeDuplicateAdjacentCoordinates(
					solidPoints.map((point) => toCoordinate(point, { force3d }))
				)
			);
			geometry = createPolygonGeometry([ring]);
			break;
		}

		case 'TEXT':
		case 'MTEXT':
			// テキストは位置情報として保存
			if (isDxfPointLike(entity.position) || isDxfPointLike(entity.startPoint)) {
				const point = isDxfPointLike(entity.position) ? entity.position : entity.startPoint;
				geometry = createPointGeometry(toCoordinate(point));
				properties.text = entity.text;
				properties.height = entity.height;
			}
			break;

		default:
			console.warn(`Unsupported entity type: ${entity.type}`);
			return null;
	}

	if (!geometry) return null;
	if (!isGeometryValid(geometry)) {
		// CAD 変換結果には頂点ゼロのポリラインが混ざることがあるため、再投影前に落とす。
		console.warn('Skipping invalid DXF entity geometry', {
			type: entity.type,
			layer: entity.layer
		});
		return null;
	}
	if (unitScaleFactor !== 1) {
		geometry = scaleGeometry(geometry, unitScaleFactor);
		scaleLengthProperties(properties, unitScaleFactor);
	}

	return {
		type: 'Feature',
		geometry,
		properties
	};
};

const getDxfUnitScaleFactor = (header?: DxfHeader): number => {
	const insunits = header?.['$INSUNITS'];

	if (typeof insunits !== 'number' || !Number.isFinite(insunits)) {
		return 1;
	}

	return DXF_INSUNITS_TO_METERS[insunits] ?? 1;
};

const isFiniteCoordinate = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);

const isDxfPointLike = (value: unknown): value is DxfPoint =>
	typeof value === 'object'
	&& value !== null
	&& isFiniteCoordinate((value as DxfPointLike).x)
	&& isFiniteCoordinate((value as DxfPointLike).y);

const hasExplicitZ = (
	point: DxfPointLike | null | undefined
): point is DxfPoint & { z: number } =>
	point != null && isFiniteCoordinate(point.z);

const toCoordinate = (
	point: DxfPoint,
	options?: { force3d?: boolean; fallbackZ?: number }
): number[] => {
	const z = hasExplicitZ(point) ? point.z : options?.fallbackZ;

	if (options?.force3d || isFiniteCoordinate(z)) {
		return [point.x, point.y, z ?? 0];
	}

	return [point.x, point.y];
};

const createPointGeometry = (coordinates: number[]): AnyGeometry =>
	({
		type: 'Point',
		coordinates
	}) as unknown as AnyGeometry;

const createLineStringGeometry = (coordinates: number[][]): AnyGeometry =>
	({
		type: 'LineString',
		coordinates
	}) as unknown as AnyGeometry;

const createPolygonGeometry = (coordinates: number[][][]): AnyGeometry =>
	({
		type: 'Polygon',
		coordinates
	}) as unknown as AnyGeometry;

const createPlanarCoordinate = (x: number, y: number, z?: number): number[] =>
	isFiniteCoordinate(z) ? [x, y, z] : [x, y];

const coordinatesEqual = (a: number[], b: number[]): boolean =>
	a.length === b.length && a.every((value, index) => value === b[index]);

const removeDuplicateAdjacentCoordinates = (coordinates: number[][]): number[][] =>
	coordinates.filter((coordinate, index) =>
		index === 0 || !coordinatesEqual(coordinate, coordinates[index - 1])
	);

const closeRing = (coordinates: number[][]): number[][] => {
	if (coordinates.length === 0) {
		return coordinates;
	}

	if (coordinatesEqual(coordinates[0], coordinates[coordinates.length - 1])) {
		return coordinates;
	}

	return [...coordinates, [...coordinates[0]]];
};

const scaleCoordinates = (coordinates: unknown, factor: number): unknown => {
	if (!Array.isArray(coordinates)) {
		return coordinates;
	}

	if (coordinates.length > 0 && typeof coordinates[0] === 'number') {
		return coordinates.map((value) => (typeof value === 'number' ? value * factor : value));
	}

	return coordinates.map((value) => scaleCoordinates(value, factor));
};

const scaleGeometry = <T extends AnyGeometry>(geometry: T, factor: number): T => ({
	...geometry,
	coordinates: scaleCoordinates(geometry.coordinates, factor) as T['coordinates']
});

const scaleLengthProperties = (properties: Record<string, any>, factor: number): void => {
	for (const key of ['radius', 'height']) {
		if (typeof properties[key] === 'number' && Number.isFinite(properties[key])) {
			properties[key] *= factor;
		}
	}
};

const isCoordinatePair = (coord: unknown): coord is [number, number] =>
	Array.isArray(coord) &&
	coord.length >= 2 &&
	isFiniteCoordinate(coord[0]) &&
	isFiniteCoordinate(coord[1]);

const isValidLineStringCoordinates = (coordinates: unknown): coordinates is [number, number][] =>
	Array.isArray(coordinates) &&
	coordinates.length >= 2 &&
	coordinates.every(isCoordinatePair);

const isValidPolygonCoordinates = (
	coordinates: unknown
): coordinates is [number, number][][] =>
	Array.isArray(coordinates) &&
	coordinates.length > 0 &&
	coordinates.every(
		(ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(isCoordinatePair)
	);

const isGeometryValid = (geometry: AnyGeometry): boolean => {
	switch (geometry.type) {
		case 'Point':
			return isCoordinatePair(geometry.coordinates);
		case 'LineString':
			return isValidLineStringCoordinates(geometry.coordinates);
		case 'Polygon':
			return isValidPolygonCoordinates(geometry.coordinates);
		case 'MultiPoint':
			return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0 &&
				geometry.coordinates.every(isCoordinatePair);
		case 'MultiLineString':
			return Array.isArray(geometry.coordinates) &&
				geometry.coordinates.length > 0 &&
				geometry.coordinates.every(isValidLineStringCoordinates);
		case 'MultiPolygon':
			return Array.isArray(geometry.coordinates) &&
				geometry.coordinates.length > 0 &&
				geometry.coordinates.every(isValidPolygonCoordinates);
		default:
			return false;
	}
};

/**
 * 円を多角形の座標配列として近似
 */
const approximateCircle = (
	cx: number,
	cy: number,
	radius: number,
	segments: number = 36,
	z?: number
): number[][] => {
	const coords: number[][] = [];

	for (let i = 0; i <= segments; i++) {
		const angle = (i / segments) * Math.PI * 2;
		const x = cx + radius * Math.cos(angle);
		const y = cy + radius * Math.sin(angle);
		coords.push(createPlanarCoordinate(x, y, z));
	}

	return coords;
};

/**
 * 円弧をLineStringの座標配列として近似
 */
const approximateArc = (
	cx: number,
	cy: number,
	radius: number,
	startAngle: number,
	endAngle: number,
	segments: number = 36,
	z?: number
): number[][] => {
	const coords: number[][] = [];

	// 角度を正規化（DXFはラジアン）
	const angle1 = startAngle;
	let angle2 = endAngle;

	if (angle2 < angle1) {
		angle2 += Math.PI * 2;
	}

	const angleRange = angle2 - angle1;
	const numPoints = Math.max(2, Math.ceil((segments * angleRange) / (Math.PI * 2)));

	for (let i = 0; i <= numPoints; i++) {
		const angle = angle1 + (i / numPoints) * angleRange;
		const x = cx + radius * Math.cos(angle);
		const y = cy + radius * Math.sin(angle);
		coords.push(createPlanarCoordinate(x, y, z));
	}

	return coords;
};

/**
 * 楕円を多角形の座標配列として近似
 */
const approximateEllipse = (
	cx: number,
	cy: number,
	majorAxisEndPoint: { x: number; y: number },
	axisRatio: number,
	startAngle: number,
	endAngle: number,
	segments: number = 36,
	z?: number
): number[][] => {
	const coords: number[][] = [];

	const majorRadius = Math.sqrt(majorAxisEndPoint.x ** 2 + majorAxisEndPoint.y ** 2);
	const minorRadius = majorRadius * axisRatio;
	const rotation = Math.atan2(majorAxisEndPoint.y, majorAxisEndPoint.x);

	const angle1 = startAngle;
	let angle2 = endAngle;

	if (angle2 < angle1) {
		angle2 += Math.PI * 2;
	}

	const angleRange = angle2 - angle1;
	const numPoints = Math.max(2, Math.ceil((segments * angleRange) / (Math.PI * 2)));

	for (let i = 0; i <= numPoints; i++) {
		const t = angle1 + (i / numPoints) * angleRange;

		// 楕円のパラメトリック方程式
		const ex = majorRadius * Math.cos(t);
		const ey = minorRadius * Math.sin(t);

		// 回転を適用
		const x = cx + ex * Math.cos(rotation) - ey * Math.sin(rotation);
		const y = cy + ex * Math.sin(rotation) + ey * Math.cos(rotation);

		coords.push(createPlanarCoordinate(x, y, z));
	}

	return coords;
};

/**
 * ファイルのバイナリからテキストを読み取る
 * UTF-8で読み、置換文字（U+FFFD）が含まれていたらShift_JISで再デコードする
 */
const readFileAsText = async (file: File): Promise<string> => {
	const buffer = await file.arrayBuffer();

	return readArrayBufferAsText(buffer);
};

export const readArrayBufferAsText = (buffer: ArrayBuffer): string => {
	const utf8Text = new TextDecoder('utf-8').decode(buffer);

	// まずUTF-8で試行
	if (!utf8Text.includes('\uFFFD')) {
		return utf8Text;
	}

	// UTF-8で文字化け（U+FFFD）があればShift_JISで再デコード
	try {
		return new TextDecoder('shift-jis').decode(buffer);
	} catch {
		try {
			return new TextDecoder('sjis').decode(buffer);
		} catch {
			// フォールバック: UTF-8のまま返す
			return utf8Text;
		}
	}
};

export const dxfArrayBufferToGeoJson = (buffer: ArrayBuffer): FeatureCollection => {
	return dxfToGeoJson(readArrayBufferAsText(buffer));
};

/**
 * ブラウザでのファイル読み込み用
 */
export const dxfFileToGeoJsonBrowser = async (file: File): Promise<FeatureCollection> => {
	return dxfArrayBufferToGeoJson(await file.arrayBuffer());
};
