import { decodeTile, GEOMETRY_TYPE } from '@maplibre/mlt';
import { parseLocalTilePath } from '../local-tiles';
import { inspectLocalVectorTiles } from '../vector-tiles';

export const isMltFile = (file: File) => /\.mlt(\.gz)?$/i.test(file.name);
export const parseMltPath = (file: File) => parseLocalTilePath(file, /\.mlt(\.gz)?$/i);

const geometryTypes = {
	[GEOMETRY_TYPE.POINT]: 'Point',
	[GEOMETRY_TYPE.MULTIPOINT]: 'Point',
	[GEOMETRY_TYPE.LINESTRING]: 'LineString',
	[GEOMETRY_TYPE.MULTILINESTRING]: 'LineString',
	[GEOMETRY_TYPE.POLYGON]: 'Polygon',
	[GEOMETRY_TYPE.MULTIPOLYGON]: 'Polygon'
} as const;

export const inspectLocalMlt = (files: File[]) =>
	inspectLocalVectorTiles(files, {
		isTileFile: isMltFile,
		extension: /\.mlt(\.gz)?$/i,
		label: 'MLT',
		decode: data =>
			decodeTile(new Uint8Array(data)).map(table => ({
				id: table.name,
				features: table.getFeatures().slice(0, 200).map(feature => ({
					geometryType: geometryTypes[feature.geometry.type],
					properties: feature.properties
				}))
			}))
	});
