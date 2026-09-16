import { createDeckVectorLayer } from '$routes/map/utils/deck/overlay';
import { getProjContext } from '$routes/map/utils/proj/dict';
import { readFileSync } from 'node:fs';
import proj4 from 'proj4';
import { describe, expect, it, vi } from 'vitest';
import { cityJsonTextToGeoJson, resolveCityJsonCrs } from '.';
import { isCityJsonFile } from './detector';
import { createCityJsonEntry } from './entry';

vi.mock('@geoarrow/deck.gl-layers', () => ({
	GeoArrowPathLayer: vi.fn(),
	GeoArrowPolygonLayer: vi.fn(),
	GeoArrowScatterplotLayer: vi.fn()
}));
const text = readFileSync(new URL('./__fixtures__/test-city.city.json', import.meta.url), 'utf8');
type TestDocument = {
	type: string;
	version: string;
	transform?: { scale: number[]; translate: number[]; };
	metadata?: { referenceSystem?: string; geographicalExtent?: number[]; };
	CityObjects: Record<string, Record<string, unknown>>;
	vertices: number[][];
	'geometry-templates'?: { templates: unknown[]; 'vertices-templates': number[][]; };
	appearance?: unknown;
};
const document = (): TestDocument => JSON.parse(text);
const parse = (input: TestDocument) => cityJsonTextToGeoJson(JSON.stringify(input));
const surface = { type: 'MultiSurface', lod: '2.2', boundaries: [[[0, 1, 2, 3]]] };

