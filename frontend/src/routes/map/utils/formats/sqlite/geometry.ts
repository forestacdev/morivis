import type { TabularCellValue } from '$routes/map/utils/formats/tabular';
import type { Geometry } from '$routes/map/types/geometry';

type ParsedGeometryResult = {
	geometry: Geometry;
	bytesRead: number;
};

const readFloat64 = (buf: Uint8Array, offset: number, littleEndian: boolean): number => {
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	return view.getFloat64(offset, littleEndian);
};

const readUint32 = (buf: Uint8Array, offset: number, littleEndian: boolean): number => {
	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	return view.getUint32(offset, littleEndian);
};

const getDimensionInfo = (
	typeCode: number
): { baseType: number; coordinateValueCount: number; } | null => {
	if (!Number.isFinite(typeCode)) return null;

	const normalizedTypeCode = Math.trunc(typeCode);
	const baseType = normalizedTypeCode % 1000;
	const hasZ = normalizedTypeCode >= 1000 && normalizedTypeCode < 2000
		|| normalizedTypeCode >= 3000;
	const hasM = normalizedTypeCode >= 2000 && normalizedTypeCode < 3000
		|| normalizedTypeCode >= 3000;

	return {
		baseType,
		coordinateValueCount: 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0)
	};
};

const readCoordinate = (
	buf: Uint8Array,
	offset: number,
	littleEndian: boolean,
	coordinateValueCount: number
): { coordinate: [number, number]; bytesRead: number; } | null => {
	const bytesRead = coordinateValueCount * 8;
	if (offset + bytesRead > buf.length) return null;

	return {
		coordinate: [
			readFloat64(buf, offset, littleEndian),
			readFloat64(buf, offset + 8, littleEndian)
		],
		bytesRead
	};
};

