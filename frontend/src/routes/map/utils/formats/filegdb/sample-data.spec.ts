import fs from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getFileGdbGeometryTypes, parseFileGdbInputs, type FileGdbInput } from './index';

const fixtureDir = resolve(import.meta.dirname, '__fixtures__', 'geometry-types.gdb');

const loadFixtureInputs = (): FileGdbInput[] =>
	fs
		.readdirSync(fixtureDir)
		.filter((name) => /\.(gdbtable|gdbtablx|gdbindexes|gdbindex|atx|spx|cdf|freelist)$/i.test(name))
		.sort()
		.map((name) => ({
			name: `geometry-types.gdb/${name}`,
			data: fs.readFileSync(resolve(fixtureDir, name))
		}));

describe('filegdb fixture data', () => {
	it('git 管理 fixture の geometry-types.gdb を読み込める', () => {
		const result = parseFileGdbInputs(loadFixtureInputs());

		expect(result.datasetName).toBe('geometry-types');
		expect(result.layers).toHaveLength(3);
		expect(result.layers.map((layer) => layer.name)).toEqual([
			'a00000009',
			'a0000000a',
			'a0000000b'
		]);
		expect(result.layers.map((layer) => layer.geojson.type)).toEqual([
			'FeatureCollection',
			'FeatureCollection',
			'FeatureCollection'
		]);
		expect(result.layers.map((layer) => layer.geojson.features.length)).toEqual([1, 1, 1]);
		expect(result.layers.map((layer) => getFileGdbGeometryTypes(layer.geojson))).toEqual([
			['Point'],
			['LineString'],
			['Polygon']
		]);
	});
});
