import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseMojXml } from '.';

const sampleXml = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.xml'), 'utf8');

describe('mojxml parser', () => {
	it('任意座標系を含めて法務局地図XMLを GeoJSON に変換できる', async () => {
		const result = await parseMojXml(sampleXml, { includeArbitraryCrs: true });

		expect(result.features).toHaveLength(1);
		expect(result.features[0]?.geometry?.type).toBe('MultiPolygon');
		expect(result.features[0]?.properties['地番']).toBe('1-1');
		expect(result.features[0]?.properties['地図名']).toBe('テスト地図');
	});

	it('任意座標系を除外すると空になる', async () => {
		const result = await parseMojXml(sampleXml);

		expect(result.features).toHaveLength(0);
	});
});
