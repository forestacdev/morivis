import type { FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { normalizeGeoJsonGeometryCollections } from '$routes/map/utils/formats/geojson';
import toGeoJSON from '@mapbox/togeojson';
import { GX_NS, KML_NS } from './constants';
import { applyStyleProperties, type KmlStyleMaps, parseKmlStyles } from './styles';
import { getDirectChildText, getFirstChildText, parseXmlDocument } from './xml';

export interface KmlParseResult extends KmlStyleMaps {
	geojson: FeatureCollection;
}

const extractPropertiesFromDescription = (description: string): Record<string, string> => {
	const props: Record<string, string> = {};
	const rowRegex = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gi;
	let match;
	while ((match = rowRegex.exec(description)) !== null) {
		const key = match[1].replace(/<[^>]*>/g, '').trim();
		const value = match[2].replace(/<[^>]*>/g, '').trim();
		if (key) {
			props[key] = value;
		}
	}
	return props;
};

const getAncestorFolderNames = (element: Element): string[] => {
	const names: string[] = [];
	let current = element.parentElement;

	while (current) {
		if (current.namespaceURI === KML_NS && current.localName === 'Folder') {
			const name = getDirectChildText(current, KML_NS, 'name');
			if (name) names.push(name);
		}
		current = current.parentElement;
	}

	return names.reverse();
};

const parseFolderTemporalText = (text: string) => {
	const normalized = text.trim();
	if (!normalized) return null;

	const yearMonthMatch = normalized.match(
		/(?:^|[^\d])((?:19|20)?\d{2})年\s*(\d{1,2})月(?:$|[^\d])/
	);
	if (yearMonthMatch) {
		let year = Number(yearMonthMatch[1]);
		const month = Number(yearMonthMatch[2]);
		if (year < 100) year += year >= 70 ? 1900 : 2000;
		if (month >= 1 && month <= 12) {
			return {
				label: normalized,
				year: String(year).padStart(4, '0'),
				month: String(month).padStart(2, '0'),
				period: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
			};
		}
	}

	const isoYearMonthMatch = normalized.match(/\b((?:19|20)\d{2})[-/](\d{1,2})\b/);
	if (isoYearMonthMatch) {
		const year = Number(isoYearMonthMatch[1]);
		const month = Number(isoYearMonthMatch[2]);
		if (month >= 1 && month <= 12) {
			return {
				label: normalized,
				year: String(year).padStart(4, '0'),
				month: String(month).padStart(2, '0'),
				period: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
			};
		}
	}

	const yearOnlyMatch = normalized.match(/\b((?:19|20)\d{2})\b/);
	if (yearOnlyMatch) {
		const year = Number(yearOnlyMatch[1]);
		return {
			label: normalized,
			year: String(year).padStart(4, '0')
		};
	}

	return null;
};

const extractPlacemarkTime = (placemark: Element): string | null => {
	const explicitTimeStamp = getFirstChildText(placemark, KML_NS, 'when');
	if (explicitTimeStamp) return explicitTimeStamp;

	const timeStamp = placemark.getElementsByTagNameNS(KML_NS, 'TimeStamp')[0];
	const timeStampWhen = timeStamp
		? (getFirstChildText(timeStamp, KML_NS, 'when')
			?? getFirstChildText(timeStamp, GX_NS, 'when'))
		: null;
	if (timeStampWhen) return timeStampWhen;

	const timeSpan = placemark.getElementsByTagNameNS(KML_NS, 'TimeSpan')[0];
	const begin = timeSpan ? getFirstChildText(timeSpan, KML_NS, 'begin') : null;
	if (begin) return begin;
	const end = timeSpan ? getFirstChildText(timeSpan, KML_NS, 'end') : null;
	if (end) return end;

	return null;
};

const extractPlacemarkProperties = (placemark: Element) => {
	const properties: Record<string, string | number | boolean> = {};

	const name = getFirstChildText(placemark, KML_NS, 'name');
	if (name) properties.name = name;

	const description = getFirstChildText(placemark, KML_NS, 'description');
	if (description) {
		if (/<table[\s>]/i.test(description)) {
			Object.assign(properties, extractPropertiesFromDescription(description));
		} else {
			properties.description = description;
		}
	}

	const styleUrl = getFirstChildText(placemark, KML_NS, 'styleUrl');
	if (styleUrl) properties.styleUrl = styleUrl;

	for (const dataElement of Array.from(placemark.getElementsByTagNameNS(KML_NS, 'Data'))) {
		const key = dataElement.getAttribute('name')?.trim();
		const value = getFirstChildText(dataElement, KML_NS, 'value');
		if (key && value) properties[key] = value;
	}

	for (
		const simpleDataElement of Array.from(
			placemark.getElementsByTagNameNS(KML_NS, 'SimpleData')
		)
	) {
		const key = simpleDataElement.getAttribute('name')?.trim();
		const value = simpleDataElement.textContent?.trim();
		if (key && value) properties[key] = value;
	}

	const folderNames = getAncestorFolderNames(placemark);
	if (folderNames.length > 0) {
		properties.folder_name = folderNames[folderNames.length - 1];
		properties.folder_path = folderNames.join(' / ');
	}

	for (const folderName of folderNames.slice().reverse()) {
		const temporalInfo = parseFolderTemporalText(folderName);
		if (!temporalInfo) continue;
		properties.folder_time_label = temporalInfo.label;
		if (temporalInfo.year) properties.folder_time_year = temporalInfo.year;
		if (temporalInfo.month) properties.folder_time_month = temporalInfo.month;
		if (temporalInfo.period) properties.folder_time_period = temporalInfo.period;
		break;
	}

	const time = extractPlacemarkTime(placemark);
	if (time) properties.time = time;

	return properties as FeatureProp;
};

const getTrackPointBearing = (
	previousCoordinate: [number, number] | null,
	nextCoordinate: [number, number] | null
) => {
	if (!previousCoordinate || !nextCoordinate) return null;

	const [fromLng, fromLat] = previousCoordinate;
	const [toLng, toLat] = nextCoordinate;
	const fromLatRad = (fromLat * Math.PI) / 180;
	const toLatRad = (toLat * Math.PI) / 180;
	const deltaLng = ((toLng - fromLng) * Math.PI) / 180;
	const y = Math.sin(deltaLng) * Math.cos(toLatRad);
	const x = Math.cos(fromLatRad) * Math.sin(toLatRad)
		- Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLng);

	return (Math.atan2(y, x) * 180) / Math.PI;
};

