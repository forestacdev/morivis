import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractModelFromKml, getKmlDefaultColor, kmlFileToGeoJson } from '.';

const kmlText = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.kml'), 'utf8');
const boxKmlText = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'box.kml'), 'utf8');

const createKmlFile = () =>
	({
		name: 'sample.kml',
		text: async () => kmlText
	}) as File;

const createBoxKmlFile = () =>
	({
		name: 'box.kml',
		text: async () => boxKmlText
	}) as File;

describe('kml parser', () => {
	it('Placemark と style を GeoJSON と色情報に変換する', async () => {
		const result = await kmlFileToGeoJson(createKmlFile());

		expect(result.geojson.features).toHaveLength(1);
		expect(result.geojson.features[0]?.geometry.type).toBe('Point');
		expect(result.geojson.features[0]?.properties?.name).toBe('Sample Point');
		expect(result.geojson.features[0]?.properties?.category).toBe('survey');
		expect(result.geojson.features[0]?.properties?.['_kml_fill_color']).toBe('#ff0000');
		expect(result.geojson.features[0]?.properties?.['_kml_line_color']).toBe('#00ff00');
		expect(result.fillColors.get('sample-style')).toBe('#ff0000');
		expect(result.lineColors.get('sample-style')).toBe('#00ff00');
		expect(getKmlDefaultColor(result, 'Point')).toBe('#00ff00');
	});

	it('ローカル参照の Model を関連ファイル付きで抽出する', async () => {
		const modelFile = ({ name: 'box.glb' } as File) as File & { morivisRelativePath?: string; };
		modelFile.morivisRelativePath = 'box.glb';

		const result = await extractModelFromKml(createBoxKmlFile(), [modelFile]);

		expect(result?.mainModelPath).toBe('box.glb');
		expect(result?.modelFiles).toHaveLength(1);
		expect(result?.placement).toMatchObject({
			name: 'Box',
			lng: 139.6917,
			lat: 35.6895,
			altitude: 12.5,
			scale: 1
		});
		expect(
			(result?.modelFiles[0] as File & { morivisModelPlacement?: unknown; })
				.morivisModelPlacement
		)
			.toMatchObject({
				name: 'Box',
				lng: 139.6917,
				lat: 35.6895
			});
	});

	it('リモート参照の Model URL を抽出する', async () => {
		const remoteKmlFile = ({
			name: 'remote.kml',
			text: async () =>
				`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>Remote Cube</name>
    <Model>
      <Location>
        <longitude>139.7</longitude>
        <latitude>35.6</latitude>
        <altitude>10</altitude>
      </Location>
      <Link>
        <href>https://example.com/models/cube.glb</href>
      </Link>
    </Model>
  </Placemark>
</kml>`
		}) as File;

		const result = await extractModelFromKml(remoteKmlFile);

		expect(result?.modelUrl).toBe('https://example.com/models/cube.glb');
		expect(result?.modelFiles).toHaveLength(0);
		expect(result?.placement).toMatchObject({
			name: 'Remote Cube',
			lng: 139.7,
			lat: 35.6,
			altitude: 10
		});
	});
});
