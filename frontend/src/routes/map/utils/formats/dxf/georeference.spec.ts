import { getProjContext } from '$routes/map/utils/proj/dict';
import { meterInMercatorCoordinateUnits } from '$routes/map/utils/three/mercator-model-matrix';
import { MercatorCoordinate } from 'maplibre-gl';
import { readFileSync } from 'node:fs';
import proj4 from 'proj4';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDxf, rescaleDxfResult } from '.';
import { readCadGeoreference } from './georeference';
import { createDxfModel, disposeDxfModel } from './mesh';
import { placeCadModel } from './model-placement';

const text = readFileSync(
	new URL('../dwg/__fixtures__/test-georeferenced.dxf', import.meta.url),
	'utf8'
);

describe('CAD GEODATA', () => {
	it('モデル空間の投影座標系Aliasを取り出し、測地系Aliasや基準点を使わない', () => {
		expect(readCadGeoreference(text)).toEqual({ epsg: '3857', metersPerUnit: 1 });
		const parsed = parseDxf(text);
		expect(parsed.sourceUnitCode).toBe(4);
		expect(parsed.metersPerUnit).toBe(1);
		expect(rescaleDxfResult(parsed, 'mm').metersPerUnit).toBe(0.001);
		expect(rescaleDxfResult(rescaleDxfResult(parsed, 'mm'), 'auto').metersPerUnit).toBe(1);
	});
	it.each([
		['70\n2\n10', '70\n1\n10'],
		['330\nAA\n70', '330\nCC\n70'],
		['95\n1\n294', '95\n2\n294'],
		['41\n1\n210', '41\n0.001\n210'],
		['41\n1\n210', '41\ninvalid\n210'],
		['230\n1\n95', '230\n0\n95'],
		['id="3857" type="CoordinateSystem"', 'id="4326" type="CoordinateSystem"'],
		['<ObjectId>test-crs</ObjectId>', '<ObjectId>test-other</ObjectId>'],
		['</Dictionary>', '</broken>']
	])('未対応・不明な地理参照は自動配置しない (%s)', (from, to) => {
		expect(readCadGeoreference(text.replace(from, to))).toBeUndefined();
	});
	it('DXF文字列の分割と改行エスケープを復元する', () => {
		const chunked = text.replace('</Name>', '</Name>\\P').replace(
			'<Alias id="3857"',
			'\n303\n<Alias id="3857"'
		);
		expect(readCadGeoreference(chunked)?.epsg).toBe('3857');
	});
	it('原点位置・高さを保持し、投影座標の方位と縮尺をモデルへ反映する', async () => {
		const model = createDxfModel(parseDxf(text).geojson);
		try {
			// 架空の座標で、中央子午線から離れた場所の方位補正も検証する。
			model.userData.sourceOrigin = [20000, 10000, 12];
			const placement = await placeCadModel(model, { epsg: '6677', metersPerUnit: 1 });
			const project = proj4(getProjContext('6677'), 'EPSG:4326');
			const expected = project.forward([20000, 10000]);
			expect([placement.lng, placement.lat]).toEqual(expected);
			expect(placement.altitude).toBe(12);
			expect(placement.preserveLocalOrigin).toBe(true);
			const base = MercatorCoordinate.fromLngLat([expected[0], expected[1]]);
			const next = project.forward([20001, 10000]);
			const target = MercatorCoordinate.fromLngLat([next[0], next[1]]);
			const actual = new Vector3(1, 0, 0).applyMatrix4(model.matrix);
			expect(actual.x).toBeCloseTo(
				(target.x - base.x) / meterInMercatorCoordinateUnits(placement.lat),
				7
			);
			expect(actual.z).toBeCloseTo(
				(target.y - base.y) / meterInMercatorCoordinateUnits(placement.lat),
				7
			);
			expect(new Vector3().applyMatrix4(model.matrix).length()).toBe(0);
		} finally {
			disposeDxfModel(model);
		}
	});
});
