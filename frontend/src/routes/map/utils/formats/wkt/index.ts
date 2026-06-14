/**
 * Format spec:
 * - https://www.ogc.org/standards/sfa/
 *
 * References:
 * - https://libgeos.org/specifications/wkt/
 */
import WKT from 'ol/format/WKT.js';

import type { FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { geometryToGeoJSON } from '$routes/map/utils/formats/transformers/geometry';
import { type EpsgCode, isValidEpsg } from '$routes/map/utils/proj/dict';

export class WktParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'WktParseError';
	}
}

type ParsedWktLine = {
	epsgCode: EpsgCode | null;
	wkt: string;
};

export type WktParseResult = {
	geojson: FeatureCollection;
	epsgCode: EpsgCode | null;
};

const WKT_PREFIX_RE = /^(SRID=(\d+);)?(.*)$/i;

const splitWktText = (text: string): string[] => {
	const normalized = text.replace(/\r\n/g, '\n');
	const lines = normalized
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length > 1) {
		return lines;
	}

	return normalized
		.split(/;\s*(?=(?:SRID=\d+;)?[A-Z])/i)
		.map((part) => part.trim())
		.filter(Boolean);
};

const parseWktLine = (line: string): ParsedWktLine => {
	const match = line.match(WKT_PREFIX_RE);
	if (!match) {
		throw new WktParseError('WKTの形式が正しくありません');
	}

	const srid = match[2];
	const wkt = match[3]?.trim() ?? '';
	if (!wkt) {
		throw new WktParseError('WKTのジオメトリが見つかりません');
	}

	if (!srid) {
		return { epsgCode: null, wkt };
	}

	return {
		epsgCode: isValidEpsg(srid) ? srid : null,
		wkt
	};
};

export const wktFileToGeojson = async (file: File): Promise<WktParseResult> => {
	const text = await file.text();
	return wktTextToGeojson(text, file.name);
};

export const wktTextToGeojson = (text: string, sourceName: string = 'WKT'): WktParseResult => {
	const lines = splitWktText(text);

	if (lines.length === 0) {
		throw new WktParseError('WKTファイルが空です');
	}

	const format = new WKT();
	const features: FeatureCollection['features'] = [];
	let resolvedEpsgCode: EpsgCode | null = null;
	let hasMixedSrid = false;

	for (const [index, line] of lines.entries()) {
		const { epsgCode, wkt } = parseWktLine(line);

		try {
			const geometry = format.readGeometry(wkt);
			const geojsonGeometry = geometryToGeoJSON(geometry);
			if (!geojsonGeometry) {
				continue;
			}

			features.push({
				type: 'Feature',
				id: `${sourceName}_${index}`,
				geometry: geojsonGeometry,
				properties: {
					source: 'WKT',
					rowIndex: index + 1
				} as FeatureProp
			});

			if (epsgCode) {
				if (!resolvedEpsgCode) {
					resolvedEpsgCode = epsgCode;
				} else if (resolvedEpsgCode !== epsgCode) {
					hasMixedSrid = true;
				}
			}
		} catch (error) {
			throw new WktParseError(
				`${index + 1}行目のWKTを読み込めませんでした${
					error instanceof Error ? `: ${error.message}` : ''
				}`
			);
		}
	}

	if (features.length === 0) {
		throw new WktParseError('WKTからジオメトリを読み込めませんでした');
	}

	return {
		geojson: {
			type: 'FeatureCollection',
			features
		},
		epsgCode: hasMixedSrid ? null : resolvedEpsgCode
	};
};
