import { STREET_VIEW_DATA_PATH } from '$routes/constants';
import type { SourceSpecification } from 'maplibre-gl';

export const streetViewSources = {
	street_view_sources: {
		type: 'vector',
		url: `pmtiles://${STREET_VIEW_DATA_PATH}/panorama.pmtiles`
	} as SourceSpecification
};
