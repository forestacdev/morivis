/**
 * Format spec:
 * - https://service.gsi.go.jp/kiban/contents/screen/basismap/documents/FGD_DLFileSpecV5.2.pdf
 *
 * References:
 * - https://fgd.gsi.go.jp/download/reference.html
 * - https://fgd.gsi.go.jp/download/documents.html
 */
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

import { getChildElements, getParserErrorText, parseXmlDocument } from './shared';

const GML_NS = 'http://www.opengis.net/gml/3.2';
const FGD_NS = 'http://fgd.gsi.go.jp/spec/2008/FGD_GMLSchema';

const FGD_FEATURE_TAGS = [
	'GCP',
	'ElevPt',
	'AdmPt',
	'SBAPt',
	'RdEdg',
	'Cntr',
	'AdmBdry',
	'CommBdry',
	'RdCompt',
	'BldL',
	'WL',
	'WStrL',
	'SBBdry',
	'BldA',
	'AdmArea',
	'WA',
	'WStrA'
] as const;

const parsePosListText = (text: string): [number, number][] => {
	const values = text.trim().split(/\s+/).map(Number);
	const coords: [number, number][] = [];
	for (let i = 0; i < values.length - 1; i += 2) {
		coords.push([values[i + 1], values[i]]);
	}
	return coords;
};

const parsePosText = (text: string): [number, number] => {
	const [lat, lon] = text.trim().split(/\s+/).map(Number);
	return [lon, lat];
};

const parsePointGeometry = (featureEl: Element): AnyGeometry | null => {
	const posEl = featureEl.getElementsByTagNameNS(FGD_NS, 'pos')[0]
		?? featureEl.getElementsByTagName('pos')[0];
	if (!posEl) return null;

	const gmlPos = posEl.getElementsByTagNameNS(GML_NS, 'pos')[0];
	if (!gmlPos?.textContent) return null;

	return { type: 'Point', coordinates: parsePosText(gmlPos.textContent) };
};

const parseLineGeometry = (featureEl: Element): AnyGeometry | null => {
	const locEl = featureEl.getElementsByTagNameNS(FGD_NS, 'loc')[0]
		?? featureEl.getElementsByTagName('loc')[0];
	if (!locEl) return null;

	const posLists = locEl.getElementsByTagNameNS(GML_NS, 'posList');
	if (posLists.length === 0) return null;

	const allCoords: [number, number][] = [];
	for (const posList of Array.from(posLists)) {
		if (posList.textContent) {
			allCoords.push(...parsePosListText(posList.textContent));
		}
	}

	if (allCoords.length === 0) return null;
	return { type: 'LineString', coordinates: allCoords };
};

const parsePolygonGeometry = (featureEl: Element): AnyGeometry | null => {
	const areaEl = featureEl.getElementsByTagNameNS(FGD_NS, 'area')[0]
		?? featureEl.getElementsByTagName('area')[0];
	if (!areaEl) return null;

	const patches = areaEl.getElementsByTagNameNS(GML_NS, 'PolygonPatch');
	if (patches.length === 0) return null;

	const rings: [number, number][][] = [];

	for (const patch of patches) {
		const exterior = patch.getElementsByTagNameNS(GML_NS, 'exterior')[0];
		if (exterior) {
			const posLists = exterior.getElementsByTagNameNS(GML_NS, 'posList');
			const coords: [number, number][] = [];
			for (const posList of Array.from(posLists)) {
				if (posList.textContent) {
					coords.push(...parsePosListText(posList.textContent));
				}
			}
			if (coords.length > 0) rings.push(coords);
		}

		const interiors = patch.getElementsByTagNameNS(GML_NS, 'interior');
		for (const interior of Array.from(interiors)) {
			const posLists = interior.getElementsByTagNameNS(GML_NS, 'posList');
			const coords: [number, number][] = [];
			for (const posList of Array.from(posLists)) {
				if (posList.textContent) {
					coords.push(...parsePosListText(posList.textContent));
				}
			}
			if (coords.length > 0) rings.push(coords);
		}
	}

	if (rings.length === 0) return null;
	return { type: 'Polygon', coordinates: rings };
};

const parseFgdGeometry = (featureEl: Element): AnyGeometry | null =>
	parsePointGeometry(featureEl) ?? parseLineGeometry(featureEl)
		?? parsePolygonGeometry(featureEl);

const SKIP_PROPERTY_TAGS = new Set([
	'pos',
	'loc',
	'area',
	'fid',
	'lfSpanFr',
	'devDate',
	'orgGILvl'
]);

const parseFgdProperties = (featureEl: Element): Record<string, string> => {
	const props: Record<string, string> = {};
	for (const child of getChildElements(featureEl)) {
		const tag = child.localName;
		if (SKIP_PROPERTY_TAGS.has(tag)) continue;
		if (child.namespaceURI === GML_NS) continue;
		const text = child.textContent?.trim();
		if (text) props[tag] = text;
	}
	return props;
};

export const parseFgdGml = async (text: string): Promise<FeatureCollection> => {
	const doc = await parseXmlDocument(text);

	const parserErrorText = getParserErrorText(doc);
	if (parserErrorText) {
		throw new Error('Invalid XML: ' + parserErrorText);
	}

	const features: Feature[] = [];

	for (const tag of FGD_FEATURE_TAGS) {
		const elements = doc.getElementsByTagNameNS(FGD_NS, tag).length > 0
			? doc.getElementsByTagNameNS(FGD_NS, tag)
			: doc.getElementsByTagName(tag);

		for (const el of Array.from(elements)) {
			const geometry = parseFgdGeometry(el);
			if (!geometry) continue;

			const properties = parseFgdProperties(el);
			properties._featureType = tag;

			features.push({
				type: 'Feature',
				id: el.getAttributeNS(GML_NS, 'id') ?? undefined,
				geometry,
				properties: properties as unknown as FeatureProp
			});
		}
	}

	if (features.length === 0) {
		throw new Error('No features found in FGD GML file');
	}

	return { type: 'FeatureCollection', features };
};
