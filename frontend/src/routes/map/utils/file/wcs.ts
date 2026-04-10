export interface WcsCoverageSummary {
	id: string;
	title: string;
	bbox: [number, number, number, number] | null;
}

export interface WcsCoverageDescription {
	axisLabels: string[];
	bbox: [number, number, number, number] | null;
	srsName: string | null;
	supportedFormats: string[];
	supportedCrs: string[];
}

export interface WcsCapabilitiesInfo {
	version: string;
	serviceUrl: string;
	supportedFormats: string[];
	coverages: WcsCoverageSummary[];
}

const parseXml = (xmlString: string): XMLDocument => new DOMParser().parseFromString(xmlString, 'text/xml');

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

const parseBoundingBox = (parent: ParentNode): [number, number, number, number] | null => {
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

const parseLonLatEnvelope = (parent: ParentNode): [number, number, number, number] | null => {
	const positions = Array.from(parent.querySelectorAll('lonLatEnvelope > gml\\:pos, lonLatEnvelope > pos'))
		.map((element) => parseCorner(element.textContent))
		.filter((values) => values.length >= 2);

	if (positions.length < 2) return null;
	return toBbox(positions[0], positions[1]);
};

const stripKnownParams = (url: URL): URL => {
	const cleanUrl = new URL(url.toString());
	[
		'service',
		'request',
		'version',
		'coverageId',
		'coverage',
		'format',
		'subset',
		'crs',
		'bbox',
		'width',
		'height'
	].forEach((key) => {
		cleanUrl.searchParams.delete(key);
		cleanUrl.searchParams.delete(key.toUpperCase());
	});
	return cleanUrl;
};

const getPreferredFormat = (formats: string[]): string =>
	formats.find((format) => /image\/tiff|geotiff|tif/i.test(format)) ?? formats[0] ?? 'GeoTIFF';

export const parseWcsCapabilities = async (url: string): Promise<WcsCapabilitiesInfo | null> => {
	try {
		const capsUrl = new URL(url);
		capsUrl.searchParams.set('service', 'WCS');
		capsUrl.searchParams.set('request', 'GetCapabilities');

		const response = await fetch(capsUrl.toString());
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const xmlString = await response.text();
		const xml = parseXml(xmlString);
		const root = xml.documentElement;
		const version = root.getAttribute('version') ?? '';
		const isWcs2 = version.startsWith('2.');
		const isWcs1 = version.startsWith('1.');
		if (!isWcs1 && !isWcs2) {
			throw new Error(`WCS ${version || 'unknown'} は未対応です。`);
		}

		const supportedFormats = isWcs2
			? Array.from(
					xml.querySelectorAll(
						'ServiceMetadata > formatSupported, wcs\\:ServiceMetadata > wcs\\:formatSupported'
					)
				)
					.map((element) => element.textContent?.trim() ?? '')
					.filter(Boolean)
			: Array.from(xml.querySelectorAll('supportedFormats > formats'))
					.map((element) => element.textContent?.trim() ?? '')
					.filter(Boolean);

		const serviceUrl = isWcs2
			? (() => {
					const operation = xml.querySelector(
						'ows\\:OperationsMetadata ows\\:Operation[name="GetCoverage"] ows\\:DCP ows\\:HTTP ows\\:Get'
					);
					return (
						operation?.getAttribute('xlink:href') ??
						operation?.getAttribute('href') ??
						stripKnownParams(capsUrl).toString()
					);
				})()
			: (() => {
					const onlineResource = xml.querySelector(
						'Capability > Request > GetCoverage OnlineResource, OnlineResource'
					);
					return (
						onlineResource?.getAttribute('xlink:href') ??
						onlineResource?.getAttribute('href') ??
						stripKnownParams(capsUrl).toString()
					);
				})();

		const coverages = isWcs2
			? Array.from(xml.querySelectorAll('CoverageSummary, wcs\\:CoverageSummary'))
					.map((coverage) => {
						const id = getElementText(coverage, ['CoverageId', 'wcs\\:CoverageId']);
						if (!id) return null;

						return {
							id,
							title: getElementText(coverage, ['Title', 'ows\\:Title']) ?? id,
							bbox: parseBoundingBox(coverage)
						} satisfies WcsCoverageSummary;
					})
					.filter((coverage): coverage is WcsCoverageSummary => coverage !== null)
			: Array.from(xml.querySelectorAll('CoverageOfferingBrief')).map((coverage) => {
					const id = getElementText(coverage, ['name']) ?? '';
					return {
						id,
						title: getElementText(coverage, ['label']) ?? id,
						bbox: parseLonLatEnvelope(coverage)
					} satisfies WcsCoverageSummary;
				});

		return {
			version,
			serviceUrl,
			supportedFormats,
			coverages
		};
	} catch (error) {
		console.error('Failed to fetch or parse WCS Capabilities:', error);
		return null;
	}
};

export const describeWcsCoverage = async (
	serviceUrl: string,
	version: string,
	coverageId: string
): Promise<WcsCoverageDescription | null> => {
	try {
		const describeUrl = new URL(serviceUrl);
		describeUrl.searchParams.set('service', 'WCS');
		describeUrl.searchParams.set('version', version);
		describeUrl.searchParams.set('request', 'DescribeCoverage');
		if (version.startsWith('2.')) {
			describeUrl.searchParams.set('coverageId', coverageId);
		} else {
			describeUrl.searchParams.set('coverage', coverageId);
		}

		const response = await fetch(describeUrl.toString());
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const xmlString = await response.text();
		const xml = parseXml(xmlString);
		const coverage =
			xml.querySelector('CoverageDescription, wcs\\:CoverageDescription, CoverageOffering') ??
			xml.documentElement;
		const envelope = coverage.querySelector(
			'Envelope, gml\\:Envelope, EnvelopeWithTimePeriod, gml\\:EnvelopeWithTimePeriod'
		);

		const axisLabels =
			envelope
				?.getAttribute('axisLabels')
				?.trim()
				.split(/\s+/)
				.filter(Boolean) ?? [];
		const lower = parseCorner(getElementText(envelope ?? coverage, ['LowerCorner', 'gml\\:LowerCorner']));
		const upper = parseCorner(getElementText(envelope ?? coverage, ['UpperCorner', 'gml\\:UpperCorner']));
		const bbox = toBbox(lower, upper) ?? parseLonLatEnvelope(coverage);
		const srsName = envelope?.getAttribute('srsName') ?? null;
		const supportedFormats = version.startsWith('2.')
			? Array.from(
					coverage.querySelectorAll('ServiceParameters > nativeFormat, ServiceParameters > formatSupported')
				)
					.map((element) => element.textContent?.trim() ?? '')
					.filter(Boolean)
			: Array.from(coverage.querySelectorAll('supportedFormats > formats'))
					.map((element) => element.textContent?.trim() ?? '')
					.filter(Boolean);
		const supportedCrs = version.startsWith('2.')
			? (srsName ? [srsName] : [])
			: Array.from(coverage.querySelectorAll('supportedCRSs > requestResponseCRSs'))
					.map((element) => element.textContent?.trim() ?? '')
					.filter(Boolean);

		return {
			axisLabels,
			bbox,
			srsName,
			supportedFormats,
			supportedCrs
		};
	} catch (error) {
		console.error('Failed to describe WCS coverage:', error);
		return null;
	}
};

export const buildWcsGetCoverageUrl = ({
	serviceUrl,
	version,
	coverageId,
	format,
	axisLabels,
	bbox,
	crs,
	width,
	height
}: {
	serviceUrl: string;
	version: string;
	coverageId: string;
	format: string;
	axisLabels?: string[];
	bbox?: [number, number, number, number] | null;
	crs?: string;
	width?: number;
	height?: number;
}): string => {
	const coverageUrl = new URL(serviceUrl);
	coverageUrl.searchParams.set('service', 'WCS');
	coverageUrl.searchParams.set('version', version);
	coverageUrl.searchParams.set('request', 'GetCoverage');
	coverageUrl.searchParams.set('format', format);
	if (version.startsWith('2.')) {
		coverageUrl.searchParams.set('coverageId', coverageId);
		const validAxisLabels = axisLabels?.slice(0, 2).filter(Boolean) ?? [];
		if (bbox && validAxisLabels.length >= 2) {
			coverageUrl.searchParams.append('subset', `${validAxisLabels[0]}(${bbox[0]},${bbox[2]})`);
			coverageUrl.searchParams.append('subset', `${validAxisLabels[1]}(${bbox[1]},${bbox[3]})`);
		}
	} else {
		coverageUrl.searchParams.set('coverage', coverageId);
		if (crs) {
			coverageUrl.searchParams.set('CRS', crs);
		}
		if (bbox) {
			coverageUrl.searchParams.set('BBOX', bbox.join(','));
		}
		if (width) {
			coverageUrl.searchParams.set('WIDTH', String(width));
		}
		if (height) {
			coverageUrl.searchParams.set('HEIGHT', String(height));
		}
	}

	return coverageUrl.toString();
};

export const getWcsPreferredFormat = (formats: string[]): string => getPreferredFormat(formats);
