import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type {
	AnyGeometry,
	LineStringGeometry,
	PointGeometry,
	PolygonGeometry
} from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';
import { parseXmlDocument } from '$routes/map/utils/formats/kml/xml';

const GEORSS_NAMESPACE = 'http://www.georss.org/georss';
const GML_NAMESPACE = 'http://www.opengis.net/gml';
const W3C_GEO_NAMESPACE = 'http://www.w3.org/2003/01/geo/wgs84_pos#';

type CoordinateOrder = 'latlon' | 'xy';

interface ParsedGeometryResult {
	geometry: AnyGeometry;
	sourceCrsName: string | null;
	requiresManualCrsSelection: boolean;
}

interface ParsedFeatureResult {
	feature: Feature<AnyGeometry, FeatureProp>;
	sourceCrsName: string | null;
	requiresManualCrsSelection: boolean;
}

export interface GeoRssParseResult {
	geojson: FeatureCollection;
	sourceCrsName: string | null;
	requiresManualCrsSelection: boolean;
}

export class GeoRssParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GeoRssParseError';
	}
}

const getLocalName = (element: Element) => {
	return element.localName ?? element.nodeName.split(':').pop() ?? element.nodeName;
};

const getDirectChildElements = (parent: Element) => {
	return Array.from(parent.childNodes).filter((child): child is Element => child.nodeType === 1);
};

const getDirectChildElementsByName = (
	parent: Element,
	localName: string,
	namespace?: string
) => {
	return getDirectChildElements(parent).filter((child) => {
		if (namespace && child.namespaceURI !== namespace) return false;
		return getLocalName(child) === localName;
	});
};

const getDirectChildElementByName = (
	parent: Element,
	localName: string,
	namespace?: string
) => {
	return getDirectChildElementsByName(parent, localName, namespace)[0];
};

const getDirectChildTextByName = (
	parent: Element,
	localName: string,
	namespace?: string
) => {
	return getDirectChildElementByName(parent, localName, namespace)?.textContent?.trim();
};

const getElementsByLocalName = (parent: Document | Element, localName: string) => {
	return Array.from(parent.getElementsByTagName('*')).filter(
		(node): node is Element => getLocalName(node) === localName
	);
};

const getParserErrorText = (doc: Document) => {
	const parserError = doc.getElementsByTagName('parsererror')[0];
	return parserError?.textContent?.trim();
};

const isWgs84SrsName = (srsName: string | null) => {
	if (!srsName) return true;

	const normalized = srsName.toLowerCase();
	return (
		normalized.includes('4326')
		|| normalized.includes('crs84')
		|| normalized.includes('wgs84')
	);
};

const getCoordinateOrderFromSrsName = (srsName: string | null): CoordinateOrder => {
	if (!srsName) return 'latlon';
	if (srsName.toLowerCase().includes('crs84')) return 'xy';
	if (isWgs84SrsName(srsName)) return 'latlon';
	return 'xy';
};

const parseCoordinateNumbers = (text: string) => {
	const tokens = text
		.trim()
		.replaceAll(',', ' ')
		.split(/\s+/)
		.filter(Boolean);

	if (tokens.length === 0) {
		throw new GeoRssParseError('GeoRSSの座標が空です');
	}

	const numbers = tokens.map((token) => Number(token));
	if (numbers.some((value) => !Number.isFinite(value))) {
		throw new GeoRssParseError('GeoRSSの座標値を解釈できませんでした');
	}

	return numbers;
};

const toCoordinate = (
	first: number,
	second: number,
	order: CoordinateOrder
): [number, number] => {
	return order === 'latlon' ? [second, first] : [first, second];
};

const parseCoordinatePair = (text: string, order: CoordinateOrder): [number, number] => {
	const numbers = parseCoordinateNumbers(text);
	if (numbers.length < 2) {
		throw new GeoRssParseError('GeoRSSの座標ペアが不足しています');
	}

	return toCoordinate(numbers[0], numbers[1], order);
};

