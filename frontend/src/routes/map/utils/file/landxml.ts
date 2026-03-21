/**
 * LandXML パーサー
 *
 * - LandXML仕様: http://www.landxml.org/
 * - J-LandXML (国交省): https://www.mlit.go.jp/tec/it/denshi/index.html
 * - landxml npm: https://github.com/abrman/landxml
 */

import { toGlbAndContours, reprojectGeoJson } from 'landxml';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { getProjContext, isValidEpsg } from '$routes/map/utils/proj/dict';

export interface LandXmlSurface {
	name: string;
	description: string;
	/** 等高線GeoJSON（未変換、元の座標系） */
	contourGeojsonRaw: FeatureCollection;
	/** 等高線GeoJSON（WGS84変換済み、変換できた場合のみ） */
	contourGeojson: FeatureCollection | null;
	/** GLBバイナリ */
	glb: Uint8Array;
	/** GLBの中心座標 [x, y]（元の座標系） */
	center: [number, number];
	/** 元の座標系のWKT文字列 */
	wktString?: string;
}

export interface LandXmlParseResult {
	surfaces: LandXmlSurface[];
	/** J-LandXMLのCoordinateSystemから検出した系番号 (1-19) */
	detectedZone: number | null;
	/** 座標変換が完了しているか */
	isReprojected: boolean;
}

/**
 * J-LandXMLのCoordinateSystem要素から平面直角座標系の系番号を検出する
 * horizontalCoordinateSystemName="9(X,Y)" → 9
 */
const detectJprZone = (text: string): number | null => {
	// horizontalCoordinateSystemName="9(X,Y)" パターン
	const match = text.match(/horizontalCoordinateSystemName="(\d{1,2})\s*\(/);
	if (match) return parseInt(match[1], 10);

	// coordinateSystemName や desc に「第N系」パターン
	const matchJp = text.match(/第(\d{1,2})系/);
	if (matchJp) return parseInt(matchJp[1], 10);

	return null;
};

/**
 * 平面直角座標系の系番号からEPSGコードを取得 (JGD2011: EPSG:6669-6687)
 */
const jprZoneToEpsg = (zone: number): string | null => {
	if (zone < 1 || zone > 19) return null;
	return String(6668 + zone); // zone 1 → 6669, zone 9 → 6677
};

/**
 * LandXMLファイルをパースして等高線GeoJSON + GLBを生成する
 */
export const parseLandXml = async (
	file: File,
	contourInterval: number = 1
): Promise<LandXmlParseResult> => {
	try {
		const text = await file.text();
		const detectedZone = detectJprZone(text);

		const results = await toGlbAndContours(text, contourInterval, true, 'auto');

		if (!results || results.length === 0) {
			throw new Error('No surfaces found in LandXML file');
		}

		// 座標変換のproj4文字列を決定
		let projString: string | null = null;
		let isReprojected = false;

		if (results[0].wktString) {
			projString = results[0].wktString;
		} else if (detectedZone) {
			const epsg = jprZoneToEpsg(detectedZone);
			if (epsg && isValidEpsg(epsg)) {
				projString = getProjContext(epsg);
			}
		}

		const surfaces: LandXmlSurface[] = results.map((result) => {
			let contourGeojson: FeatureCollection | null = null;
			const rawGeojson = result.geojson as unknown as FeatureCollection;

			const effectiveProj = result.wktString || projString;

			if (effectiveProj) {
				try {
					contourGeojson = reprojectGeoJson(
						result.geojson,
						effectiveProj,
						'WGS84'
					) as unknown as FeatureCollection;
					isReprojected = true;
				} catch (e) {
					console.warn('Reprojection failed for surface:', result.name, e);
				}
			}

			return {
				name: result.name || 'Surface',
				description: result.description || '',
				contourGeojsonRaw: rawGeojson,
				contourGeojson,
				glb: result.glb,
				center: result.center,
				wktString: result.wktString
			};
		});

		return { surfaces, detectedZone, isReprojected };
	} catch (error) {
		console.error('LandXML parsing error:', error);
		throw new Error('Failed to parse LandXML file');
	}
};
