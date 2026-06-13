import type { FeatureCollection } from '$routes/map/types/geojson';
import { normalizeGeoJsonGeometryCollections } from '$routes/map/utils/formats/geojson';
import { gmlTextToGeoJson } from '$routes/map/utils/formats/gml';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';

export interface WfsFeatureTypeSummary {
	name: string;
	title: string;
	bbox: [number, number, number, number] | null;
	defaultCrs: string | null;
	otherCrs: string[];
	outputFormats: string[];
}

export interface WfsCapabilitiesInfo {
	version: string;
	serviceUrl: string;
	outputFormats: string[];
	featureTypes: WfsFeatureTypeSummary[];
}

const parseXml = (xmlString: string): XMLDocument =>
	new DOMParser().parseFromString(xmlString, 'text/xml');

const getElementText = (parent: ParentNode, selectors: string[]): string | null => {
	for (const selector of selectors) {
		const element = parent.querySelector(selector);
		const text = element?.textContent?.trim();
		if (text) return text;
	}

	return null;
};

const parseCorner = (value: string | null): number[] => {
	if (!value) return [];
	return value
		.trim()
		.split(/\s+/)
		.map((part) => Number.parseFloat(part))
		.filter((part) => Number.isFinite(part));
};

const toBbox = (lower: number[], upper: number[]): [number, number, number, number] | null => {
	if (lower.length < 2 || upper.length < 2) return null;
	return [lower[0], lower[1], upper[0], upper[1]];
};

const parseWgs84BoundingBox = (parent: ParentNode): [number, number, number, number] | null => {
	const lower = parseCorner(
		getElementText(parent, [
			'WGS84BoundingBox > LowerCorner',
			'ows\\:WGS84BoundingBox > ows\\:LowerCorner'
		])
	);
	const upper = parseCorner(
		getElementText(parent, [
			'WGS84BoundingBox > UpperCorner',
			'ows\\:WGS84BoundingBox > ows\\:UpperCorner'
		])
	);
	return toBbox(lower, upper);
};

const parseLatLonBoundingBox = (parent: ParentNode): [number, number, number, number] | null => {
	const bboxEl = parent.querySelector('LatLongBoundingBox');
	if (!bboxEl) return null;

	const minx = Number.parseFloat(bboxEl.getAttribute('minx') ?? '');
	const miny = Number.parseFloat(bboxEl.getAttribute('miny') ?? '');
	const maxx = Number.parseFloat(bboxEl.getAttribute('maxx') ?? '');
	const maxy = Number.parseFloat(bboxEl.getAttribute('maxy') ?? '');
	if (![minx, miny, maxx, maxy].every((value) => Number.isFinite(value))) return null;

	return [minx, miny, maxx, maxy];
};

const stripKnownParams = (url: URL): URL => {
	const cleanUrl = new URL(url.toString());
	[
		'service',
		'request',
		'version',
		'typeName',
		'typeNames',
		'typenames',
		'outputFormat',
		'count',
		'maxFeatures',
		'srsName',
		'bbox'
	].forEach((key) => {
		cleanUrl.searchParams.delete(key);
		cleanUrl.searchParams.delete(key.toUpperCase());
	});
	return cleanUrl;
};

const normalizeOutputFormats = (formats: string[]): string[] => {
	return [...new Set(formats.map((format) => format.trim()).filter(Boolean))];
};

const parseOutputFormats = (xml: XMLDocument): string[] => {
	const operationFormats = Array.from(
		xml.querySelectorAll(
			'ows\\:Operation[name="GetFeature"] ows\\:Parameter[name="outputFormat"] ows\\:Value, Operation[name="GetFeature"] Parameter[name="outputFormat"] Value'
		)
	)
		.map((element) => element.textContent?.trim() ?? '')
		.filter(Boolean);

	if (operationFormats.length > 0) {
		return normalizeOutputFormats(operationFormats);
	}

	const featureFormats = Array.from(xml.querySelectorAll('ResultFormat > *'))
		.map((element) => element.localName || element.nodeName)
		.filter(Boolean);

	return normalizeOutputFormats(featureFormats);
};

const getFeatureTypeOutputFormats = (featureType: Element): string[] => {
	return normalizeOutputFormats(
		Array.from(
			featureType.querySelectorAll(
				'OutputFormats > Format, wfs\\:OutputFormats > wfs\\:Format'
			)
		)
			.map((element) => element.textContent?.trim() ?? '')
			.filter(Boolean)
	);
};

export const getWfsPreferredOutputFormat = (formats: string[]): string => {
	const normalizedFormats = normalizeOutputFormats(formats);
	const preferences = [
		/application\/geo\+json/i,
		/application\/json/i,
		/geojson/i,
		/json/i,
		/gml\/?3/i,
		/text\/xml/i,
		/gml/i
	];

	for (const pattern of preferences) {
		const match = normalizedFormats.find((format) => pattern.test(format));
		if (match) return match;
	}

	return normalizedFormats[0] ?? 'application/json';
};

export const looksLikeWfsUrl = (url: string): boolean => {
	try {
		const parsedUrl = new URL(url);
		const service = parsedUrl.searchParams.get('service')?.toLowerCase();
		const request = parsedUrl.searchParams.get('request')?.toLowerCase();

		if (service === 'wfs') return true;
		if (request === 'getcapabilities' || request === 'getfeature') return true;
		return /\/wfs\/?$/i.test(parsedUrl.pathname);
	} catch {
		return false;
	}
};

