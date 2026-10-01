import type { Geometry, Position } from 'geojson';
import proj4 from 'proj4';
import { getProjContext, isValidEpsg } from '../../proj/dict';
import { ensureProjNadgridsReady } from '../../proj/nadgrid';
import { type MapInfoResult, normalizeMapInfoGeoJson } from '.';
import { requireTab } from './binary';
import { formatMapinfoTab } from './definition';
import { parseMapInfoTab } from './parser';

/** filesはprepareMapInfoFilesで同じ表だけをASCII名へ正規化済み。 */
export const convertMapInfoTab = async (
	files: File[],
	sourceCrs?: string
): Promise<MapInfoResult> => {
	requireTab(
		files.reduce((size, file) => size + file.size, 0)
			<= formatMapinfoTab.limits.maxDatasetBytes,
		'一式は256 MiB以下にしてください'
	);
	const read = async (extensions: string[]) => {
		const matches = files.filter(f =>
			extensions.some(ext => f.name.toLowerCase() === `table.${ext}`)
		);
		requireTab(
			matches.length === 1,
			`${extensions.join('/').toUpperCase()}が不足・重複しています`
		);
		return new Uint8Array(await matches[0].arrayBuffer());
	};
	const [tab, attributes, map, id] = await Promise.all([
		read(['tab']),
		read(['dat', 'dbf']),
		read(['map']),
		read(['id'])
	]);
	const parsed = parseMapInfoTab({ tab, attributes, map, id });
	const raw = normalizeMapInfoGeoJson(parsed.geojson, false);
	const metadata = { sourceCrs: parsed.sourceCrs };
	const crs = sourceCrs || parsed.sourceCrs;
	if (!crs) return { ...raw, ...metadata, spatialStatus: 'crs-missing' };
	try {
		const code = crs.match(/^EPSG:(\d+)$/i)?.[1];
		const definition = code && isValidEpsg(code) ? getProjContext(code) : crs;
		await ensureProjNadgridsReady(definition);
		const converter = proj4(definition, 'EPSG:4326');
		const point = (p: Position) => converter.forward(p.slice(0, 2));
		const project = (g: Geometry): Geometry => {
			switch (g.type) {
				case 'GeometryCollection':
					return { ...g, geometries: g.geometries.map(project) };
				case 'Point':
					return { ...g, coordinates: point(g.coordinates) };
				case 'MultiPoint':
				case 'LineString':
					return { ...g, coordinates: g.coordinates.map(point) };
				case 'MultiLineString':
				case 'Polygon':
					return { ...g, coordinates: g.coordinates.map(part => part.map(point)) };
				case 'MultiPolygon':
					return {
						...g,
						coordinates: g.coordinates.map(polygon =>
							polygon.map(ring => ring.map(point))
						)
					};
			}
		};
		const projected = {
			type: 'FeatureCollection',
			features: parsed.geojson.features.map(f => ({
				...f,
				geometry: f.geometry ? project(f.geometry) : null
			}))
		};
		return {
			...normalizeMapInfoGeoJson(projected, true),
			...metadata,
			spatialStatus: 'resolved'
		};
	} catch (cause) {
		if (sourceCrs) {
			throw new Error(
				`指定した座標系で変換できませんでした: ${
					cause instanceof Error ? cause.message : String(cause)
				}`
			);
		}
		return { ...raw, ...metadata, spatialStatus: 'crs-missing' };
	}
};