describe('CityJSONの都市モデル', () => {
	it('オブジェクトごとの最高LODを選び、同じLODの面をすべて保持する', async () => {
		const result = await cityJsonTextToGeoJson(text);
		expect(result.geojson.features).toHaveLength(1);
		expect(result.polygonCount).toBe(2);
		expect(result.geojson.features[0].properties['cityjson:lod']).toBe(2.2);
		expect(result.skippedGeometryCount).toBe(0);
	});
	it('transformのXYZ、垂直壁、穴、リングの閉鎖を保持する', async () => {
		const [roof, wall] =
			(await cityJsonTextToGeoJson(text)).geojson.features[0].geometry.coordinates;
		expect(roof).toHaveLength(2);
		expect(roof[0]).toEqual([
			[10, 20, 7],
			[expect.closeTo(10.01, 10), 20, 7],
			[expect.closeTo(10.01, 10), expect.closeTo(20.01, 10), 7],
			[10, expect.closeTo(20.01, 10), 7],
			[
				10,
				20,
				7
			]
		]);
		expect(roof[1][0]).toEqual([expect.closeTo(10.002, 10), expect.closeTo(20.002, 10), 7]);
		expect(wall[0]).toEqual([
			[10, 20, 2],
			[expect.closeTo(10.01, 10), 20, 2],
			[expect.closeTo(10.01, 10), 20, 7],
			[10, 20, 7],
			[
				10,
				20,
				2
			]
		]);
	});
	it('boundsは表示形状から計算し、metadataや未使用頂点に依存しない', async () => {
		expect((await cityJsonTextToGeoJson(text)).bounds).toEqual([
			10,
			20,
			expect.closeTo(10.01, 10),
			expect.closeTo(20.01, 10)
		]);
	});
	it('属性と親子関係を保持し、配列・オブジェクト・nullを文字列化する', async () => {
		const feature = (await cityJsonTextToGeoJson(text)).geojson.features[0];
		expect(feature.id).toBe('test-part');
		expect(feature.properties).toMatchObject({
			name: 'test-object',
			count: 2,
			active: true,
			'test-list': '[1,2]',
			'test-object': '{"test-value":3}',
			'test-null': 'null',
			'cityjson:type': 'BuildingPart',
			'cityjson:parents': '["test-parent"]'
		});
	});
	it.each(['MultiSurface', 'CompositeSurface', 'Solid', 'MultiSolid', 'CompositeSolid'])(
		'面の階層を展開する: %s',
		async type => {
			const input = document();
			const rings = [[[0, 1, 2, 3]]];
			const boundaries = type.includes('Solid')
				? (type === 'Solid' ? [rings, rings] : [[rings, rings], [rings]])
				: rings;
			input.CityObjects = {
				'test-object': {
					type: 'GenericCityObject',
					geometry: [{ type, lod: '1', boundaries }]
				}
			};
			expect((await parse(input)).polygonCount).toBe(
				type === 'Solid' ? 2 : type.includes('Solid') ? 3 : 1
			);
		}
	);
	it('GeometryInstanceの行優先行列と参照点を適用し、テンプレートを再量子化しない', async () => {
		const input = document();
		input.transform = { scale: [2, 3, 4], translate: [10, 20, 5] };
		input.vertices = [[1, 2, 3]];
		input['geometry-templates'] = {
			templates: [surface],
			'vertices-templates': [[0, 0, 0], [1, 0, 0], [1, 1, 1], [0, 1, 1]]
		};
		input.CityObjects = {
			'test-tree': {
				type: 'SolitaryVegetationObject',
				geometry: [{
					type: 'GeometryInstance',
					template: 0,
					boundaries: [0],
					transformationMatrix: [0, -2, 0, 1, 3, 0, 0, 2, 0, 0, 4, 3, 0, 0, 0, 1]
				}]
			}
		};
		const result = await parse(input);
		expect(result.geojson.features[0].geometry.coordinates[0][0]).toEqual([
			[13, 28, 20],
			[13, 31, 20],
			[11, 31, 24],
			[11, 28, 24],
			[13, 28, 20]
		]);
		expect(result.bounds).toEqual([11, 28, 13, 31]);
	});
	it('平面直角座標系をX/Y順に投影しZ値を維持する', async () => {
		const input = document();
		input.metadata = { referenceSystem: 'EPSG:6677' };
		input.transform = { scale: [1, 1, 1], translate: [100, 200, 3] };
		const point = (await parse(input)).geojson.features[0].geometry.coordinates[0][0][0];
		const expected = proj4(getProjContext('6677'), 'EPSG:4326', [100, 200]);
		expect(point[0]).toBeCloseTo(expected[0], 10);
		expect(point[1]).toBeCloseTo(expected[1], 10);
		expect(point[2]).toBe(13);
	});
	it('座標系不明を経緯度と決めつけず、手動指定で再開できる', async () => {
		const input = document();
		delete input.metadata;
		await expect(parse(input)).rejects.toThrow('水平座標系を指定');
		expect((await cityJsonTextToGeoJson(JSON.stringify(input), { crs: 'EPSG:4326' })).bounds)
			.toEqual([10, 20, expect.closeTo(10.01, 10), expect.closeTo(20.01, 10)]);
	});
	it('対応EPSG、UTM、PROJ文字列を解決し未知のコードは拒否する', () => {
		expect(resolveCityJsonCrs('EPSG:32632')).toContain('+zone=32');
		expect(resolveCityJsonCrs('EPSG:32732')).toContain('+south');
		expect(resolveCityJsonCrs('EPSG:6697')).toBe(getProjContext('6668'));
		expect(resolveCityJsonCrs('https://www.opengis.net/def/crs/OGC/0/CRS84h')).toBe(
			'EPSG:4326'
		);
		expect(resolveCityJsonCrs('+proj=longlat +datum=WGS84')).toBe('+proj=longlat +datum=WGS84');
		expect(() => resolveCityJsonCrs('EPSG:999999')).toThrow('未対応');
	});
	it('点・線の除外とappearanceの省略を返す', async () => {
		const input = document();
		input.appearance = { materials: [] };
		input.CityObjects['test-line'] = {
			type: 'Road',
			geometry: [{ type: 'MultiLineString', lod: '1', boundaries: [[0, 1]] }]
		};
		const result = await parse(input);
		expect(result.skippedGeometryCount).toBe(1);
		expect(result.hasAppearance).toBe(true);
	});
	it('1.0は非量子化座標と数値LODを受け付ける', async () => {
		const input = document();
		input.version = '1.0';
		delete input.transform;
		input.CityObjects = {
			'test-object': { type: 'Building', geometry: [{ ...surface, lod: 1 }] }
		};
		expect((await parse(input)).bounds).toEqual([0, 0, 10, 10]);
	});
	it.each(['1.1', '2.0'])('対応バージョン: %s', async version => {
		const input = document();
		input.version = version;
		expect((await parse(input)).polygonCount).toBe(2);
	});
	it.each(
		[
			['参照番号', (input: TestDocument) => {
				input.vertices = [];
			}],
			['transform', (input: TestDocument) => {
				delete input.transform;
			}],
			['XYZ', (input: TestDocument) => {
				input.vertices[4] = [0, 0];
			}],
			['バージョン', (input: TestDocument) => {
				input.version = '9.0';
			}],
			['表示できる面', (input: TestDocument) => {
				input.CityObjects = {};
			}],
			['地図の範囲外', (input: TestDocument) => {
				input.transform!.translate = [1000, 1000, 0];
			}],
			['3頂点', (input: TestDocument) => {
				input.CityObjects = {
					'test-object': { geometry: [{ ...surface, boundaries: [[[0, 1]]] }] }
				};
			}]
		] as const
	)('不正入力を具体的に報告する: %s', async (message, change) => {
		const input = document();
		change(input);
		await expect(parse(input)).rejects.toThrow(message);
	});
	it('JSON以外やCityJSONFeatureを受け付けない', async () => {
		await expect(cityJsonTextToGeoJson('{')).rejects.toThrow('JSONとして');
		await expect(cityJsonTextToGeoJson('{"type":"CityJSONFeature"}')).rejects.toThrow('type');
	});
	it('entryから既存の垂直面対応deck.glレイヤーに接続する', async () => {
		const result = await cityJsonTextToGeoJson(text);
		const entry = createCityJsonEntry('test-layer', result);
		expect(entry.format.type).toBe('geojson-3d');
		expect(entry.metaData.bounds).toEqual(result.bounds);
		expect(entry.format.data).toBe(result.geojson);
		const layer = createDeckVectorLayer(entry);
		expect(layer.props).toMatchObject({ filled: true, extruded: false, _full3d: true });
	});
	it('汎用JSONのルートだけを判定し、BOMを受け付ける', async () => {
		expect(await isCityJsonFile(new File(['\uFEFF' + text], 'test.json'))).toBe(true);
		expect(
			await isCityJsonFile(
				new File(
					['{"type":"FeatureCollection","properties":{"type":"CityJSON"}}'],
					'test.json'
				)
			)
		).toBe(false);
	});
});
