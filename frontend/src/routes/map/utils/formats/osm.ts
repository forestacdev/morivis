import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type {
	LineStringGeometry,
	MultiPolygonGeometry,
	PointGeometry,
	PolygonGeometry
} from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

type OSMCoordinate = [number, number];

type OSMNode = {
	id: string;
	coordinate: OSMCoordinate;
	properties: FeatureProp;
};

type OSMWay = {
	id: string;
	refs: string[];
	properties: FeatureProp;
};

type OSMRelationMember = {
	type: string;
	ref: string;
	role: string;
};

type OSMRelation = {
	id: string;
	members: OSMRelationMember[];
	properties: FeatureProp;
};

const POLYGON_TAG_KEYS = new Set([
	'building',
	'landuse',
	'natural',
	'amenity',
	'leisure',
	'shop',
	'tourism',
	'historic',
	'place',
	'office',
	'public_transport',
	'water',
	'waterway',
	'wetland',
	'boundary',
	'aeroway',
	'military',
	'man_made'
]);

export class OsmParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OsmParseError';
	}
}

const parseTags = (element: Element): FeatureProp => {
	const properties: FeatureProp = {};

	for (const tag of Array.from(element.getElementsByTagName('tag'))) {
		const key = tag.getAttribute('k');
		const value = tag.getAttribute('v');
		if (!key || value == null) continue;
		properties[key] = value;
	}

	return properties;
};

const parseCoordinate = (node: Element): OSMCoordinate | null => {
	const lat = Number(node.getAttribute('lat'));
	const lon = Number(node.getAttribute('lon'));

	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return null;
	}

	return [lon, lat];
};

const isSameCoordinate = (a: OSMCoordinate, b: OSMCoordinate): boolean =>
	a[0] === b[0] && a[1] === b[1];

const isClosedRing = (coordinates: OSMCoordinate[]): boolean =>
	coordinates.length >= 4 && isSameCoordinate(coordinates[0], coordinates[coordinates.length - 1]);

const isPolygonWay = (properties: FeatureProp, coordinates: OSMCoordinate[]): boolean => {
	if (!isClosedRing(coordinates)) return false;
	if (properties.area === 'no') return false;
	if (properties.area === 'yes') return true;

	return Object.keys(properties).some((key) => POLYGON_TAG_KEYS.has(key));
};

const getWayCoordinates = (way: OSMWay, nodeMap: Map<string, OSMNode>): OSMCoordinate[] | null => {
	const coordinates = way.refs
		.map((ref) => nodeMap.get(ref)?.coordinate ?? null)
		.filter((coordinate): coordinate is OSMCoordinate => coordinate !== null);

	if (coordinates.length < 2) {
		return null;
	}

	return coordinates;
};

const pointInRing = (point: OSMCoordinate, ring: OSMCoordinate[]): boolean => {
	let inside = false;

	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		const intersects =
			yi > point[1] !== yj > point[1] &&
			point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || Number.EPSILON) + xi;

		if (intersects) {
			inside = !inside;
		}
	}

	return inside;
};

const buildClosedRings = (segments: OSMCoordinate[][]): OSMCoordinate[][] => {
	const pending = segments.map((segment) => [...segment]);
	const rings: OSMCoordinate[][] = [];

	while (pending.length > 0) {
		let ring = pending.shift();
		if (!ring) break;

		let changed = true;
		while (changed && !isClosedRing(ring)) {
			changed = false;

			for (let index = 0; index < pending.length; index++) {
				const candidate = pending[index];
				const ringStart = ring[0];
				const ringEnd = ring[ring.length - 1];
				const candidateStart = candidate[0];
				const candidateEnd = candidate[candidate.length - 1];

				if (isSameCoordinate(ringEnd, candidateStart)) {
					ring = [...ring, ...candidate.slice(1)];
				} else if (isSameCoordinate(ringEnd, candidateEnd)) {
					ring = [...ring, ...candidate.slice(0, -1).reverse()];
				} else if (isSameCoordinate(ringStart, candidateEnd)) {
					ring = [...candidate.slice(0, -1), ...ring];
				} else if (isSameCoordinate(ringStart, candidateStart)) {
					ring = [...candidate.slice(1).reverse(), ...ring];
				} else {
					continue;
				}

				pending.splice(index, 1);
				changed = true;
				break;
			}
		}

		if (isClosedRing(ring)) {
			rings.push(ring);
		}
	}

	return rings;
};