const parseWkbGeometryAt = (buf: Uint8Array, startOffset: number): ParsedGeometryResult | null => {
	if (startOffset + 5 > buf.length) return null;

	const endianMarker = buf[startOffset];
	if (endianMarker !== 0 && endianMarker !== 1) return null;

	const littleEndian = endianMarker === 1;
	const dimensionInfo = getDimensionInfo(readUint32(buf, startOffset + 1, littleEndian));
	if (!dimensionInfo) return null;

	let offset = startOffset + 5;

	const readLineStringCoordinates = (): [number, number][] | null => {
		if (offset + 4 > buf.length) return null;
		const pointCount = readUint32(buf, offset, littleEndian);
		offset += 4;

		const coordinates: [number, number][] = [];
		for (let index = 0; index < pointCount; index += 1) {
			const result = readCoordinate(
				buf,
				offset,
				littleEndian,
				dimensionInfo.coordinateValueCount
			);
			if (!result) return null;
			coordinates.push(result.coordinate);
			offset += result.bytesRead;
		}

		return coordinates;
	};

	const readPolygonCoordinates = (): [number, number][][] | null => {
		if (offset + 4 > buf.length) return null;
		const ringCount = readUint32(buf, offset, littleEndian);
		offset += 4;

		const rings: [number, number][][] = [];
		for (let index = 0; index < ringCount; index += 1) {
			const ring = readLineStringCoordinates();
			if (!ring) return null;
			rings.push(ring);
		}

		return rings;
	};

	switch (dimensionInfo.baseType) {
		case 1: {
			const result = readCoordinate(
				buf,
				offset,
				littleEndian,
				dimensionInfo.coordinateValueCount
			);
			if (!result) return null;
			offset += result.bytesRead;

			return {
				geometry: { type: 'Point', coordinates: result.coordinate },
				bytesRead: offset - startOffset
			};
		}
		case 2: {
			const coordinates = readLineStringCoordinates();
			if (!coordinates) return null;

			return {
				geometry: { type: 'LineString', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 3: {
			const coordinates = readPolygonCoordinates();
			if (!coordinates) return null;

			return {
				geometry: { type: 'Polygon', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 4: {
			if (offset + 4 > buf.length) return null;
			const pointCount = readUint32(buf, offset, littleEndian);
			offset += 4;

			const coordinates: [number, number][] = [];
			for (let index = 0; index < pointCount; index += 1) {
				const child = parseWkbGeometryAt(buf, offset);
				if (!child || child.geometry.type !== 'Point') return null;
				coordinates.push(child.geometry.coordinates);
				offset += child.bytesRead;
			}

			return {
				geometry: { type: 'MultiPoint', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 5: {
			if (offset + 4 > buf.length) return null;
			const lineCount = readUint32(buf, offset, littleEndian);
			offset += 4;

			const coordinates: [number, number][][] = [];
			for (let index = 0; index < lineCount; index += 1) {
				const child = parseWkbGeometryAt(buf, offset);
				if (!child || child.geometry.type !== 'LineString') return null;
				coordinates.push(child.geometry.coordinates);
				offset += child.bytesRead;
			}

			return {
				geometry: { type: 'MultiLineString', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 6: {
			if (offset + 4 > buf.length) return null;
			const polygonCount = readUint32(buf, offset, littleEndian);
			offset += 4;

			const coordinates: [number, number][][][] = [];
			for (let index = 0; index < polygonCount; index += 1) {
				const child = parseWkbGeometryAt(buf, offset);
				if (!child || child.geometry.type !== 'Polygon') return null;
				coordinates.push(child.geometry.coordinates);
				offset += child.bytesRead;
			}

			return {
				geometry: { type: 'MultiPolygon', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 7: {
			if (offset + 4 > buf.length) return null;
			const geometryCount = readUint32(buf, offset, littleEndian);
			offset += 4;

			const geometries: Geometry[] = [];
			for (let index = 0; index < geometryCount; index += 1) {
				const child = parseWkbGeometryAt(buf, offset);
				if (!child) return null;
				geometries.push(child.geometry);
				offset += child.bytesRead;
			}

			return {
				geometry: { type: 'GeometryCollection', geometries } as Geometry,
				bytesRead: offset - startOffset
			};
		}
		default:
			return null;
	}
};

const parseWkb = (buf: Uint8Array): Geometry | null => parseWkbGeometryAt(buf, 0)?.geometry ?? null;

const parseGpkgBinary = (buf: Uint8Array): Geometry | null => {
	if (buf.length < 8) return null;
	if (buf[0] !== 0x47 || buf[1] !== 0x50) return null;

	const flags = buf[3];
	const envelopeType = (flags >> 1) & 0x07;
	const envelopeSizes = [0, 32, 48, 48, 64];
	const envelopeSize = envelopeSizes[envelopeType] ?? 0;
	const wkbOffset = 8 + envelopeSize;
	if (wkbOffset >= buf.length) return null;

	return parseWkb(buf.subarray(wkbOffset));
};

const parseSpatiaLiteGeometryPayload = (
	buf: Uint8Array,
	startOffset: number,
	littleEndian: boolean,
	typeCode: number
): ParsedGeometryResult | null => {
	const dimensionInfo = getDimensionInfo(typeCode);
	if (!dimensionInfo) return null;

	let offset = startOffset;

	const readLineStringCoordinates = (): [number, number][] | null => {
		if (offset + 4 > buf.length) return null;
		const pointCount = readUint32(buf, offset, littleEndian);
		offset += 4;

		const coordinates: [number, number][] = [];
		for (let index = 0; index < pointCount; index += 1) {
			const result = readCoordinate(
				buf,
				offset,
				littleEndian,
				dimensionInfo.coordinateValueCount
			);
			if (!result) return null;
			coordinates.push(result.coordinate);
			offset += result.bytesRead;
		}

		return coordinates;
	};

	const readPolygonCoordinates = (): [number, number][][] | null => {
		if (offset + 4 > buf.length) return null;
		const ringCount = readUint32(buf, offset, littleEndian);
		offset += 4;

		const rings: [number, number][][] = [];
		for (let index = 0; index < ringCount; index += 1) {
			const ring = readLineStringCoordinates();
			if (!ring) return null;
			rings.push(ring);
		}

		return rings;
	};

	const readCollectionEntity = (): ParsedGeometryResult | null => {
		if (offset + 5 > buf.length) return null;
		if (buf[offset] !== 0x69) return null;

		const childTypeCode = readUint32(buf, offset + 1, littleEndian);
		const child = parseSpatiaLiteGeometryPayload(
			buf,
			offset + 5,
			littleEndian,
			childTypeCode
		);
		if (!child) return null;

		return {
			geometry: child.geometry,
			bytesRead: 5 + child.bytesRead
		};
	};

	switch (dimensionInfo.baseType) {
		case 1: {
			const result = readCoordinate(
				buf,
				offset,
				littleEndian,
				dimensionInfo.coordinateValueCount
			);
			if (!result) return null;
			offset += result.bytesRead;

			return {
				geometry: { type: 'Point', coordinates: result.coordinate },
				bytesRead: offset - startOffset
			};
		}
		case 2: {
			const coordinates = readLineStringCoordinates();
			if (!coordinates) return null;

			return {
				geometry: { type: 'LineString', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 3: {
			const coordinates = readPolygonCoordinates();
			if (!coordinates) return null;

			return {
				geometry: { type: 'Polygon', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 4: {
			if (offset + 4 > buf.length) return null;
			const pointCount = readUint32(buf, offset, littleEndian);
			offset += 4;

			const coordinates: [number, number][] = [];
			for (let index = 0; index < pointCount; index += 1) {
				const child = readCollectionEntity();
				if (!child || child.geometry.type !== 'Point') return null;
				coordinates.push(child.geometry.coordinates);
				offset += child.bytesRead;
			}

			return {
				geometry: { type: 'MultiPoint', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 5: {
			if (offset + 4 > buf.length) return null;
			const lineCount = readUint32(buf, offset, littleEndian);
			offset += 4;

			const coordinates: [number, number][][] = [];
			for (let index = 0; index < lineCount; index += 1) {
				const child = readCollectionEntity();
				if (!child || child.geometry.type !== 'LineString') return null;
				coordinates.push(child.geometry.coordinates);
				offset += child.bytesRead;
			}

			return {
				geometry: { type: 'MultiLineString', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 6: {
			if (offset + 4 > buf.length) return null;
			const polygonCount = readUint32(buf, offset, littleEndian);
			offset += 4;

			const coordinates: [number, number][][][] = [];
			for (let index = 0; index < polygonCount; index += 1) {
				const child = readCollectionEntity();
				if (!child || child.geometry.type !== 'Polygon') return null;
				coordinates.push(child.geometry.coordinates);
				offset += child.bytesRead;
			}

			return {
				geometry: { type: 'MultiPolygon', coordinates },
				bytesRead: offset - startOffset
			};
		}
		case 7: {
			if (offset + 4 > buf.length) return null;
			const geometryCount = readUint32(buf, offset, littleEndian);
			offset += 4;

			const geometries: Geometry[] = [];
			for (let index = 0; index < geometryCount; index += 1) {
				const child = readCollectionEntity();
				if (!child) return null;
				geometries.push(child.geometry);
				offset += child.bytesRead;
			}

			return {
				geometry: { type: 'GeometryCollection', geometries } as Geometry,
				bytesRead: offset - startOffset
			};
		}
		default:
			return null;
	}
};

const parseSpatiaLiteTinyPointBinary = (buf: Uint8Array): Geometry | null => {
	if (buf.length < 24) return null;
	if (buf[0] !== 0x00 || buf[buf.length - 1] !== 0xfe) return null;

	const endianMarker = buf[1];
	if (endianMarker !== 0x80 && endianMarker !== 0x81) return null;

	const littleEndian = endianMarker === 0x81;
	const tinyPointType = buf[6];
	const typeCode = tinyPointType === 1
		? 1
		: tinyPointType === 2
			? 1001
			: tinyPointType === 3
				? 2001
				: tinyPointType === 4
					? 3001
					: null;
	if (!typeCode) return null;

	const result = parseSpatiaLiteGeometryPayload(
		buf.subarray(0, buf.length - 1),
		7,
		littleEndian,
		typeCode
	);
	if (!result) return null;

	return result.geometry.type === 'Point' ? result.geometry : null;
};

const parseSpatiaLiteBinary = (buf: Uint8Array): Geometry | null => {
	if (buf.length < 24) return null;
	if (buf[0] !== 0x00 || buf[buf.length - 1] !== 0xfe) return null;

	if (buf[1] === 0x80 || buf[1] === 0x81) {
		return parseSpatiaLiteTinyPointBinary(buf);
	}

	if (buf.length < 60 || buf[38] !== 0x7c) return null;
	if (buf[1] !== 0x00 && buf[1] !== 0x01) return null;

	const littleEndian = buf[1] === 0x01;
	const typeCode = readUint32(buf, 39, littleEndian);
	const payload = buf.subarray(43, buf.length - 1);
	const result = parseSpatiaLiteGeometryPayload(payload, 0, littleEndian, typeCode);
	if (!result || result.bytesRead !== payload.length) return null;

	return result.geometry;
};

export const parseGeometryBlob = (value: TabularCellValue): Geometry | null => {
	if (!(value instanceof Uint8Array)) return null;
	return parseGpkgBinary(value) ?? parseSpatiaLiteBinary(value) ?? parseWkb(value);
};
