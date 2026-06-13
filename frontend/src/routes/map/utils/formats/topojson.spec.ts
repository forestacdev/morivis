import { describe, expect, it } from 'vitest';
import {
	getTopoJsonObjectNames,
	getTopoJsonObjects,
	topoJsonFileToGeoJson,
	topoJsonObjectToGeoJson
} from './topojson';

const topologyText = JSON.stringify({
	type: 'Topology',
	objects: {
		points: {
			type: 'GeometryCollection',
			geometries: [
				{
					type: 'Point',
					properties: { name: 'alpha' },
					coordinates: [139.6917, 35.6895]
				}
			]
		},
		lines: {
			type: 'GeometryCollection',
			geometries: [
				{
					type: 'LineString',
					properties: { name: 'route-1' },
					arcs: [0]
				}
			]
		}
	},
	arcs: [[[139.6917, 35.6895], [0.1, 0.1]]]
});

const createTopoJsonFile = () =>
	({
		text: async () => topologyText
	}) as File;

describe('topojson parser', () => {
	it('object 名の一覧を取り出せる', () => {
		const topology = JSON.parse(topologyText);

		expect(getTopoJsonObjectNames(topology)).toEqual(['points', 'lines']);
	});

	it('指定 object を GeoJSON に変換できる', () => {
		const topology = JSON.parse(topologyText);
		const geojson = topoJsonObjectToGeoJson(topology, 'points');

		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.geometry.type).toBe('Point');
		expect(geojson.features[0]?.properties?.name).toBe('alpha');
	});

	it('ファイルから object 一覧と GeoJSON を取得できる', async () => {
		const objects = await getTopoJsonObjects(createTopoJsonFile());
		const geojson = await topoJsonFileToGeoJson(createTopoJsonFile(), 'lines');

		expect(objects).toEqual([
			{ name: 'points', count: 1 },
			{ name: 'lines', count: 1 }
		]);
		expect(geojson.features[0]?.geometry.type).toBe('LineString');
		expect(geojson.features[0]?.properties?.name).toBe('route-1');
	});
});