const parseCoordinateSequence = (
	text: string,
	order: CoordinateOrder,
	dimension = 2
): [number, number][] => {
	if (dimension < 2) {
		throw new GeoRssParseError('GeoRSSの座標次元が不正です');
	}

	const numbers = parseCoordinateNumbers(text);
	const coordinates: [number, number][] = [];

	for (let i = 0; i + 1 < numbers.length; i += dimension) {
		coordinates.push(toCoordinate(numbers[i], numbers[i + 1], order));
	}

	if (coordinates.length === 0) {
		throw new GeoRssParseError('GeoRSSの座標列を解釈できませんでした');
	}

	return coordinates;
};

const coordinatesEqual = (a: [number, number], b: [number, number]) => {
	return a[0] === b[0] && a[1] === b[1];
};

const closeRing = (ring: [number, number][]) => {
	if (ring.length === 0) return ring;
	if (coordinatesEqual(ring[0], ring[ring.length - 1])) return ring;
	return [...ring, ring[0]];
};

const createBboxPolygon = (
	lowerLeft: [number, number],
	upperRight: [number, number]
): PolygonGeometry => {
	const minX = Math.min(lowerLeft[0], upperRight[0]);
	const minY = Math.min(lowerLeft[1], upperRight[1]);
	const maxX = Math.max(lowerLeft[0], upperRight[0]);
	const maxY = Math.max(lowerLeft[1], upperRight[1]);

	return {
		type: 'Polygon',
		coordinates: [
			[
				[minX, minY],
				[maxX, minY],
				[maxX, maxY],
				[minX, maxY],
				[minX, minY]
			]
		]
	};
};

const parseGeoRssSimpleGeometry = (element: Element): ParsedGeometryResult | null => {
	const pointText = getDirectChildTextByName(element, 'point', GEORSS_NAMESPACE);
	if (pointText) {
		return {
			geometry: {
				type: 'Point',
				coordinates: parseCoordinatePair(pointText, 'latlon')
			},
			sourceCrsName: null,
			requiresManualCrsSelection: false
		};
	}

	const lineText = getDirectChildTextByName(element, 'line', GEORSS_NAMESPACE);
	if (lineText) {
		const coordinates = parseCoordinateSequence(lineText, 'latlon');
		if (coordinates.length < 2) {
			throw new GeoRssParseError('GeoRSS line は2点以上必要です');
		}

		return {
			geometry: {
				type: 'LineString',
				coordinates
			},
			sourceCrsName: null,
			requiresManualCrsSelection: false
		};
	}

	const polygonText = getDirectChildTextByName(element, 'polygon', GEORSS_NAMESPACE);
	if (polygonText) {
		const ring = closeRing(parseCoordinateSequence(polygonText, 'latlon'));
		if (ring.length < 4) {
			throw new GeoRssParseError('GeoRSS polygon は4点以上必要です');
		}

		return {
			geometry: {
				type: 'Polygon',
				coordinates: [ring]
			},
			sourceCrsName: null,
			requiresManualCrsSelection: false
		};
	}

	const boxText = getDirectChildTextByName(element, 'box', GEORSS_NAMESPACE);
	if (boxText) {
		const coordinates = parseCoordinateSequence(boxText, 'latlon');
		if (coordinates.length < 2) {
			throw new GeoRssParseError('GeoRSS box は2点必要です');
		}

		return {
			geometry: createBboxPolygon(coordinates[0], coordinates[1]),
			sourceCrsName: null,
			requiresManualCrsSelection: false
		};
	}

	return null;
};

const getGeometrySrsName = (geometryElement: Element) => {
	return (
		geometryElement.getAttribute('srsName')
			?? geometryElement.getAttributeNS(null, 'srsName')
			?? null
	);
};

const getCoordinateDimension = (element: Element | null | undefined) => {
	if (!element) return 2;

	const rawDimension = element.getAttribute('srsDimension') ?? element.getAttribute('dimension');
	if (!rawDimension) return 2;

	const dimension = Number(rawDimension);
	return Number.isFinite(dimension) && dimension >= 2 ? dimension : 2;
};

