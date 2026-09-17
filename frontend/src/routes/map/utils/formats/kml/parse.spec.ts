import { describe, expect, it } from 'vitest';
import { parseKmlString } from './parse';

describe('KML の名前空間と複数ジオメトリ', () => {
	it.each([
		'http://earth.google.com/kml/2.0',
		'http://earth.google.com/kml/2.1',
		'http://www.opengis.net/kml/2.2'
	])('%s の地物・属性・色を欠落や取り違えなく変換する', async (namespace) => {
		const { geojson } = await parseKmlString(`
<kml xmlns="${namespace}"><Document>
  <Folder><name>test-folder</name>
    <Placemark><name>test-empty</name></Placemark>
    <Placemark id="test-lines">
      <name>test-lines</name>
      <Style><LineStyle><color>ff0000ff</color></LineStyle></Style>
      <ExtendedData><Data name="test-category"><value>test-value</value></Data></ExtendedData>
      <TimeStamp><when>2000-01-01T00:00:00Z</when></TimeStamp>
      <MultiGeometry>
        <LineString><coordinates>0,0,10 1,1,20</coordinates></LineString>
        <LineString><coordinates>2,2,30 3,3,40</coordinates></LineString>
      </MultiGeometry>
    </Placemark>
    <Placemark id="test-point">
      <name>test-point</name><Point><coordinates>4,4,50</coordinates></Point>
    </Placemark>
  </Folder>
</Document></kml>`);

		expect(geojson.features).toHaveLength(3);
		expect(geojson.features.map((feature) => feature.geometry)).toEqual([
			{ type: 'LineString', coordinates: [[0, 0, 10], [1, 1, 20]] },
			{ type: 'LineString', coordinates: [[2, 2, 30], [3, 3, 40]] },
			{ type: 'Point', coordinates: [4, 4, 50] }
		]);
		expect(geojson.features.map((feature) => feature.id)).toEqual([
			'test-lines_0',
			'test-lines_1',
			'test-point'
		]);
		for (const feature of geojson.features.slice(0, 2)) {
			expect(feature.properties).toMatchObject({
				name: 'test-lines',
				'test-category': 'test-value',
				_kml_line_color: '#ff0000',
				folder_name: 'test-folder',
				folder_path: 'test-folder',
				time: '2000-01-01T00:00:00Z'
			});
		}
		expect(geojson.features[2].properties?.name).toBe('test-point');
		expect(geojson.features[2].properties?._kml_line_color).toBeUndefined();
	});

	it('gx:Track と ID のない通常地物を別々に保持する', async () => {
		const { geojson } = await parseKmlString(`
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <Style id="test-style"><LineStyle><color>ff00ff00</color></LineStyle></Style>
    <Placemark>
      <name>test-track</name><styleUrl>#test-style</styleUrl>
      <gx:Track>
        <when>2000-01-01T00:00:00Z</when><when>2000-01-01T00:01:00Z</when>
        <gx:coord>0 0 10</gx:coord><gx:coord>1 1 20</gx:coord>
      </gx:Track>
    </Placemark>
    <Placemark><name>test-point</name><Point><coordinates>2,2,30</coordinates></Point></Placemark>
  </Document>
</kml>`);

		expect(geojson.features).toHaveLength(3);
		expect(geojson.features[0]).toMatchObject({
			id: 1,
			geometry: { type: 'Point', coordinates: [2, 2, 30] },
			properties: { name: 'test-point' }
		});
		expect(geojson.features.slice(1).map((feature) => feature.properties)).toMatchObject([
			{ name: 'test-track', time: '2000-01-01T00:00:00Z', _kml_line_color: '#00ff00' },
			{ name: 'test-track', time: '2000-01-01T00:01:00Z', _kml_line_color: '#00ff00' }
		]);
		expect(geojson.features.slice(1).map((feature) => feature.geometry)).toEqual([
			{ type: 'Point', coordinates: [0, 0] },
			{ type: 'Point', coordinates: [1, 1] }
		]);
	});
});
