import { describe, expect, it } from 'vitest';

import { GeoRssParseError, geoRssFileToGeoJson, hasGeoRssMarker } from './index';

const createFile = (name: string, content: string) => new File([content], name, { type: 'application/xml' });

describe('geoRssFileToGeoJson', () => {
	it('GeoRSS Simple の point を Point として読める', async () => {
		const file = createFile(
			'simple.rss',
			`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:georss="http://www.georss.org/georss">
	<channel>
		<item>
			<title>東京駅</title>
			<description>駅</description>
			<georss:point>35.681236 139.767125</georss:point>
		</item>
	</channel>
</rss>`
		);

		const result = await geoRssFileToGeoJson(file);

		expect(result.requiresManualCrsSelection).toBe(false);
		expect(result.geojson.features).toHaveLength(1);
		expect(result.geojson.features[0]?.geometry).toEqual({
			type: 'Point',
			coordinates: [139.767125, 35.681236]
		});
		expect(result.geojson.features[0]?.properties).toMatchObject({
			title: '東京駅',
			description: '駅'
		});
	});

	it('GeoRSS Simple の box を Polygon として読める', async () => {
		const file = createFile(
			'box.rss',
			`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:georss="http://www.georss.org/georss">
	<channel>
		<item>
			<title>範囲</title>
			<georss:box>35.0 139.0 36.0 140.0</georss:box>
		</item>
	</channel>
</rss>`
		);

		const result = await geoRssFileToGeoJson(file);

		expect(result.geojson.features[0]?.geometry).toEqual({
			type: 'Polygon',
			coordinates: [
				[
					[139, 35],
					[140, 35],
					[140, 36],
					[139, 36],
					[139, 35]
				]
			]
		});
	});

	it('GeoRSS GML の非WGS84 srsName は手動座標系選択扱いにする', async () => {
		const file = createFile(
			'projected.atom',
			`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:georss="http://www.georss.org/georss" xmlns:gml="http://www.opengis.net/gml">
	<entry>
		<title>Projected Point</title>
		<georss:where>
			<gml:Point srsName="EPSG:3857">
				<gml:pos>15550408 4257980</gml:pos>
			</gml:Point>
		</georss:where>
	</entry>
</feed>`
		);

		const result = await geoRssFileToGeoJson(file);

		expect(result.sourceCrsName).toBe('EPSG:3857');
		expect(result.requiresManualCrsSelection).toBe(true);
		expect(result.geojson.features[0]?.geometry).toEqual({
			type: 'Point',
			coordinates: [15550408, 4257980]
		});
	});

	it('W3C geo の lat/long を Point として読める', async () => {
		const file = createFile(
			'w3c.rss',
			`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#">
	<channel>
		<item>
			<title>札幌</title>
			<geo:lat>43.06417</geo:lat>
			<geo:long>141.34694</geo:long>
		</item>
	</channel>
</rss>`
		);

		const result = await geoRssFileToGeoJson(file);

		expect(result.geojson.features[0]?.geometry).toEqual({
			type: 'Point',
			coordinates: [141.34694, 43.06417]
		});
	});

	it('GeoRSSマーカーがないXMLはエラーになる', async () => {
		const file = createFile(
			'plain.xml',
			`<?xml version="1.0" encoding="UTF-8"?><root><item><title>plain</title></item></root>`
		);

		await expect(geoRssFileToGeoJson(file)).rejects.toBeInstanceOf(GeoRssParseError);
		expect(hasGeoRssMarker(await file.text())).toBe(false);
	});
});
