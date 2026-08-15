import { describe, expect, it } from 'vitest';

import { parseGeometryBlob } from './geometry';

const hexToBytes = (hex: string): Uint8Array => {
	const normalized = hex.replace(/\s+/g, '');
	const bytes = new Uint8Array(normalized.length / 2);

	for (let index = 0; index < normalized.length; index += 2) {
		bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
	}

	return bytes;
};

const createPointPayload = (x: number, y: number): Uint8Array => {
	const payload = new Uint8Array(16);
	const view = new DataView(payload.buffer);
	view.setFloat64(0, x, true);
	view.setFloat64(8, y, true);
	return payload;
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
		const geometry = parseGeometryBlob(
			hexToBytes('0101000000617DB1E4173B5DC0E0E589FA37F24040')
		);

		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [-116.92333333333, 33.892333333333]
		});
	});

	it('SpatiaLite classic BLOB を読める', () => {
		const geometry = parseGeometryBlob(
			hexToBytes(
				'0001E6100000617DB1E4173B5DC0E0E589FA37F24040617DB1E4173B5DC0E0E589FA37F240407C01000000617DB1E4173B5DC0E0E589FA37F24040FE'
			)
		);

		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [-116.92333333333, 33.892333333333]
		});
	});

	it('PostGIS EWKB を読める', () => {
		const geometry = parseGeometryBlob(
			hexToBytes('0101000020E6100000617DB1E4173B5DC0E0E589FA37F24040')
		);

		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [-116.92333333333, 33.892333333333]
		});
	});

	it('SpatiaLite multi geometry を読める', () => {
		const points: [number, number][] = [
			[139.6917, 35.6895],
			[135.5023, 34.6937]
		];
		const payload = createMultiPointPayload(points);
		const geometry = parseGeometryBlob(
			createClassicSpatiaLiteBlob(4, payload, [135.5023, 34.6937, 139.6917, 35.6895])
		);

		expect(geometry).toEqual({
			type: 'MultiPoint',
			coordinates: points
		});
	});

	it('SpatiaLite TinyPoint を読める', () => {
		const geometry = parseGeometryBlob(createTinyPointBlob(139.6917, 35.6895));

		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [139.6917, 35.6895]
		});
	});
});
