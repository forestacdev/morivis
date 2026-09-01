import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectGmlDialect, gmlFileToGeoJson, gmlTextToGeoJson } from '.';

const sampleFgdGml = readFileSync(
	resolve(import.meta.dirname, '__fixtures__', 'sample-fgd.gml'),
	'utf8'
);
const sampleKsjGml = readFileSync(
	resolve(import.meta.dirname, '__fixtures__', 'sample-ksj.gml'),
	'utf8'
);
const sampleGenericGml = readFileSync(
	resolve(import.meta.dirname, '__fixtures__', 'sample-generic.gml'),
	'utf8'
);

const createGmlFile = () =>
	({
		name: 'sample-fgd.gml',
		text: async () => sampleFgdGml
	}) as File;

describe('gml parser', () => {
	it('基盤地図情報 GML を GeoJSON に変換できる', async () => {
		const result = await gmlTextToGeoJson(sampleFgdGml);

		expect(result.features).toHaveLength(1);
		expect(result.features[0]?.geometry.type).toBe('Point');
		expect(result.features[0]?.geometry.coordinates).toEqual([139.6917, 35.6895]);
		expect(result.features[0]?.properties?.name).toBe('テスト基準点');
		expect(result.features[0]?.properties?._featureType).toBe('AdmPt');
	});

	it('ファイルから基盤地図情報 GML を読み込める', async () => {
		const result = await gmlFileToGeoJson(createGmlFile());

		expect(result.features[0]?.id).toBe('admpt-1');
	});

	it('国土数値情報系 GML を専用 dialect として判定できる', () => {
		expect(detectGmlDialect(sampleKsjGml)).toBe('ksj');
	});

	it('汎用 GML を generic dialect として判定できる', () => {
		expect(detectGmlDialect(sampleGenericGml)).toBe('generic');
	});
});
