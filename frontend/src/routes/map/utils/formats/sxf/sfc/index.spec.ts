import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { sxfTextToGeoJson } from './index';

const readFixture = (name: string): string =>
	readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');

describe('sxfTextToGeoJson', () => {
	it('バックスラッシュ付きクオートの SXF 文字列を解釈できる', () => {
		const geojson = sxfTextToGeoJson(`/*SXF
#10 = pre_defined_colour_feature(\\'red\\')
SXF*/
/*SXF
#20 = line_feature(\\'1\\',\\'2\\',\\'1\\',\\'3\\',\\'0\\',\\'0\\',\\'10\\',\\'10\\')
SXF*/
/*SXF
#30 = text_string_feature(\\'4\\',\\'8\\',\\'1\\',\\'escaped text\\',\\'5\\',\\'6\\',\\'2\\',\\'1\\',\\'0\\',\\'45\\',\\'1\\')
SXF*/`);

		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[0]?.properties).toMatchObject({
			type: 'line',
			layer: '1',
			color: '2'
		});
		expect(geojson.features[1]?.properties).toMatchObject({
			type: 'text_string',
			text: 'escaped text'
		});
	});

	it('SFC の最小図形を GeoJSON に変換できる', () => {
		const geojson = sxfTextToGeoJson(readFixture('simple.sfc'));

		expect(geojson.features).toHaveLength(5);
		expect(geojson.features.map((feature) => feature.geometry.type)).toEqual([
			'LineString',
			'Polygon',
			'LineString',
			'LineString',
			'Point'
		]);
		expect(geojson.features[0]?.properties).toMatchObject({
			type: 'line',
			layer: '1'
		});
		expect(geojson.features[4]?.properties).toMatchObject({
			type: 'text_string',
			text: 'SXF text'
		});
	});

	it('実データのような quoted polyline を GeoJSON に変換できる', () => {
		const geojson = sxfTextToGeoJson(readFixture('quoted-polyline.sfc'));

		expect(geojson.features).toHaveLength(2);
		expect(geojson.features.map((feature) => feature.geometry.type)).toEqual([
			'Polygon',
			'LineString'
		]);
		expect(geojson.features[0]?.geometry).toMatchObject({
			type: 'Polygon'
		});
	});

	it('SXF3 ブロックを誤って次ブロックまで飲み込まない', () => {
		const geojson = sxfTextToGeoJson(`/*SXF3
#10 = drawing_attribute_feature(\\' \\',\\' \\',\\' \\',\\' \\',\\' \\',\\' \\',\\' \\','0','1','1',\\' \\',\\' \\')
SXF3*/
/*SXF
#20 = line_feature('1','2','1','3','0','0','10','10')
SXF*/`);

		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.properties).toMatchObject({
			type: 'line',
			layer: '1'
		});
	});
});
