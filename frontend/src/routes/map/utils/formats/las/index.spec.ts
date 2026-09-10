import { describe, expect, it } from 'vitest';

import { getLasProjection } from '.';

const writeAscii = (bytes: Uint8Array, offset: number, value: string) => {
	bytes.set(new TextEncoder().encode(value), offset);
};

const createLasWithProjectedEpsg = (epsg: number) => {
	const headerSize = 227;
	const geoKeyLength = 16;
	const pointDataOffset = headerSize + 54 + geoKeyLength;
	const bytes = new Uint8Array(pointDataOffset);
	const view = new DataView(bytes.buffer);
	writeAscii(bytes, 0, 'LASF');
	view.setUint16(94, headerSize, true);
	view.setUint32(96, pointDataOffset, true);
	view.setUint32(100, 1, true);
	writeAscii(bytes, headerSize + 2, 'LASF_Projection');
	view.setUint16(headerSize + 18, 34735, true);
	view.setUint16(headerSize + 20, geoKeyLength, true);

	const geoKeyOffset = headerSize + 54;
	view.setUint16(geoKeyOffset, 1, true);
	view.setUint16(geoKeyOffset + 2, 1, true);
	view.setUint16(geoKeyOffset + 4, 0, true);
	view.setUint16(geoKeyOffset + 6, 1, true);
	view.setUint16(geoKeyOffset + 8, 3072, true);
	view.setUint16(geoKeyOffset + 10, 0, true);
	view.setUint16(geoKeyOffset + 12, 1, true);
	view.setUint16(geoKeyOffset + 14, epsg, true);
	return bytes.buffer;
};

const createLasWithWkt = (wkt: string) => {
	const headerSize = 227;
	const wktBytes = new TextEncoder().encode(wkt);
	const pointDataOffset = headerSize + 54 + wktBytes.byteLength;
	const bytes = new Uint8Array(pointDataOffset);
	const view = new DataView(bytes.buffer);
	writeAscii(bytes, 0, 'LASF');
	view.setUint16(94, headerSize, true);
	view.setUint32(96, pointDataOffset, true);
	view.setUint32(100, 1, true);
	writeAscii(bytes, headerSize + 2, 'LASF_Projection');
	view.setUint16(headerSize + 18, 2112, true);
	view.setUint16(headerSize + 20, wktBytes.byteLength, true);
	bytes.set(wktBytes, headerSize + 54);
	return bytes.buffer;
};

describe('LAS projection metadata', () => {
	it('GeoTIFF VLR の WGS84 UTM 座標系を Proj4 定義へ変換する', () => {
		expect(getLasProjection(createLasWithProjectedEpsg(32610))).toEqual({
			epsg: 32610,
			definition: '+proj=utm +zone=10 +datum=WGS84 +units=m +no_defs',
			coordinateType: 'projected'
		});
	});

	it('WKT VLR の投影座標系を Proj4 定義へ変換する', () => {
		expect(
			getLasProjection(
				createLasWithWkt('PROJCS["Synthetic UTM",AUTHORITY["EPSG","32610"]]')
			)
		).toEqual({
			epsg: 32610,
			definition: '+proj=utm +zone=10 +datum=WGS84 +units=m +no_defs',
			coordinateType: 'projected'
		});
	});

	it('座標系 VLR がない LAS は null を返す', () => {
		expect(getLasProjection(new ArrayBuffer(104))).toBeNull();
	});
});
