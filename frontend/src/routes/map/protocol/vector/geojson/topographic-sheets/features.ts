import type { Feature, FeatureCollection, LineString, Point, Position } from 'geojson';

const isPosition = (value: unknown): value is Position =>
	Array.isArray(value) && value.length >= 2
	&& typeof value[0] === 'number' && Number.isFinite(value[0])
	&& typeof value[1] === 'number' && Number.isFinite(value[1]);

export const normalizeSheetFeatures = (collections: FeatureCollection[]): FeatureCollection => {
	const features: Feature<LineString | Point>[] = [];
	const seen = new Set<string>();
	for (const collection of collections) {
		for (const feature of collection.features) {
			let ring: Position[];
			let center: Position;
			const name = feature.properties?.['図名'] ?? feature.properties?.name;
			if (feature.geometry.type === 'Point') {
				const bounds: unknown = feature.properties?.['図郭座標'];
				if (!Array.isArray(bounds) || !isPosition(bounds[0]) || !isPosition(bounds[1])) {
					continue;
				}
				const [[west, south], [east, north]] = bounds;
				ring = [[west, south], [east, south], [east, north], [west, north], [west, south]];
				center = feature.geometry.coordinates;
			} else if (feature.geometry.type === 'Polygon') {
				ring = feature.geometry.coordinates[0];
				if (!ring || ring.length < 4) continue;
				const xs = ring.map(point => point[0]);
				const ys = ring.map(point => point[1]);
				center = [
					(Math.min(...xs) + Math.max(...xs)) / 2,
					(Math.min(...ys) + Math.max(...ys)) / 2
				];
			} else continue;
			const key = JSON.stringify([name, ring]);
			if (seen.has(key)) continue;
			seen.add(key);
			const properties = { name: typeof name === 'string' ? name : '' };
			// Polygon のクリップで生じるタイル端の辺を描かないよう、先に線へ変換する。
			features.push({
				type: 'Feature',
				properties,
				geometry: { type: 'LineString', coordinates: ring }
			});
			features.push({
				type: 'Feature',
				properties,
				geometry: { type: 'Point', coordinates: center }
			});
		}
	}
	return { type: 'FeatureCollection', features };
};
