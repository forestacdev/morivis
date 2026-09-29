import type { FeatureCollection } from '$routes/map/types/geojson';
import type { DgnMetadata } from './parser';
export { parseDgn } from './parser';

export interface DgnResult {
	geojson: FeatureCollection;
	spatialStatus: 'crs-missing' | 'resolved';
	metadata: DgnMetadata;
	omittedCount: number;
	unsupportedTypes: Record<number, number>;
	approximatedCount: number;
}