const parseTrackCoordinate = (value: string) => {
	const [lngText, latText] = value.trim().split(/\s+/);
	const lng = Number(lngText);
	const lat = Number(latText);
	if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

	return {
		coordinate2d: [lng, lat] as [number, number]
	};
};

const parseTrackFeatures = (
	doc: Document,
	fillColors: Map<string, string>,
	lineColors: Map<string, string>
) => {
	const features: {
		type: 'Feature';
		id: string | number;
		geometry: { type: 'Point'; coordinates: [number, number]; };
		properties: FeatureProp;
	}[] = [];
	let featureIndex = 1000000;

	for (const placemark of Array.from(doc.getElementsByTagNameNS(KML_NS, 'Placemark'))) {
		const trackElements = placemark.getElementsByTagNameNS(GX_NS, 'Track');
		if (trackElements.length === 0) continue;

		const baseProperties = extractPlacemarkProperties(placemark);
		applyStyleProperties(baseProperties, fillColors, lineColors);

		Array.from(trackElements).forEach((trackElement, trackIndex) => {
			const whenValues = Array.from(trackElement.getElementsByTagNameNS(KML_NS, 'when'))
				.map((element) => element.textContent?.trim() ?? '')
				.filter((value) => value !== '');
			const coordValues = Array.from(trackElement.getElementsByTagNameNS(GX_NS, 'coord'))
				.map((element) => element.textContent?.trim() ?? '')
				.filter((value) => value !== '');
			const pointCount = Math.min(whenValues.length, coordValues.length);
			if (pointCount === 0) return;

			for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
				const parsed = parseTrackCoordinate(coordValues[pointIndex]);
				if (!parsed) continue;

				const previous = pointIndex > 0
					? parseTrackCoordinate(coordValues[pointIndex - 1])
					: null;
				const next = pointIndex < pointCount - 1
					? parseTrackCoordinate(coordValues[pointIndex + 1])
					: null;
				const properties = {
					...baseProperties,
					time: whenValues[pointIndex],
					track_index: trackIndex,
					track_point_index: pointIndex
				} as FeatureProp;
				const bearing = getTrackPointBearing(
					previous?.coordinate2d ?? parsed.coordinate2d,
					next?.coordinate2d ?? null
				) ?? undefined;
				if (bearing != null) {
					properties.angle = bearing;
				}

				features.push({
					type: 'Feature',
					id: featureIndex,
					geometry: {
						type: 'Point',
						coordinates: parsed.coordinate2d
					},
					properties
				});
				featureIndex += 1;
			}
		});
	}

	return features;
};

export const parseKmlString = async (text: string): Promise<KmlParseResult> => {
	const doc = await parseXmlDocument(text);
	const rawGeojson = toGeoJSON.kml(doc) as FeatureCollection;
	const baseFeatures = normalizeGeoJsonGeometryCollections(rawGeojson).features;

	const { fillColors, lineColors } = parseKmlStyles(text);
	const placemarks = Array.from(doc.getElementsByTagNameNS(KML_NS, 'Placemark'));
	let featureIndex = 0;

	const features = placemarks
		.map((placemark) => {
			const baseFeature = baseFeatures[featureIndex];
			featureIndex += 1;

			if (placemark.getElementsByTagNameNS(GX_NS, 'Track').length > 0) {
				return null;
			}

			if (!baseFeature || baseFeature.type !== 'Feature' || !baseFeature.geometry) {
				return null;
			}

			const properties = {
				...(baseFeature.properties ?? {})
			} as FeatureProp;
			const xmlProperties = extractPlacemarkProperties(placemark);
			Object.assign(properties, xmlProperties);

			const desc = properties['description'];
			if (typeof desc === 'string' && /<table[\s>]/i.test(desc)) {
				const extracted = extractPropertiesFromDescription(desc);
				if (Object.keys(extracted).length > 0) {
					delete properties['description'];
					Object.assign(properties, extracted);
				}
			}

			applyStyleProperties(properties, fillColors, lineColors);

			return {
				type: 'Feature' as const,
				id: baseFeature.id ?? featureIndex - 1,
				geometry: baseFeature.geometry,
				properties
			};
		})
		.filter((feature): feature is NonNullable<typeof feature> => feature !== null);

	features.push(...parseTrackFeatures(doc, fillColors, lineColors));

	if (features.length === 0) {
		throw new Error('No features found in KML file');
	}

	return { geojson: { type: 'FeatureCollection', features }, fillColors, lineColors };
};
