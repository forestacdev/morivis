import { DEFAULT_SYMBOL_TEXT_FONT } from '$routes/constants';
import type {
	SymbolLayerSpecification,
	VectorSourceSpecification
} from '$routes/map/utils/maplibre';

export const poiSources: Record<string, VectorSourceSpecification> = {
	openmaptiles: {
		type: 'vector',
		url: 'pmtiles://https://tile.openstreetmap.jp/static/planet.pmtiles'
	}
};

export const poiLayers: SymbolLayerSpecification[] = [];
