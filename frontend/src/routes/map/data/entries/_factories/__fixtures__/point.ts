import type { FeatureCollection } from '$routes/map/types/geojson';

export const testPointData: FeatureCollection = {
	type: 'FeatureCollection',
	features: [{
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [0, 0] },
		properties: {}
	}]
};

export const testPointConfig = {
	id: 'test-point',
	name: 'test-point',
	url: 'https://example.invalid/test-point',
	attribution: 'test-source',
	location: '不明' as const,
	bounds: [0, 0, 1, 1] as [number, number, number, number]
};
