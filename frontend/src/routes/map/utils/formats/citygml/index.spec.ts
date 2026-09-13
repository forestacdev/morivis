import { createDeckVectorLayer } from '$routes/map/utils/deck/overlay';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { cityGmlTextToGeoJson } from '.';
import { isCityGml } from './detector';
import { createCityGmlEntry } from './entry';

// GeoArrowはこの経路で使わない。Nodeでは同パッケージの拡張子なしimportを解決できない。
vi.mock('@geoarrow/deck.gl-layers', () => ({
	GeoArrowPathLayer: vi.fn(),
	GeoArrowPolygonLayer: vi.fn(),
	GeoArrowScatterplotLayer: vi.fn()
}));

const buildings = readFileSync(
	new URL('./__fixtures__/test-buildings.gml', import.meta.url),
	'utf8'
);
const parts = readFileSync(new URL('./__fixtures__/test-parts.gml', import.meta.url), 'utf8');

describe('CityGMLから3D GeoJSONへの変換', () => {
	it('建物ごとに最高LODを選び、Solid参照と境界面の重複を除く', () => {
		const result = cityGmlTextToGeoJson(buildings);
		expect(result.geojson.features.map((feature) => feature.properties.lod)).toEqual([2, 1]);
		expect(result.polygonCount).toBe(3);
		expect(result.geojson.features[0].geometry.coordinates).toHaveLength(2);
		expect(result.bounds).toEqual([20, 10, 20.003, 10.003]);
	});
	it('壁面のXYが同じ頂点でも高さを保持し、屋根の穴を保持する', () => {
		const [wall, roof] =
			cityGmlTextToGeoJson(buildings).geojson.features[0].geometry.coordinates;
		expect(wall[0]).toEqual([[20, 10, 3], [20.001, 10, 3], [20.001, 10, 8], [20, 10, 8], [
			20,
			10,
			3
		]]);
		expect(roof).toHaveLength(2);
		expect(roof[1][0]).toEqual([20.0002, 10.0002, 8]);
	});
	it('LOD指定で異なるLODを混ぜず、対象外の建物を件数で報告する', () => {
		const result = cityGmlTextToGeoJson(buildings, 2);
		expect(result.geojson.features).toHaveLength(1);
		expect(result.skippedBuildingCount).toBe(1);
		expect(cityGmlTextToGeoJson(buildings, 1).polygonCount).toBe(2);
		expect(() => cityGmlTextToGeoJson(buildings, 4)).toThrow('LOD4');
	});
	it('建物ID、名称、一般属性を引き継ぐ', () => {
		const feature = cityGmlTextToGeoJson(buildings).geojson.features[0];
		expect(feature.id).toBe('test-building-a');
		expect(feature.properties).toMatchObject({
			gml_id: 'test-building-a',
			name: 'test-building',
			measuredHeight: '5',
			'test-purpose.value': 'test-use'
		});
		expect(Object.keys(feature.properties).some((key) => /posList|Solid|boundedBy/.test(key)))
			.toBe(false);
	});
	it('BuildingPartとデフォルト名前空間を扱い、CRS84の経度・緯度順を維持する', () => {
		const result = cityGmlTextToGeoJson(parts);
		expect(result.geojson.features[0].properties).toMatchObject({
			featureType: 'BuildingPart',
			name: 'test-part-name'
		});
		expect(result.geojson.features[0].geometry.coordinates[0][0][0]).toEqual([20, 10, 2]);
	});
	it('EPSGの短縮表記、URN、CityGML 1.0でも軸順を解決する', () => {
		for (const srs of ['EPSG:4326', 'urn:ogc:def:crs:EPSG::6697']) {
			const text = buildings.replace('http://www.opengis.net/def/crs/EPSG/0/6697', srs)
				.replaceAll('/2.0', '/1.0');
			expect(cityGmlTextToGeoJson(text).geojson.features[0].geometry.coordinates[0][0][0])
				.toEqual([20, 10, 3]);
		}
	});
	it.each([
		['壊れたXML', (text: string) => text.replace('</c:CityModel>', ''), 'XML'],
		[
			'2D座標',
			(text: string) => text.replace('srsDimension="3"', 'srsDimension="2"'),
			'3次元座標'
		],
		['不明な座標系', (text: string) => text.replace('/EPSG/0/6697', '/EPSG/0/99999'), '未対応'],
		[
			'座標系の欠落',
			(text: string) =>
				text.replace('srsName="http://www.opengis.net/def/crs/EPSG/0/6697"', ''),
			'srsName'
		],
		[
			'非数値',
			(text: string) =>
				text.replace('10 20 3 10 20.001 3 10 20.001 8', 'NaN 20 3 10 20.001 3 10 20.001 8'),
			'数値'
		],
		['点数不一致', (text: string) => text.replace('count="5"', 'count="4"'), 'count'],
		['参照切れ', (text: string) => text.replace('#test-wall', '#test-missing'), '参照先'],
		[
			'外部参照',
			(text: string) => text.replace('#test-wall', 'test-other.gml#test-wall'),
			'外部参照'
		],
		[
			'循環参照',
			(text: string) =>
				text.replace(
					'<g:Polygon g:id="test-wall">',
					'<g:Polygon g:id="test-wall" x:href="#test-wall">'
				),
			'循環'
		],
		['ID重複', (text: string) => text.replace('g:id="test-roof"', 'g:id="test-wall"'), '重複'],
		['未対応バージョン', (text: string) => text.replaceAll('/2.0', '/3.0'), '1.0 / 2.0']
	])('%sを無言で読み飛ばさずエラーにする', (_name, mutate, message) => {
		expect(() => cityGmlTextToGeoJson(mutate(buildings))).toThrow(message);
	});
	it('接頭辞に依存せずCityGMLを判定する', () => {
		expect(isCityGml(buildings)).toBe(true);
		expect(isCityGml(parts)).toBe(true);
		expect(isCityGml('<g:FeatureCollection xmlns:g="http://www.opengis.net/gml"/>')).toBe(
			false
		);
	});
	it('変換結果をコピーや2D化せず既存のdeck.gl entryに渡す', () => {
		const result = cityGmlTextToGeoJson(buildings);
		const entry = createCityGmlEntry('test-layer', result);
		expect(entry.type).toBe('model');
		expect(entry.format.type).toBe('geojson-3d');
		expect(entry.format.data).toBe(result.geojson);
		expect(entry.format.geometryType).toBe('Polygon');
		expect(entry.metaData.bounds).toEqual(result.bounds);
		const layer = createDeckVectorLayer(entry);
		expect(layer.props).toMatchObject({ filled: true, extruded: false, _full3d: true });
		expect(layer.props.data).toBe(result.geojson);
	});

	it('建物のEnvelopeによる座標系指定を優先する', () => {
		const text = parts.replace(
			'<g:name>test-part-name</g:name>',
			'<g:name>test-part-name</g:name><g:boundedBy><g:Envelope srsName="urn:ogc:def:crs:OGC:1.3:CRS84" srsDimension="3"/></g:boundedBy>'
		)
			.replace(
				'<g:MultiSurface srsName="urn:ogc:def:crs:OGC:1.3:CRS84">',
				'<g:MultiSurface>'
			);
		expect(cityGmlTextToGeoJson(text).geojson.features[0].geometry.coordinates[0][0][0])
			.toEqual([20, 10, 2]);
	});
});
