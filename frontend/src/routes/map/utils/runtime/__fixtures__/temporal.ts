import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';

export const temporalData = (): FeatureCollection => ({
	type: 'FeatureCollection',
	features: [0, 1, 2].map(index => ({
		type: 'Feature',
		properties: { time: `test-${index}`, angle: 90 },
		geometry: { type: 'Point', coordinates: [index * 0.001, 0] }
	}))
});

export const temporalEntry = async () => {
	const entry = await createGeoJsonEntry(temporalData(), 'Point', 'test-temporal', [0, 0, 1, 1]);
	if (!entry) throw new Error('test entry could not be created');
	entry.id = 'test-temporal';
	entry.properties.temporal = {
		dimension: { type: 'time', values: ['test-0', 'test-1', 'test-2'] },
		behaviors: [{ type: 'source' }, {
			type: 'filter',
			key: 'time',
			alternateKeys: ['otherTime']
		}]
	};
	entry.state = {
		dimension: { currentIndex: 0 },
		temporalFilter: { enabled: true, startIndex: 0, endIndex: 1, mode: 'range' }
	};
	return entry;
};
