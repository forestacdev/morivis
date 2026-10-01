import { getAllowedTransformModesForIssue } from '$routes/map/components/upload/transform-policy';
import {
	geoJsonFileToGeoJson,
	GeoJsonParseError,
	geoJsonTextToGeoJson
} from '$routes/map/utils/formats/geojson';
import { has3dGeometryForType } from '$routes/map/utils/formats/geojson/3d';
import { isBboxValid } from '$routes/map/utils/map/bbox';
import { transformBbox } from '$routes/map/utils/proj';
import turfBbox from '@turf/bbox';
import { readFileSync } from 'node:fs';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { GeoJsonSequenceParseError, geoJsonSequenceTextToGeoJson, isGeoJsonSequenceText } from '.';
import { GEOJSON_SEQUENCE_EXTENSIONS } from './files';

const lines = readFileSync(
	new URL('./__fixtures__/test-features.geojsonl', import.meta.url),
	'utf8'
);
const records = readFileSync(
	new URL('./__fixtures__/test-records.geojsons', import.meta.url),
	'utf8'
);
const point = '{"type":"Point","coordinates":[0,1]}';

describe('GeoJSONSeq', () => {
	it('行区切りの地物を結合し、ID・属性・Z座標を保持する', () => {
		const result = geoJsonSequenceTextToGeoJson(lines);
		expect(result.features).toHaveLength(2);
		expect(result.features[0]).toMatchObject({
			id: 'test-point',
			properties: {
				value: 0,
				enabled: false,
				note: 'test-a\ntest-b',
				detail: { group: 'test-group' }
			},
			geometry: { coordinates: [0, 1, 2] }
		});
		expect(result.features[1]).toMatchObject({
			id: 0,
			properties: {},
			geometry: { type: 'LineString' }
		});
		expect(turfBbox(result)).toEqual([0, 0, 1, 1]);
		expect(has3dGeometryForType(result, 'LineString')).toBe(true);
	});

	it('RS区切りは整形JSON・異種オブジェクト・入れ子のGeometryCollectionを扱う', () => {
		const result = geoJsonSequenceTextToGeoJson(records);
		expect(result.features.map(feature => feature.geometry.type)).toEqual([
			'Point',
			'LineString',
			'Polygon'
		]);
		expect(result.features[0]).toMatchObject({
			id: 'test-collection_0',
			properties: { name: 'test-collection' }
		});
		expect(result.features[1].id).toBe('test-collection_1_0');
	});

	it('BOM・CRLF・空行・末尾改行なしを許容する', () => {
		const input = '\uFEFF\r\n' + lines.trimEnd().replaceAll('\n', '\r\n\r\n');
		expect(geoJsonSequenceTextToGeoJson(input)).toEqual(geoJsonSequenceTextToGeoJson(lines));
	});

	it('連続RSと末尾LFのないレコードを読み込む', () => {
		expect(geoJsonSequenceTextToGeoJson(`\u001e\u001e${point}`).features).toHaveLength(1);
	});

	it.each([
		'',
		' \n\r\n',
		'\u001e',
		'{"type":"FeatureCollection","features":[]}',
		'{"type":"Feature","properties":null,"geometry":null}'
	])(
		'表示できる地物がなければ明示する: %s',
		input => {
			expect(() => geoJsonSequenceTextToGeoJson(input)).toThrow('表示できる地物がありません');
		}
	);

	it('途中の破損は空行を含めた行番号を示し、部分的な結果を返さない', () => {
		expect(() => geoJsonSequenceTextToGeoJson(`${point}\n\n{"type":`)).toThrow(
			'3行目のJSON構文'
		);
	});

	it('RS区切りの破損はレコード番号を示す', () => {
		expect(() => geoJsonSequenceTextToGeoJson(`${records}\u001e{`)).toThrow(
			'レコード3のJSON構文'
		);
		expect(() => geoJsonSequenceTextToGeoJson(`${point}\u001e${point}`)).toThrow(
			'最初のレコード区切りの前'
		);
	});

	it.each([
		'null',
		'[]',
		'{"name":"test"}',
		'{"type":"test-unknown"}',
		'{"type":"Point","coordinates":[0]}',
		'{"type":"Point","coordinates":[0,"1"]}',
		'{"type":"Point","coordinates":[0,1e999]}',
		'{"type":"FeatureCollection","features":[null]}',
		'{"type":"FeatureCollection","features":[{"type":"Point","coordinates":[0,1]}]}',
		'{"type":"Feature","geometry":{"type":"Point","coordinates":[0,1]},"properties":[]}',
		'{"type":"Feature","geometry":{"type":"Point","coordinates":[0,1]},"properties":{},"id":[]}',
		'{"type":"GeometryCollection","geometries":null}'
	])('GeoJSON以外や不正な構造を拒否する: %s', input => {
		expect(() => geoJsonSequenceTextToGeoJson(input)).toThrow(GeoJsonSequenceParseError);
		expect(() => geoJsonSequenceTextToGeoJson(input)).toThrow('1行目');
	});
});

describe('既存GeoJSON読み込みへの接続', () => {
	it.each(GEOJSON_SEQUENCE_EXTENSIONS)('%sをファイルから読める', async extension => {
		const file = new File([lines], `test-features${extension.toUpperCase()}`);
		expect(await geoJsonFileToGeoJson(file)).toEqual(geoJsonSequenceTextToGeoJson(lines));
	});

	it('貼り付けと.jsonファイルでは内容から行区切り・RS区切りを判定する', async () => {
		for (const text of [lines, records]) {
			expect(geoJsonTextToGeoJson(text)).toEqual(geoJsonSequenceTextToGeoJson(text));
			expect(await geoJsonFileToGeoJson(new File([text], 'test-sequence.json')))
				.toEqual(geoJsonSequenceTextToGeoJson(text));
		}
	});

	it('通常の整形済みGeoJSONや末尾改行をシーケンス扱いしない', () => {
		for (const text of [JSON.stringify(JSON.parse(point), null, 2), `${point}\n\n`]) {
			expect(isGeoJsonSequenceText(text)).toBe(false);
			expect(geoJsonTextToGeoJson(text).features[0].geometry).toEqual(JSON.parse(point));
		}
	});

	it('解析エラーを既存フォームが表示できるエラー型で返す', async () => {
		const file = new File([`${point}\n{`], 'test-broken.ndjson');
		await expect(geoJsonFileToGeoJson(file)).rejects.toThrow(GeoJsonParseError);
		await expect(geoJsonFileToGeoJson(file)).rejects.toThrow('2行目');
		expect(() => geoJsonTextToGeoJson(`\u001e{`)).toThrow(GeoJsonParseError);
	});

	it('投影座標を保持し、既存の座標系選択・変換へ渡せる', async () => {
		const result = geoJsonSequenceTextToGeoJson('{"type":"Point","coordinates":[1000,2000]}');
		const bbox = turfBbox(result) as [number, number, number, number];
		expect(isBboxValid(bbox)).toBe(false);
		expect(getAllowedTransformModesForIssue('geojson', 'crs-missing')).toEqual([
			'zone',
			'georef'
		]);
		const expected = proj4('EPSG:3857', 'EPSG:4326', [1000, 2000]);
		expect(await transformBbox(bbox, 'EPSG:3857')).toEqual([...expected, ...expected]);
	});
});
