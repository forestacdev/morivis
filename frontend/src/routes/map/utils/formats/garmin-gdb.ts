import type { FeatureCollection } from '$routes/map/types/geojson';
import type { LineStringGeometry, PointGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

const GARMIN_SEMICIRCLE_SCALE = 180 / 2147483648;
const GARMIN_GDB_SIGNATURE = 'MsRcf';
const TRACK_COLOR_OFFSET = 0;
const WAYPOINT_SUBCLASS_BYTES = 22;
const DEFINITION_RECORD_PREFIX = 'D';
const METADATA_RECORD_TYPE = 'A';

export type GarminGdbVersion = 1 | 2 | 3;
export type GarminGdbApplication = 'MapSource' | 'BaseCamp';
export type GarminGdbDataType = 'waypoints' | 'routes' | 'tracks';
type GarminGdbRecordType = 'W' | 'R' | 'T' | 'V';

interface GarminWaypoint {
	name: string;
	coordinates: [number, number];
	altitude: number | null;
	waypointClass: number;
	countryCode: string;
}

interface GarminRoute {
	name: string;
	pointNames: string[];
	coordinates: [number, number][];
	routePointCount: number;
	shapingPointCount: number;
}

interface GarminTrackPoint {
	coordinates: [number, number];
	altitude: number | null;
	time: number | null;
	depth: number | null;
	temperature: number | null;
}

interface GarminTrack {
	name: string;
	colorIndex: number;
	points: GarminTrackPoint[];
}

export interface GarminGdbParseResult {
	version: GarminGdbVersion;
	application: GarminGdbApplication;
	waypoints: GarminWaypoint[];
	routes: GarminRoute[];
	tracks: GarminTrack[];
}

interface GarminGdbHeader {
	version: GarminGdbVersion;
	application: GarminGdbApplication;
}

interface GarminRouteBounds {
	maxLatitude: number;
	maxLongitude: number;
	maxAltitude: number | null;
	minLatitude: number;
	minLongitude: number;
	minAltitude: number | null;
}

class BinaryReader {
	private readonly view: DataView;
	private readonly bytes: Uint8Array;
	private cursor = 0;

	constructor(bytes: Uint8Array) {
		this.bytes = bytes;
		this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	}

	get remaining() {
		return this.bytes.length - this.cursor;
	}

	get position() {
		return this.cursor;
	}

	seek(offset: number) {
		if (offset < 0 || offset > this.bytes.length) {
			throw new Error('Garmin GDB reader seek out of bounds');
		}
		this.cursor = offset;
	}

	skip(length: number) {
		this.seek(this.cursor + length);
	}

	readUint8() {
		this.ensureAvailable(1);
		const value = this.view.getUint8(this.cursor);
		this.cursor += 1;
		return value;
	}

	readUint16LE() {
		this.ensureAvailable(2);
		const value = this.view.getUint16(this.cursor, true);
		this.cursor += 2;
		return value;
	}

	readUint32LE() {
		this.ensureAvailable(4);
		const value = this.view.getUint32(this.cursor, true);
		this.cursor += 4;
		return value;
	}

	readInt32LE() {
		this.ensureAvailable(4);
		const value = this.view.getInt32(this.cursor, true);
		this.cursor += 4;
		return value;
	}

	readFloat64LE() {
		this.ensureAvailable(8);
		const value = this.view.getFloat64(this.cursor, true);
		this.cursor += 8;
		return value;
	}

	readBytes(length: number) {
		this.ensureAvailable(length);
		const value = this.bytes.subarray(this.cursor, this.cursor + length);
		this.cursor += length;
		return value;
	}

	readFixedAscii(length: number) {
		return new TextDecoder('ascii', { fatal: false }).decode(this.readBytes(length));
	}

	readCString() {
		const start = this.cursor;
		while (this.cursor < this.bytes.length && this.bytes[this.cursor] !== 0) {
			this.cursor += 1;
		}
		const text = new TextDecoder('utf-8', { fatal: false }).decode(
			this.bytes.subarray(start, this.cursor)
		);
		if (this.cursor < this.bytes.length && this.bytes[this.cursor] === 0) {
			this.cursor += 1;
		}
		return text;
	}

	readLatLon() {
		return this.readInt32LE() * GARMIN_SEMICIRCLE_SCALE;
	}

	readOptionalFloat64() {
		if (this.remaining < 1) return null;
		const hasValue = this.readUint8();
		if (hasValue !== 1) return null;
		return this.readFloat64LE();
	}

	readOptionalTime() {
		if (this.remaining < 1) return null;
		const hasValue = this.readUint8();
		if (hasValue !== 1) return null;
		return this.readInt32LE();
	}

	private ensureAvailable(length: number) {
		if (this.cursor + length > this.bytes.length) {
			throw new Error('Garmin GDB reader ran past record boundary');
		}
	}
}

const isRecognizedApplication = (value: string): value is GarminGdbApplication => {
	return value === 'MapSource' || value === 'BaseCamp';
};

const readGarminGdbHeader = (reader: BinaryReader): GarminGdbHeader => {
	const signatureBytes = reader.readBytes(6);
	const signature = new TextDecoder('ascii', { fatal: false }).decode(signatureBytes);
	if (signature !== `${GARMIN_GDB_SIGNATURE}\0`) {
		throw new Error('Garmin GDB 形式ではありません');
	}

	const definitionRecordLength = reader.readUint32LE();
	const definitionRecord = reader.readFixedAscii(definitionRecordLength);
	if (definitionRecord.length < 2 || definitionRecord[0] !== DEFINITION_RECORD_PREFIX) {
		throw new Error('Garmin GDB の定義レコードが不正です');
	}

	const version = (definitionRecord.charCodeAt(1) - 'k'.charCodeAt(0) + 1) as GarminGdbVersion;
	if (version !== 1 && version !== 2 && version !== 3) {
		throw new Error(`Garmin GDB version ${version} は未対応です`);
	}

	// GPSBabel の gdb.cc と同じく、定義レコードの直後に 1 byte の区切りが入る。
	reader.skip(1);

	const metadataRecordLength = reader.readUint32LE();
	const metadataRecordType = String.fromCharCode(reader.readUint8());
	if (metadataRecordType !== METADATA_RECORD_TYPE) {
		throw new Error('Garmin GDB の metadata レコードが不正です');
	}
	reader.skip(metadataRecordLength);

	const application = reader.readCString();
	if (!isRecognizedApplication(application)) {
		throw new Error('Garmin GDB の application header を認識できません');
	}

	return {
		version,
		application
	};
};

const readRouteBounds = (reader: BinaryReader): GarminRouteBounds | null => {
	const isMissingBounds = reader.readUint8();
	if (isMissingBounds !== 0) return null;

	return {
		maxLatitude: reader.readLatLon(),
		maxLongitude: reader.readLatLon(),
		maxAltitude: reader.readOptionalFloat64(),
		minLatitude: reader.readLatLon(),
		minLongitude: reader.readLatLon(),
		minAltitude: reader.readOptionalFloat64()
	} satisfies GarminRouteBounds;
};

const readWaypointCommon = (reader: BinaryReader) => {
	const name = reader.readCString();
	const waypointClass = reader.readInt32LE();
	const countryCode = reader.readCString();
	reader.skip(Math.min(WAYPOINT_SUBCLASS_BYTES, reader.remaining));
	const latitude = reader.readLatLon();
	const longitude = reader.readLatLon();
	const altitude = reader.readOptionalFloat64();

	return {
		name,
		coordinates: [longitude, latitude] as [number, number],
		altitude,
		waypointClass,
		countryCode
	} satisfies GarminWaypoint;
};

const readWaypointV1 = (reader: BinaryReader) => readWaypointCommon(reader);
const readWaypointV2 = (reader: BinaryReader) => readWaypointCommon(reader);
const readWaypointV3 = (reader: BinaryReader) => readWaypointCommon(reader);

const readTrackCommon = (reader: BinaryReader) => {
	const name = reader.readCString();
	reader.readUint8();
	const colorIndex = reader.readInt32LE();
	const pointCount = reader.readInt32LE();

	const points: GarminTrackPoint[] = [];
	for (let index = 0; index < pointCount; index += 1) {
		const latitude = reader.readLatLon();
		const longitude = reader.readLatLon();
		const altitude = reader.readOptionalFloat64();
		const time = reader.readOptionalTime();
		const depth = reader.readOptionalFloat64();
		const temperature = reader.readOptionalFloat64();

		points.push({
			coordinates: [longitude, latitude],
			altitude,
			time,
			depth,
			temperature
		});
	}

	return {
		name,
		colorIndex: colorIndex + TRACK_COLOR_OFFSET,
		points
	} satisfies GarminTrack;
};

const readTrackV1 = (reader: BinaryReader) => readTrackCommon(reader);
const readTrackV2 = (reader: BinaryReader) => readTrackCommon(reader);
const readTrackV3 = (reader: BinaryReader) => readTrackCommon(reader);

const extractReferencedWaypointNames = (
	payload: Uint8Array,
	waypointIndex: Map<string, [number, number]>,
	limit: number
) => {
	const names: string[] = [];
	let cursor = 0;

	while (cursor < payload.length && names.length < limit) {
		const start = cursor;
		while (cursor < payload.length && payload[cursor] !== 0) {
			cursor += 1;
		}

		if (cursor > start) {
			const candidate = new TextDecoder('utf-8', { fatal: false }).decode(
				payload.subarray(start, cursor)
			);
			if (waypointIndex.has(candidate)) {
				if (names.length === 0 || names[names.length - 1] !== candidate) {
					names.push(candidate);
				}
			}
		}

		cursor += 1;
	}

	return names;
};

const isWithinRouteBounds = (
	coordinate: [number, number],
	bounds: GarminRouteBounds | null,
	margin = 0.01
) => {
	if (!bounds) return true;
	const [longitude, latitude] = coordinate;
	return (
		latitude >= bounds.minLatitude - margin &&
		latitude <= bounds.maxLatitude + margin &&
		longitude >= bounds.minLongitude - margin &&
		longitude <= bounds.maxLongitude + margin
	);
};

const areSameCoordinate = (left: [number, number], right: [number, number]) => {
	return left[0] === right[0] && left[1] === right[1];
};

const skipRouteVersionTail = (reader: BinaryReader, version: GarminGdbVersion) => {
	if (version >= 2) {
		reader.skip(8);
	}
	if (version >= 3) {
		reader.skip(2);
	}
};

const tryReadRouteInterlinkSegment = (
	payload: Uint8Array,
	offset: number,
	version: GarminGdbVersion,
	bounds: GarminRouteBounds | null
) => {
	try {
		const reader = new BinaryReader(payload);
		reader.seek(offset);
		const links = reader.readInt32LE();
		if (links < 2 || links > 64) return null;

		const coordinates: [number, number][] = [];
		for (let index = 0; index < links; index += 1) {
			const latitude = reader.readLatLon();
			const longitude = reader.readLatLon();
			reader.readOptionalFloat64();
			const coordinate: [number, number] = [longitude, latitude];
			if (!isWithinRouteBounds(coordinate, bounds)) {
				return null;
			}
			coordinates.push(coordinate);
		}

		const segmentBounds = readRouteBounds(reader);
		if (segmentBounds) {
			for (const coordinate of coordinates) {
				if (!isWithinRouteBounds(coordinate, segmentBounds, 0.002)) {
					return null;
				}
			}
		}

		skipRouteVersionTail(reader, version);

		return {
			offset,
			endOffset: reader.position,
			coordinates
		};
	} catch {
		return null;
	}
};

const extractRouteCoordinatesFromInterlinks = (
	payload: Uint8Array,
	version: GarminGdbVersion,
	bounds: GarminRouteBounds | null,
	routePointCount: number
) => {
	const candidateSegments: Array<{
		offset: number;
		endOffset: number;
		coordinates: [number, number][];
	}> = [];

	for (let offset = 0; offset <= payload.length - 4; offset += 1) {
		const segment = tryReadRouteInterlinkSegment(payload, offset, version, bounds);
		if (segment) {
			candidateSegments.push(segment);
		}
	}

	const acceptedSegments: typeof candidateSegments = [];
	let nextOffsetFloor = 0;
	const segmentLimit = Math.max(routePointCount - 1, 0);

	for (const segment of candidateSegments) {
		if (segment.offset < nextOffsetFloor) continue;
		acceptedSegments.push(segment);
		nextOffsetFloor = segment.endOffset;
		if (segmentLimit > 0 && acceptedSegments.length >= segmentLimit) {
			break;
		}
	}

	const coordinates: [number, number][] = [];
	for (const segment of acceptedSegments) {
		for (const coordinate of segment.coordinates) {
			if (coordinates.length === 0 || !areSameCoordinate(coordinates[coordinates.length - 1], coordinate)) {
				coordinates.push(coordinate);
			}
		}
	}

	return coordinates;
};

const readRouteCommon = (
	reader: BinaryReader,
	waypointIndex: Map<string, [number, number]>,
	version: GarminGdbVersion
) => {
	const name = reader.readCString();
	reader.readUint8();
	const bounds = readRouteBounds(reader);
	const routePointCount = reader.readInt32LE();
	const payload = reader.readBytes(reader.remaining);
	const pointNames = extractReferencedWaypointNames(payload, waypointIndex, routePointCount);
	const fallbackCoordinates = pointNames
		.map((pointName) => waypointIndex.get(pointName))
		.filter((coordinate): coordinate is [number, number] => coordinate != null);
	const interlinkCoordinates = extractRouteCoordinatesFromInterlinks(
		payload,
		version,
		bounds,
		routePointCount
	);
	const coordinates = interlinkCoordinates.length >= 2 ? interlinkCoordinates : fallbackCoordinates;
	const shapingPointCount = Math.max(coordinates.length - pointNames.length, 0);

	return {
		name,
		pointNames,
		coordinates: coordinates.length >= 2 ? coordinates : fallbackCoordinates,
		routePointCount,
		shapingPointCount
	} satisfies GarminRoute;
};

const readRouteV1 = (reader: BinaryReader, waypointIndex: Map<string, [number, number]>) =>
	readRouteCommon(reader, waypointIndex, 1);
const readRouteV2 = (reader: BinaryReader, waypointIndex: Map<string, [number, number]>) =>
	readRouteCommon(reader, waypointIndex, 2);
const readRouteV3 = (reader: BinaryReader, waypointIndex: Map<string, [number, number]>) =>
	readRouteCommon(reader, waypointIndex, 3);

const readWaypointByVersion = (version: GarminGdbVersion, reader: BinaryReader) => {
	switch (version) {
		case 1:
			return readWaypointV1(reader);
		case 2:
			return readWaypointV2(reader);
		case 3:
			return readWaypointV3(reader);
	}
};

const readRouteByVersion = (
	version: GarminGdbVersion,
	reader: BinaryReader,
	waypointIndex: Map<string, [number, number]>
) => {
	switch (version) {
		case 1:
			return readRouteV1(reader, waypointIndex);
		case 2:
			return readRouteV2(reader, waypointIndex);
		case 3:
			return readRouteV3(reader, waypointIndex);
	}
};

const readTrackByVersion = (version: GarminGdbVersion, reader: BinaryReader) => {
	switch (version) {
		case 1:
			return readTrackV1(reader);
		case 2:
			return readTrackV2(reader);
		case 3:
			return readTrackV3(reader);
	}
};

const readRecordPayload = (
	type: GarminGdbRecordType,
	version: GarminGdbVersion,
	payload: Uint8Array,
	waypointIndex: Map<string, [number, number]>,
	result: GarminGdbParseResult
) => {
	const recordReader = new BinaryReader(payload);

	switch (type) {
		case 'W': {
			const waypoint = readWaypointByVersion(version, recordReader);
			result.waypoints.push(waypoint);
			waypointIndex.set(waypoint.name, waypoint.coordinates);
			return;
		}
		case 'R': {
			const route = readRouteByVersion(version, recordReader, waypointIndex);
			result.routes.push(route);
			return;
		}
		case 'T': {
			result.tracks.push(readTrackByVersion(version, recordReader));
			return;
		}
		default:
			return;
	}
};

export const isGarminGdbFile = async (file: File) => {
	const header = new Uint8Array(await file.slice(0, 6).arrayBuffer());
	if (header.length < 6) return false;
	return new TextDecoder('ascii', { fatal: false }).decode(header) === `${GARMIN_GDB_SIGNATURE}\0`;
};

export const readGarminGdbFile = async (file: File): Promise<GarminGdbParseResult> => {
	const bytes = new Uint8Array(await file.arrayBuffer());
	const reader = new BinaryReader(bytes);
	const header = readGarminGdbHeader(reader);
	const waypointIndex = new Map<string, [number, number]>();

	const result: GarminGdbParseResult = {
		version: header.version,
		application: header.application,
		waypoints: [],
		routes: [],
		tracks: []
	};

	while (reader.remaining > 0) {
		const recordLength = reader.readUint32LE();
		const recordType = String.fromCharCode(reader.readUint8()) as GarminGdbRecordType;

		if (recordType === 'V') {
			break;
		}

		const payload = reader.readBytes(recordLength);
		readRecordPayload(recordType, header.version, payload, waypointIndex, result);
	}

	return result;
};

export const garminGdbFileToGeojson = async (
	file: File,
	dataType: GarminGdbDataType
): Promise<FeatureCollection<PointGeometry | LineStringGeometry>> => {
	const parsed = await readGarminGdbFile(file);

	if (dataType === 'waypoints') {
		return {
			type: 'FeatureCollection',
			features: parsed.waypoints.map((waypoint) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: waypoint.coordinates
				},
				properties: {
					name: waypoint.name,
					altitude: waypoint.altitude,
					waypoint_class: waypoint.waypointClass,
					country_code: waypoint.countryCode,
					source_format: 'garmin-gdb',
					gdb_version: parsed.version
				} as unknown as FeatureProp
			}))
		};
	}

	if (dataType === 'tracks') {
		return {
			type: 'FeatureCollection',
			features: parsed.tracks
				.filter((track) => track.points.length >= 2)
				.map((track) => ({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: track.points.map((point) => point.coordinates)
					},
					properties: {
						name: track.name,
						point_count: track.points.length,
						color_index: track.colorIndex,
						source_format: 'garmin-gdb',
						gdb_version: parsed.version
					} as unknown as FeatureProp
				}))
		};
	}

	return {
		type: 'FeatureCollection',
		features: parsed.routes
			.filter((route) => route.coordinates.length >= 2)
			.map((route) => ({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: route.coordinates
				},
				properties: {
					name: route.name,
					route_point_count: route.routePointCount,
					point_count: route.pointNames.length,
					point_names: route.pointNames.join(', '),
					shaping_point_count: route.shapingPointCount,
					source_format: 'garmin-gdb',
					gdb_version: parsed.version
				} as unknown as FeatureProp
			}))
	};
};
