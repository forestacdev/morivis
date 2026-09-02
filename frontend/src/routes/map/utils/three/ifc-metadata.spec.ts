import { describe, expect, it } from 'vitest';

import {
	getIfcCoordinateMode,
	hasIfcGeographicCoordinates,
	parseIfcHeaderMetadata
} from './ifc-metadata';

describe('hasIfcGeographicCoordinates', () => {
	it('緯度経度がない IFC は座標系の選択が必要になる', () => {
		expect(hasIfcGeographicCoordinates({ placementQuality: 'normalized' })).toBe(false);
	});

	it('緯度経度を持つ IFC は地理配置できる', () => {
		expect(hasIfcGeographicCoordinates({ lng: 136.1, lat: 35.2 })).toBe(true);
	});
});

describe('parseIfcHeaderMetadata', () => {
	it('FILE_NAMEの作成元ソフトウェアを説明文にする', () => {
		const metadata = parseIfcHeaderMetadata(
			"FILE_NAME('test.ifc','2026-01-01T00:00:00',('test-author'),('test-org'),'test-preprocessor','test-application','');"
		);

		expect(metadata).toEqual({
			description: 'IFCファイル。作成元ソフト: test-application。'
		});
	});

	it('FILE_NAMEがない場合は空のメタデータを返す', () => {
		expect(parseIfcHeaderMetadata('HEADER; ENDSEC;')).toEqual({});
	});
});

describe('getIfcCoordinateMode', () => {
	it('原点付近の座標群をローカル座標と判定する', () => {
		expect(
			getIfcCoordinateMode('IFCCARTESIANPOINT((12.5,-8.25,0.)); IFCCARTESIANPOINT((15.,4.,0.));')
		).toBe('local');
	});

	it('大半が大きい座標値なら絶対座標と判定する', () => {
		expect(
			getIfcCoordinateMode('IFCCARTESIANPOINT((42000.,-56000.,0.)); IFCCARTESIANPOINT((43000.,-57000.,0.));')
		).toBe('absolute');
	});
});
