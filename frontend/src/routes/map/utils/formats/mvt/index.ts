import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import { parseLocalTilePath } from '../local-tiles';
import { inspectLocalVectorTiles } from '../vector-tiles';

export { readVectorTileBytes as readMvtBytes } from '../vector-tiles';
export type {
	LocalVectorTileLayer as LocalMvtLayer,
	LocalVectorTileSource as LocalMvtSource
} from '../vector-tiles';

export const isMvtFile = (file: File) => /\.(mvt|pbf)(\.gz)?$/i.test(file.name);
export const isLocalMvtInput = (files: File[]) =>
	files.some(isMvtFile) || files.some(file => /^tilejson\.json$/i.test(file.name));
export const parseMvtPath = (file: File) => parseLocalTilePath(file, /\.(mvt|pbf)(\.gz)?$/i);

export const inspectLocalMvt = (files: File[]) =>
	inspectLocalVectorTiles(files, {
		isTileFile: isMvtFile,
		extension: /\.(mvt|pbf)(\.gz)?$/i,
		label: 'MVT',
		decode: data =>
			Object.entries(new VectorTile(new Pbf(data)).layers).map(([id, layer]) => ({
				id,
				features: Array.from({ length: Math.min(layer.length, 200) }, (_, i) => {
					const feature = layer.feature(i);
					return {
						geometryType:
							({ 0: undefined, 1: 'Point', 2: 'LineString', 3: 'Polygon' } as const)[
								feature.type
							],
						properties: feature.properties
					};
				})
			}))
	});