export const parseWfsCapabilities = async (url: string): Promise<WfsCapabilitiesInfo | null> => {
	try {
		const capsUrl = new URL(url);
		capsUrl.searchParams.set('service', 'WFS');
		capsUrl.searchParams.set('request', 'GetCapabilities');

		const response = await fetchWithDevProxy(capsUrl.toString());
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const xmlString = await response.text();
		const xml = parseXml(xmlString);
		const root = xml.documentElement;
		const version = root.getAttribute('version') ?? '1.1.0';
		const outputFormats = parseOutputFormats(xml);

		const serviceUrl = xml
			.querySelector(
				'ows\\:Operation[name="GetFeature"] ows\\:DCP ows\\:HTTP ows\\:Get, Capability Request GetFeature DCPType HTTP Get OnlineResource'
			)
			?.getAttribute('xlink:href')
			?? xml
				.querySelector(
					'ows\\:Operation[name="GetFeature"] ows\\:DCP ows\\:HTTP ows\\:Get, Capability Request GetFeature DCPType HTTP Get OnlineResource'
				)
				?.getAttribute('href')
			?? stripKnownParams(capsUrl).toString();

		const featureTypes = Array.from(
			xml.querySelectorAll(
				'FeatureTypeList > FeatureType, wfs\\:FeatureTypeList > wfs\\:FeatureType'
			)
		).map((featureType) => {
			const name = getElementText(featureType, ['Name', 'wfs\\:Name']);
			if (!name) return null;

			return {
				name,
				title: getElementText(featureType, ['Title', 'wfs\\:Title']) ?? name,
				bbox: parseWgs84BoundingBox(featureType) ?? parseLatLonBoundingBox(featureType),
				defaultCrs: getElementText(featureType, [
					'DefaultCRS',
					'wfs\\:DefaultCRS',
					'DefaultSRS',
					'SRS'
				])
					?? null,
				otherCrs: normalizeOutputFormats(
					Array.from(featureType.querySelectorAll('OtherCRS, wfs\\:OtherCRS, OtherSRS'))
						.map((element) => element.textContent?.trim() ?? '')
						.filter(Boolean)
				),
				outputFormats: getFeatureTypeOutputFormats(featureType)
			} satisfies WfsFeatureTypeSummary;
		});

		return {
			version,
			serviceUrl,
			outputFormats,
			featureTypes: featureTypes.filter(
				(featureType): featureType is WfsFeatureTypeSummary => featureType !== null
			)
		};
	} catch (error) {
		console.error('Failed to fetch or parse WFS Capabilities:', error);
		return null;
	}
};

const isGeoJsonContent = (contentType: string, text: string, outputFormat: string): boolean => {
	return (
		/json|geo\+json/i.test(contentType)
		|| /json|geojson/i.test(outputFormat)
		|| text.trim().startsWith('{')
	);
};

export const buildWfsGetFeatureUrl = ({
	serviceUrl,
	version,
	typeName,
	outputFormat,
	count,
	srsName
}: {
	serviceUrl: string;
	version: string;
	typeName: string;
	outputFormat: string;
	count?: number;
	srsName?: string;
}): string => {
	const getFeatureUrl = new URL(serviceUrl);
	getFeatureUrl.searchParams.set('service', 'WFS');
	getFeatureUrl.searchParams.set('version', version);
	getFeatureUrl.searchParams.set('request', 'GetFeature');

	if (version.startsWith('2.')) {
		getFeatureUrl.searchParams.set('typeNames', typeName);
	} else {
		getFeatureUrl.searchParams.set('typeName', typeName);
	}

	if (outputFormat) {
		getFeatureUrl.searchParams.set('outputFormat', outputFormat);
	}

	if (srsName) {
		getFeatureUrl.searchParams.set('srsName', srsName);
	}

	if (count && Number.isFinite(count) && count > 0) {
		getFeatureUrl.searchParams.set('count', String(count));
		getFeatureUrl.searchParams.set('maxFeatures', String(count));
	}

	return getFeatureUrl.toString();
};

export const fetchWfsFeatureCollection = async ({
	serviceUrl,
	version,
	typeName,
	outputFormat,
	count,
	srsName = 'EPSG:4326'
}: {
	serviceUrl: string;
	version: string;
	typeName: string;
	outputFormat: string;
	count?: number;
	srsName?: string;
}): Promise<FeatureCollection> => {
	const requestUrl = buildWfsGetFeatureUrl({
		serviceUrl,
		version,
		typeName,
		outputFormat,
		count,
		srsName
	});

	const response = await fetchWithDevProxy(requestUrl);
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}

	const text = await response.text();
	const contentType = response.headers.get('content-type') ?? '';

	if (isGeoJsonContent(contentType, text, outputFormat)) {
		return normalizeGeoJsonGeometryCollections(
			JSON.parse(text) as Parameters<typeof normalizeGeoJsonGeometryCollections>[0]
		);
	}

	return gmlTextToGeoJson(text);
};

export const buildWfsBboxGetFeatureUrl = ({
	serviceUrl,
	version,
	typeName,
	outputFormat,
	bbox,
	srsName = 'EPSG:4326'
}: {
	serviceUrl: string;
	version: string;
	typeName: string;
	outputFormat: string;
	bbox: [number, number, number, number];
	srsName?: string;
}): string => {
	const requestUrl = new URL(
		buildWfsGetFeatureUrl({
			serviceUrl,
			version,
			typeName,
			outputFormat,
			srsName
		})
	);
	requestUrl.searchParams.set('bbox', `${bbox.join(',')},${srsName}`);
	return requestUrl.toString();
};
