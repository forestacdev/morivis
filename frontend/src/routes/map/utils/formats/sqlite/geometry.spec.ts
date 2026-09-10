import { describe, expect, it } from 'vitest';

import { parseGeometryBlob } from './geometry';

const createPointPayload = (x: number, y: number): Uint8Array => {
	const payload = new Uint8Array(16);
	const view = new DataView(payload.buffer);
	view.setFloat64(0, x, true);
	view.setFloat64(8, y, true);
	return payload;
};

const createWkbPoint = (x: number, y: number, srid?: number): Uint8Array => {
	const bytes = new Uint8Array(srid == null ? 21 : 25);
	const view = new DataView(bytes.buffer);
	bytes[0] = 0x01;
	view.setUint32(1, srid == null ? 1 : 0x20000001, true);
	let offset = 5;
	if (srid != null) {
		view.setUint32(offset, srid, true);
		offset += 4;
	}
	view.setFloat64(offset, x, true);
	view.setFloat64(offset + 8, y, true);
	return bytes;
};

const createCollectionEntity = (typeCode: number, payload: Uint8Array): Uint8Array => {
	const bytes = new Uint8Array(5 + payload.length);
	const view = new DataView(bytes.buffer);
	bytes[0] = 0x69;
	view.setUint32(1, typeCode, true);
	bytes.set(payload, 5);
	return bytes;
};

const createClassicSpatiaLiteBlob = (
	typeCode: number,
	payload: Uint8Array,
	bbox: [number, number, number, number],
	srid = 4326
): Uint8Array => {
	const bytes = new Uint8Array(43 + payload.length + 1);
	const view = new DataView(bytes.buffer);

	bytes[0] = 0x00;
	bytes[1] = 0x01;
	view.setUint32(2, srid, true);
	view.setFloat64(6, bbox[0], true);
	view.setFloat64(14, bbox[1], true);
	view.setFloat64(22, bbox[2], true);
	view.setFloat64(30, bbox[3], true);
	bytes[38] = 0x7c;
	view.setUint32(39, typeCode, true);
	bytes.set(payload, 43);
	bytes[bytes.length - 1] = 0xfe;

	return bytes;
};

const createMultiPointPayload = (points: [number, number][]): Uint8Array => {
	const entities = points.map(([x, y]) => createCollectionEntity(1, createPointPayload(x, y)));
	const payload = new Uint8Array(
		4 + entities.reduce((total, entity) => total + entity.length, 0)
	);
	const view = new DataView(payload.buffer);

	view.setUint32(0, points.length, true);

	let offset = 4;
	for (const entity of entities) {
		payload.set(entity, offset);
		offset += entity.length;
	}

	return payload;
};

const createTinyPointBlob = (x: number, y: number, srid = 4326): Uint8Array => {
	const bytes = new Uint8Array(24);
	const view = new DataView(bytes.buffer);

	bytes[0] = 0x00;
	bytes[1] = 0x81;
	view.setUint32(2, srid, true);
	bytes[6] = 0x01;
	view.setFloat64(7, x, true);
	view.setFloat64(15, y, true);
	bytes[23] = 0xfe;

	return bytes;
};

describe('parseGeometryBlob', () => {
	it('plain WKB を読める', () => {
		const geometry = parseGeometryBlob(createWkbPoint(1, 2));

		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
	});

	it('SpatiaLite classic BLOB を読める', () => {
		const geometry = parseGeometryBlob(
			createClassicSpatiaLiteBlob(1, createPointPayload(1, 2), [1, 2, 1, 2])
		);

		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
	});

	it('PostGIS EWKB を読める', () => {
		const geometry = parseGeometryBlob(createWkbPoint(1, 2, 4326));

		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
	});

	it('SpatiaLite multi geometry を読める', () => {
		const points: [number, number][] = [
			[1, 2],
			[3, 4]
		];
		const payload = createMultiPointPayload(points);
		const geometry = parseGeometryBlob(
			createClassicSpatiaLiteBlob(4, payload, [1, 2, 3, 4])
		);

		expect(geometry).toEqual({
			type: 'MultiPoint',
			coordinates: points
		});
	});

	it('SpatiaLite TinyPoint を読める', () => {
		const geometry = parseGeometryBlob(createTinyPointBlob(1, 2));

		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
	});

	it('PostGIS EWKT 文字列を読める', () => {
		const geometry = parseGeometryBlob('SRID=4612;POINT (1 2)');

		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
	});

	it('WKT の Z 値を無視して2次元ジオメトリとして読める', () => {
		const geometry = parseGeometryBlob('LINESTRING Z (1 2 3, 4 5 6)');

		expect(geometry).toEqual({
			type: 'LineString',
			coordinates: [[1, 2], [4, 5]]
		});
	});
});
