/**
 * Format spec:
 * - https://service.gsi.go.jp/kiban/contents/screen/basismap/documents/FGD_DLFileSpecV5.2.pdf
 * - https://nlftp.mlit.go.jp/ksj/ksj_dataformat.html
 *
 * References:
 * - https://www.ogc.org/standards/gml/
 */
import type { FeatureCollection } from '$routes/map/types/geojson';

import { detectGmlDialect, type GmlDialect, isFgdGml, isKsjGml } from './detector';
import { parseFgdGml } from './fgd';
import { parseGenericGml } from './generic';
import { parseKsjGml } from './ksj';

type GmlParser = (text: string) => Promise<FeatureCollection> | FeatureCollection;

const GML_PARSERS: Record<GmlDialect, GmlParser> = {
	fgd: parseFgdGml,
	ksj: parseKsjGml,
	generic: parseGenericGml
};

export { detectGmlDialect, isFgdGml, isKsjGml };

export const gmlTextToGeoJson = async (text: string): Promise<FeatureCollection> => {
	return await GML_PARSERS[detectGmlDialect(text)](text);
};

/**
 * GMLファイルをパースしてGeoJSONのFeatureCollectionに変換する
 * 基盤地図情報GMLと汎用GMLの両方に対応
 */
export const gmlFileToGeoJson = async (file: File): Promise<FeatureCollection> => {
	try {
		const text = await file.text();
		return await gmlTextToGeoJson(text);
	} catch (error) {
		console.error('GML parsing error:', error);
		throw new Error('Failed to parse GML file');
	}
};
