import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mifFilesToGeoJson } from '.';

const sampleMif = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.mif'));
const sampleMid = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.mid'));

const createFile = (name: string, bytes: Buffer) =>
	({
		name,
		arrayBuffer: async () =>
			bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
	}) as File;

describe('mif parser', () => {
	it('MIF/MID を GeoJSON に変換できる', async () => {
		const result = await mifFilesToGeoJson(
			createFile('sample.mif', sampleMif),
			createFile('sample.mid', sampleMid)
		);

		expect(result.features).toHaveLength(2);
		expect(result.features[0]?.geometry.type).toBe('Point');
		expect(result.features[0]?.properties?.name).toBe('Point A');
		expect(result.features[1]?.geometry.type).toBe('LineString');
		expect(result.features[1]?.properties?.kind).toBe('line');
	});
});
