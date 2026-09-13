import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';

export type DxfRenderMode = 'auto' | '2d' | '2d-line';
type Point2D = [number, number];

const flattenLine = (line: number[][]): Point2D[] =>
	line.map(([x, y]): Point2D => [x, y]).filter((point, index, points) =>
		index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1]
	);

const hasArea = (ring: Point2D[]) => {
	if (ring.length < 4) return false;
	const [x, y] = ring[0];
	let area = 0;
	let magnitude = 0;
	for (let i = 1; i < ring.length - 1; i++) {
		const a = (ring[i][0] - x) * (ring[i + 1][1] - y);
		const b = (ring[i + 1][0] - x) * (ring[i][1] - y);
		area += a - b;
		magnitude += Math.abs(a) + Math.abs(b);
	}
	return Math.abs(area) > Number.EPSILON * ring.length * magnitude;
};

const projectGeometry = (geometry: AnyGeometry, outlines: boolean): AnyGeometry | null => {
	if (geometry.type === 'Point') {
		return { type: 'Point', coordinates: [geometry.coordinates[0], geometry.coordinates[1]] };
	}
	if (geometry.type === 'MultiPoint') {
		return { type: 'MultiPoint', coordinates: geometry.coordinates.map(([x, y]) => [x, y]) };
	}
	if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
		const lines = geometry.type === 'LineString'
			? [geometry.coordinates]
			: geometry.coordinates;
		const coordinates = lines.map(flattenLine).filter((line) => line.length >= 2);
		return coordinates.length ? { type: 'MultiLineString', coordinates } : null;
	}
	const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
	if (outlines) {
		const edges = new Map<string, Point2D[]>();
		for (const polygon of polygons) {
			for (const ring of polygon) {
				const line = flattenLine(ring);
				for (let i = 0; i < line.length; i++) {
					const a = line[i], b = line[(i + 1) % line.length];
					const aKey = a.join(','), bKey = b.join(',');
					if (aKey === bKey) continue;
					const key = aKey < bKey ? `${aKey}/${bKey}` : `${bKey}/${aKey}`;
					if (!edges.has(key)) edges.set(key, [a, b]);
				}
			}
		}
		return edges.size ? { type: 'MultiLineString', coordinates: [...edges.values()] } : null;
	}
	const coordinates = polygons.flatMap((polygon) => {
		const [outer, ...holes] = polygon.map(flattenLine);
		return outer && hasArea(outer) ? [[outer, ...holes.filter(hasArea)]] : [];
	});
	return coordinates.length ? { type: 'MultiPolygon', coordinates } : null;
};

/** 選択したDXFの形状を、座標変換・位置合わせの前に登録先へそろえる。 */
export const prepareDxfVectorData = (
	geojson: FeatureCollection,
	sourceGeometryType: VectorEntryGeometryType,
	mode: DxfRenderMode
) => {
	const geometryType = mode === '2d-line' && sourceGeometryType === 'Polygon'
		? 'LineString'
		: sourceGeometryType;
	if (mode === 'auto') return { geojson, geometryType, allow3d: true };
	const projected: FeatureCollection = {
		type: 'FeatureCollection',
		features: geojson.features.flatMap((feature) => {
			const geometry = projectGeometry(feature.geometry, mode === '2d-line');
			return geometry ? [{ ...feature, geometry }] : [];
		})
	};
	if (!projected.features.length) {
		throw new Error(
			sourceGeometryType === 'Polygon' && mode === '2d'
				? '2Dポリゴンになる面がありません。2Dラインを選択してください。'
				: '2Dで表示できる形状がありません。'
		);
	}
	return { geojson: projected, geometryType, allow3d: false };
};