const parseGmlCoordinateSeries = (element: Element, order: CoordinateOrder) => {
	const posList = getDirectChildElementByName(element, 'posList', GML_NAMESPACE);
	if (posList?.textContent?.trim()) {
		return parseCoordinateSequence(
			posList.textContent,
			order,
			getCoordinateDimension(posList) || getCoordinateDimension(element)
		);
	}

	const coordinatesText = getDirectChildTextByName(element, 'coordinates', GML_NAMESPACE);
	if (coordinatesText) {
		return parseCoordinateSequence(coordinatesText, order);
	}

	const positions = getDirectChildElementsByName(element, 'pos', GML_NAMESPACE)
		.map((position) => position.textContent?.trim() ?? '')
		.filter(Boolean)
		.map((text) => parseCoordinatePair(text, order));

	if (positions.length > 0) {
		return positions;
	}

	throw new GeoRssParseError('GeoRSS GMLの座標列を解釈できませんでした');
};

const parseGmlPoint = (element: Element, order: CoordinateOrder): PointGeometry => {
	const position = getDirectChildTextByName(element, 'pos', GML_NAMESPACE)
		?? getDirectChildTextByName(element, 'coordinates', GML_NAMESPACE);

	if (!position) {
		throw new GeoRssParseError('GeoRSS GML Point の座標が見つかりません');
	}

	return {
		type: 'Point',
		coordinates: parseCoordinatePair(position, order)
	};
};

const parseGmlLineString = (element: Element, order: CoordinateOrder): LineStringGeometry => {
	const coordinates = parseGmlCoordinateSeries(element, order);
	if (coordinates.length < 2) {
		throw new GeoRssParseError('GeoRSS GML LineString は2点以上必要です');
	}

	return {
		type: 'LineString',
		coordinates
	};
};

const parseGmlLinearRing = (element: Element, order: CoordinateOrder) => {
	const ring = closeRing(parseGmlCoordinateSeries(element, order));
	if (ring.length < 4) {
		throw new GeoRssParseError('GeoRSS GML Polygon のリングが不正です');
	}
	return ring;
};

const parseGmlPolygon = (element: Element, order: CoordinateOrder): PolygonGeometry => {
	const boundaryElements = [
		...getDirectChildElementsByName(element, 'exterior', GML_NAMESPACE),
		...getDirectChildElementsByName(element, 'outerBoundaryIs', GML_NAMESPACE)
	];
	const firstBoundary = boundaryElements[0];
	const outerRingElement = firstBoundary
		? getDirectChildElementByName(firstBoundary, 'LinearRing', GML_NAMESPACE)
		: null;

	if (!outerRingElement) {
		throw new GeoRssParseError('GeoRSS GML Polygon の外周リングが見つかりません');
	}

	const innerBoundaries = [
		...getDirectChildElementsByName(element, 'interior', GML_NAMESPACE),
		...getDirectChildElementsByName(element, 'innerBoundaryIs', GML_NAMESPACE)
	];

	return {
		type: 'Polygon',
		coordinates: [
			parseGmlLinearRing(outerRingElement, order),
			...innerBoundaries
				.map((boundary) =>
					getDirectChildElementByName(boundary, 'LinearRing', GML_NAMESPACE)
				)
				.filter((ring): ring is Element => ring !== undefined)
				.map((ring) => parseGmlLinearRing(ring, order))
		]
	};
};

const parseGmlEnvelope = (element: Element, order: CoordinateOrder): PolygonGeometry => {
	const lowerCorner = getDirectChildTextByName(element, 'lowerCorner', GML_NAMESPACE);
	const upperCorner = getDirectChildTextByName(element, 'upperCorner', GML_NAMESPACE);

	if (!lowerCorner || !upperCorner) {
		throw new GeoRssParseError('GeoRSS GML Envelope の座標が見つかりません');
	}

	return createBboxPolygon(
		parseCoordinatePair(lowerCorner, order),
		parseCoordinatePair(upperCorner, order)
	);
};

const parseGeoRssGmlGeometry = (element: Element): ParsedGeometryResult | null => {
	const whereElement = getDirectChildElementByName(element, 'where', GEORSS_NAMESPACE);
	if (!whereElement) return null;

	const geometryElement = getDirectChildElements(whereElement)[0];
	if (!geometryElement) {
		throw new GeoRssParseError('GeoRSS where 要素にGMLジオメトリがありません');
	}

	const sourceCrsName = getGeometrySrsName(geometryElement);
	const order = getCoordinateOrderFromSrsName(sourceCrsName);
	const requiresManualCrsSelection = !!sourceCrsName && !isWgs84SrsName(sourceCrsName);
	const geometryType = getLocalName(geometryElement);

	if (geometryType === 'Point') {
		return {
			geometry: parseGmlPoint(geometryElement, order),
			sourceCrsName,
			requiresManualCrsSelection
		};
	}

	if (geometryType === 'LineString') {
		return {
			geometry: parseGmlLineString(geometryElement, order),
			sourceCrsName,
			requiresManualCrsSelection
		};
	}

	if (geometryType === 'Polygon') {
		return {
			geometry: parseGmlPolygon(geometryElement, order),
			sourceCrsName,
			requiresManualCrsSelection
		};
	}

	if (geometryType === 'Envelope') {
		return {
			geometry: parseGmlEnvelope(geometryElement, order),
			sourceCrsName,
			requiresManualCrsSelection
		};
	}

	return null;
};

