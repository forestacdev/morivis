import type { FeatureCollection } from '$routes/map/types/geojson';

export type SxfCoordinateUnit = 'm' | 'mm';

const SXF_AUTO_MM_SPAN_THRESHOLD = 100_000;

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);

const visitCoordinatePairs = (
	coordinates: unknown,
	visit: (x: number, y: number) => void
): void => {
	if (!Array.isArray(coordinates)) return;

	if (
		coordinates.length >= 2
		&& isFiniteNumber(coordinates[0])
		&& isFiniteNumber(coordinates[1])
	) {
		visit(coordinates[0], coordinates[1]);
		return;
	}

	for (const child of coordinates) {
		visitCoordinatePairs(child, visit);
	}
};

const getCoordinateSpan = (geojson: FeatureCollection): number => {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const feature of geojson.features) {
		visitCoordinatePairs(feature.geometry?.coordinates, (x, y) => {
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		});
	}

	if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
		return 0;
	}

	return Math.max(maxX - minX, maxY - minY);
};

export const inferSxfCoordinateUnit = (geojson: FeatureCollection): SxfCoordinateUnit =>
	getCoordinateSpan(geojson) > SXF_AUTO_MM_SPAN_THRESHOLD ? 'mm' : 'm';

export const getSxfUnitScaleFactor = (unit: SxfCoordinateUnit): number =>
	unit === 'mm' ? 0.001 : 1;

const scaleCoordinates = (coordinates: unknown, factor: number): unknown => {
	if (!Array.isArray(coordinates)) {
		return coordinates;
	}

	if (coordinates.length > 0 && typeof coordinates[0] === 'number') {
		return coordinates.map((value) => (typeof value === 'number' ? value * factor : value));
	}

	return coordinates.map((child) => scaleCoordinates(child, factor));
};

const scaleProperties = (
	properties: Record<string, unknown> | null | undefined,
	factor: number
): Record<string, unknown> | null | undefined => {
	if (!properties || factor === 1) {
		return properties;
	}

	const scaled = { ...properties };
	for (const key of ['radius', 'textHeight', 'textWidth', 'textSpacing']) {
		if (typeof scaled[key] === 'number' && Number.isFinite(scaled[key])) {
			scaled[key] *= factor;
		}
	}

	return scaled;
};

export const scaleSxfFeatureCollection = (
	geojson: FeatureCollection,
	unit: SxfCoordinateUnit
): FeatureCollection => {
	const factor = getSxfUnitScaleFactor(unit);
	if (factor === 1) {
		return geojson;
	}

	return {
		type: 'FeatureCollection',
		features: geojson.features.map((feature) => {
			const geometry = feature.geometry
				? ({
					...feature.geometry,
					coordinates: scaleCoordinates(feature.geometry.coordinates, factor) as typeof feature.geometry.coordinates
				} as typeof feature.geometry)
				: feature.geometry;

			return {
				...feature,
				geometry,
				properties: scaleProperties(
					feature.properties as Record<string, unknown> | null | undefined,
					factor
				) as typeof feature.properties
			};
		}) as FeatureCollection['features']
	};
};