const buildRelationPolygon = (
	relation: OSMRelation,
	wayMap: Map<string, OSMWay>,
	nodeMap: Map<string, OSMNode>
): PolygonGeometry | MultiPolygonGeometry | null => {
	const outerSegments: OSMCoordinate[][] = [];
	const innerSegments: OSMCoordinate[][] = [];

	for (const member of relation.members) {
		if (member.type !== 'way') continue;

		const way = wayMap.get(member.ref);
		if (!way) continue;

		const coordinates = getWayCoordinates(way, nodeMap);
		if (!coordinates) continue;

		if (member.role === 'inner') {
			innerSegments.push(coordinates);
			continue;
		}

		outerSegments.push(coordinates);
	}

	const outerRings = buildClosedRings(outerSegments);
	if (outerRings.length === 0) {
		return null;
	}

	const innerRings = buildClosedRings(innerSegments);
	const polygons = outerRings.map((outerRing) => {
		const holes = innerRings.filter((innerRing) => pointInRing(innerRing[0], outerRing));
		return [outerRing, ...holes];
	});

	if (polygons.length === 1) {
		return {
			type: 'Polygon',
			coordinates: polygons[0]
		};
	}

	return {
		type: 'MultiPolygon',
		coordinates: polygons.map((polygon) => [polygon[0], ...polygon.slice(1)])
	};
};

const parseOsmXml = (text: string): FeatureCollection => {
	const parser = new DOMParser();
	const document = parser.parseFromString(text, 'text/xml');
	const parserError = document.querySelector('parsererror');

	if (parserError) {
		throw new OsmParseError('OSM XMLの構文が壊れています');
	}

	const nodeMap = new Map<string, OSMNode>();
	const wayMap = new Map<string, OSMWay>();
	const relationMap = new Map<string, OSMRelation>();
	const referencedNodeIds = new Set<string>();
	const features: Feature[] = [];

	for (const node of Array.from(document.getElementsByTagName('node'))) {
		const id = node.getAttribute('id');
		const coordinate = parseCoordinate(node);
		if (!id || !coordinate) continue;

		nodeMap.set(id, {
			id,
			coordinate,
			properties: parseTags(node)
		});
	}

	for (const wayElement of Array.from(document.getElementsByTagName('way'))) {
		const id = wayElement.getAttribute('id');
		if (!id) continue;

		const refs = Array.from(wayElement.getElementsByTagName('nd'))
			.map((nd) => nd.getAttribute('ref'))
			.filter((ref): ref is string => Boolean(ref));

		refs.forEach((ref) => referencedNodeIds.add(ref));

		wayMap.set(id, {
			id,
			refs,
			properties: parseTags(wayElement)
		});
	}

	for (const relationElement of Array.from(document.getElementsByTagName('relation'))) {
		const id = relationElement.getAttribute('id');
		if (!id) continue;

		const members = Array.from(relationElement.getElementsByTagName('member'))
			.map((member) => ({
				type: member.getAttribute('type') ?? '',
				ref: member.getAttribute('ref') ?? '',
				role: member.getAttribute('role') ?? ''
			}))
			.filter((member) => member.type && member.ref);

		relationMap.set(id, {
			id,
			members,
			properties: parseTags(relationElement)
		});
	}

	for (const node of nodeMap.values()) {
		if (Object.keys(node.properties).length === 0 || referencedNodeIds.has(node.id)) {
			continue;
		}

		features.push({
			type: 'Feature',
			id: `node/${node.id}`,
			geometry: {
				type: 'Point',
				coordinates: node.coordinate
			} as PointGeometry,
			properties: {
				...node.properties,
				_osmType: 'node',
				_osmId: node.id
			}
		});
	}

	for (const relation of relationMap.values()) {
		const relationType = relation.properties.type;
		if (relationType !== 'multipolygon' && relationType !== 'boundary') {
			continue;
		}

		const geometry = buildRelationPolygon(relation, wayMap, nodeMap);
		if (!geometry) continue;

		features.push({
			type: 'Feature',
			id: `relation/${relation.id}`,
			geometry,
			properties: {
				...relation.properties,
				_osmType: 'relation',
				_osmId: relation.id
			}
		});
	}

	for (const way of wayMap.values()) {
		if (Object.keys(way.properties).length === 0) {
			continue;
		}

		const coordinates = getWayCoordinates(way, nodeMap);
		if (!coordinates) continue;

		const geometry = isPolygonWay(way.properties, coordinates)
			? ({
					type: 'Polygon',
					coordinates: [coordinates]
				} as PolygonGeometry)
			: ({
					type: 'LineString',
					coordinates
				} as LineStringGeometry);

		features.push({
			type: 'Feature',
			id: `way/${way.id}`,
			geometry,
			properties: {
				...way.properties,
				_osmType: 'way',
				_osmId: way.id
			}
		});
	}

	if (features.length === 0) {
		throw new OsmParseError('OSMファイルに描画可能なフィーチャが見つかりませんでした');
	}

	return {
		type: 'FeatureCollection',
		features
	};
};

export const osmFileToGeoJson = async (file: File): Promise<FeatureCollection> => {
	try {
		const text = await file.text();
		return parseOsmXml(text);
	} catch (error) {
		console.error('OSM parsing error:', error);

		if (error instanceof OsmParseError) {
			throw error;
		}

		throw new OsmParseError('OSMファイルの読み込みに失敗しました');
	}
};