const parseW3cGeoGeometry = (element: Element): ParsedGeometryResult | null => {
	const latText = getDirectChildTextByName(element, 'lat', W3C_GEO_NAMESPACE);
	const longText = getDirectChildTextByName(element, 'long', W3C_GEO_NAMESPACE)
		?? getDirectChildTextByName(element, 'lon', W3C_GEO_NAMESPACE);

	if (latText && longText) {
		return {
			geometry: {
				type: 'Point',
				coordinates: [Number(longText), Number(latText)]
			},
			sourceCrsName: null,
			requiresManualCrsSelection: false
		};
	}

	const geoPoint = getDirectChildElementByName(element, 'Point', W3C_GEO_NAMESPACE);
	if (!geoPoint) return null;

	const pointLat = getDirectChildTextByName(geoPoint, 'lat', W3C_GEO_NAMESPACE);
	const pointLong = getDirectChildTextByName(geoPoint, 'long', W3C_GEO_NAMESPACE)
		?? getDirectChildTextByName(geoPoint, 'lon', W3C_GEO_NAMESPACE);

	if (!pointLat || !pointLong) {
		throw new GeoRssParseError('W3C geo Point の座標が見つかりません');
	}

	return {
		geometry: {
			type: 'Point',
			coordinates: [Number(pointLong), Number(pointLat)]
		},
		sourceCrsName: null,
		requiresManualCrsSelection: false
	};
};

const extractLink = (element: Element) => {
	const links = getDirectChildElementsByName(element, 'link');
	for (const link of links) {
		const href = link.getAttribute('href')?.trim();
		if (href) return href;

		const text = link.textContent?.trim();
		if (text) return text;
	}

	return undefined;
};

const extractCategories = (element: Element) => {
	const categories = getDirectChildElementsByName(element, 'category')
		.map((category) =>
			category.getAttribute('term')?.trim() ?? category.textContent?.trim() ?? ''
		)
		.filter(Boolean);

	return categories.length > 0 ? categories.join(', ') : undefined;
};

const parseOptionalNumber = (text: string | undefined) => {
	if (!text) return undefined;
	const value = Number(text);
	return Number.isFinite(value) ? value : undefined;
};

const extractProperties = (element: Element): FeatureProp => {
	const properties: FeatureProp = {};
	const title = getDirectChildTextByName(element, 'title');
	const description = getDirectChildTextByName(element, 'description')
		?? getDirectChildTextByName(element, 'summary')
		?? getDirectChildTextByName(element, 'content');
	const link = extractLink(element);
	const guid = getDirectChildTextByName(element, 'guid')
		?? getDirectChildTextByName(element, 'id');
	const published = getDirectChildTextByName(element, 'pubDate')
		?? getDirectChildTextByName(element, 'published')
		?? getDirectChildTextByName(element, 'updated');
	const category = extractCategories(element);
	const featureTypeTag = getDirectChildTextByName(element, 'featuretypetag', GEORSS_NAMESPACE);
	const relationshipTag = getDirectChildTextByName(element, 'relationshiptag', GEORSS_NAMESPACE);
	const featureName = getDirectChildTextByName(element, 'featurename', GEORSS_NAMESPACE);
	const elev = parseOptionalNumber(getDirectChildTextByName(element, 'elev', GEORSS_NAMESPACE));
	const floor = parseOptionalNumber(getDirectChildTextByName(element, 'floor', GEORSS_NAMESPACE));
	const radius = parseOptionalNumber(
		getDirectChildTextByName(element, 'radius', GEORSS_NAMESPACE)
	);

	if (title) properties.title = title;
	if (description) properties.description = description;
	if (link) properties.link = link;
	if (guid) properties.guid = guid;
	if (published) properties.published = published;
	if (category) properties.category = category;
	if (featureTypeTag) properties.georss_featuretypetag = featureTypeTag;
	if (relationshipTag) properties.georss_relationshiptag = relationshipTag;
	if (featureName) properties.georss_featurename = featureName;
	if (elev !== undefined) properties.georss_elev = elev;
	if (floor !== undefined) properties.georss_floor = floor;
	if (radius !== undefined) properties.georss_radius = radius;

	return properties;
};

