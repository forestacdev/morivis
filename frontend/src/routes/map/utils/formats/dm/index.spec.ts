import { describe, expect, it } from 'vitest';
import { convertDMArrayBufferToGeoJSON, convertDMtoGeoJSON, getDMInfoFromArrayBuffer } from '.';
import {
	dmText,
	drawingRecords,
	elementRecords,
	encode,
	indexRecord,
	innerRing,
	legacyText,
	outerRing,
	record
} from './__fixtures__/records';

describe('DMの固定長解析', () => {
	it.each([[1, 1], [10, 10], [999, 1000]])(
		'座標値単位%sをメートルへ変換する',
		(unit, expected) => {
			const text = [
				...drawingRecords('07AB001', unit),
				...elementRecords([[0, 1000]], { type: '5' })
			].join('\n');
			expect(convertDMtoGeoJSON(text).features[0].geometry.coordinates).toEqual([
				expected,
				0
			]);
		}
	);
	it('日本語を含む84バイトの図郭から名称・地図情報レベル・形状を読む', async () => {
		const input = encode(dmText(elementRecords(outerRing)));
		const result = await convertDMArrayBufferToGeoJSON(input);
		expect(result.properties).toMatchObject({
			mapLevel: 1000,
			coordinateSystem: 7,
			epsgCode: null
		});
		expect(result.features[0].geometry.coordinates).toEqual([[[0, 0], [0, 1], [1, 1], [1, 0], [
			0,
			0
		]]]);
		expect(await getDMInfoFromArrayBuffer(input)).toMatchObject({
			drawingName: '試験図郭',
			zone: 7,
			zoneSource: 'drawing'
		});
	});
	it('Iレコードの後でもE要素を読み、インデックスの系番号を優先する', async () => {
		const text = indexRecord(5) + '\r\n' + dmText(elementRecords(outerRing));
		const result = convertDMtoGeoJSON(text);
		expect(result.features).toHaveLength(1);
		expect(result.properties).toMatchObject({
			coordinateSystem: 5,
			planningOrganization: '試験機関'
		});
		expect(await getDMInfoFromArrayBuffer(encode(text))).toMatchObject({
			indexZone: 5,
			zone: 5,
			zoneSource: 'index'
		});
	});
	it('DMIを優先する', async () => {
		const info = await getDMInfoFromArrayBuffer(encode(indexRecord(5) + '\r\n' + dmText()), [
			encode(indexRecord(3))
		]);
		expect(info).toMatchObject({ zone: 3, zoneSource: 'dmi' });
	});
	it('不明な系番号を2系・9系に置き換えない', async () => {
		const text = [...drawingRecords('test-dm'), ...elementRecords(outerRing)].join('\n');
		expect(convertDMtoGeoJSON(text).properties?.coordinateSystem).toBeNull();
		expect(await getDMInfoFromArrayBuffer(encode(text))).toMatchObject({
			zone: null,
			zoneSource: null
		});
	});
	it('従来のF/D2形式とゼロ座標を維持する', () => {
		const result = convertDMtoGeoJSON(legacyText);
		expect(result.features[0].geometry).toEqual({
			type: 'LineString',
			coordinates: [[1, 0], [3, 2]]
		});
		expect(result.properties?.coordinateSystem).toBe(4);
	});
	it('負数で始まる座標レコードを読む', () => {
		const result = convertDMtoGeoJSON(
			dmText(elementRecords([[-100000, 2000], [-90000, 3000]], { type: '2' }))
		);
		expect(result.features[0].geometry.coordinates).toEqual([[2, -100], [3, -90]]);
	});
	it('3D座標の標高を維持する', () => {
		const result = convertDMtoGeoJSON(
			dmText(elementRecords([[0, 1000, 5000], [2000, 3000, 5000]], { type: '2' }))
		);
		expect(result.features[0].properties.elevation).toBe(5);
	});
	it('図形区分31の中庭を外周に組み込み、独立した塗り面を残さない', () => {
		const result = convertDMtoGeoJSON(
			dmText(elementRecords(outerRing), elementRecords(innerRing, { figureType: 31 }))
		);
		expect(result.features).toHaveLength(1);
		expect(result.features[0].geometry.coordinates).toHaveLength(2);
	});
	it('点の代表座標が0でも読める', () => {
		const result = convertDMtoGeoJSON(
			dmText([
				record([[1, 'E53001'], [21, 2], [28, '   0'], [36, '      0'], [43, '   1000']])
			])
		);
		expect(result.features[0].geometry).toEqual({ type: 'Point', coordinates: [1, 0] });
	});
	it('日本語注記を代表座標に置く', () => {
		const result = convertDMtoGeoJSON(dmText([
			record([[1, 'E78101'], [21, 4], [28, '   2'], [32, '   1'], [36, '   2000'], [
				43,
				'   1000'
			]]),
			record([[1, 0], [2, '     15'], [9, '   20'], [21, '試験']])
		]));
		expect(result.features[0].geometry).toEqual({ type: 'Point', coordinates: [1, 2] });
		expect(result.features[0].properties).toMatchObject({
			text: '試験',
			angle: 15,
			height: 20
		});
	});
});