const hasDirectSpatialChild = (element: Element) => {
	return (
		['point', 'line', 'polygon', 'box'].some(
			(localName) => !!getDirectChildElementByName(element, localName, GEORSS_NAMESPACE)
		)
		|| !!getDirectChildElementByName(element, 'where', GEORSS_NAMESPACE)
		|| !!getDirectChildTextByName(element, 'lat', W3C_GEO_NAMESPACE)
		|| !!getDirectChildElementByName(element, 'Point', W3C_GEO_NAMESPACE)
	);
};

const collectFeatureHosts = (doc: Document) => {
	const itemElements = [
		...getElementsByLocalName(doc, 'item'),
		...getElementsByLocalName(doc, 'entry')
	];

	if (itemElements.length > 0) {
		return itemElements;
	}

	const hosts = [
		doc.documentElement,
		...getElementsByLocalName(doc, doc.documentElement.localName ?? '')
	]
		.filter((element) => !!element && hasDirectSpatialChild(element));

	return Array.from(new Set(hosts));
};

const parseFeatureFromElement = (element: Element): ParsedFeatureResult | null => {
	const parsedGeometry = parseGeoRssSimpleGeometry(element)
		?? parseGeoRssGmlGeometry(element)
		?? parseW3cGeoGeometry(element);

	if (!parsedGeometry) return null;

	const featureId = getDirectChildTextByName(element, 'guid')
		?? getDirectChildTextByName(element, 'id');

	return {
		feature: {
			type: 'Feature',
			...(featureId ? { id: featureId } : {}),
			geometry: parsedGeometry.geometry,
			properties: extractProperties(element)
		},
		sourceCrsName: parsedGeometry.sourceCrsName,
		requiresManualCrsSelection: parsedGeometry.requiresManualCrsSelection
	};
};

export const hasGeoRssMarker = (text: string) => {
	return (
		text.includes('http://www.georss.org/georss')
		|| text.includes('xmlns:georss')
		|| text.includes('http://www.w3.org/2003/01/geo/wgs84_pos')
		|| text.includes('wgs84_pos#')
	);
};

export const geoRssFileToGeoJson = async (file: File): Promise<GeoRssParseResult> => {
	try {
		const text = await file.text();
		if (!hasGeoRssMarker(text)) {
			throw new GeoRssParseError('GeoRSSまたはW3C geoの名前空間が見つかりません');
		}

		const xml = await parseXmlDocument(text);
		if (getParserErrorText(xml)) {
			throw new GeoRssParseError('GeoRSS XMLの構文が壊れています');
		}

		const hosts = collectFeatureHosts(xml);
		const features: FeatureCollection['features'] = [];
		let sourceCrsName: string | null = null;
		let requiresManualCrsSelection = false;

		for (const host of hosts) {
			const parsedFeature = parseFeatureFromElement(host);
			if (!parsedFeature) continue;

			features.push(parsedFeature.feature);
			sourceCrsName ??= parsedFeature.sourceCrsName;
			requiresManualCrsSelection = requiresManualCrsSelection
				|| parsedFeature.requiresManualCrsSelection;
		}

		if (features.length === 0) {
			throw new GeoRssParseError(
				'GeoRSSファイルに描画可能なフィーチャが見つかりませんでした'
			);
		}

		return {
			geojson: {
				type: 'FeatureCollection',
				features
			},
			sourceCrsName,
			requiresManualCrsSelection
		};
	} catch (error) {
		console.error('GeoRSS parsing error:', error);

		if (error instanceof GeoRssParseError) {
			throw error;
		}

		throw new GeoRssParseError('GeoRSSファイルの読み込みに失敗しました');
	}
};
