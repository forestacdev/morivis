/**
 * LandXML パーサー
 *
 * - LandXML仕様: http://www.landxml.org/
 * - J-LandXML (国交省): https://www.mlit.go.jp/tec/it/denshi/index.html
 * - landxml npm: https://github.com/abrman/landxml
 */

import proj4 from 'proj4';
import { toGlbAndContours, reprojectGeoJson } from 'landxml';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { getProjContext, isValidEpsg } from '$routes/map/utils/proj/dict';
import RasterizeWorker from '$routes/map/utils/file/landxml_rasterize.worker?worker';

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
 * landxmlパッケージが失敗した場合はTINデータのみで最低限の結果を返す
 */
export const parseLandXml = async (
	file: File,
	contourInterval: number = 1
): Promise<LandXmlParseResult> => {
	const text = await file.text();
	const detectedZone = detectJprZone(text);

	// landxmlパッケージでの等高線+GLB生成を試行
	try {
		const results = await toGlbAndContours(text, contourInterval, true, 'auto');

		if (results && results.length > 0) {
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
		}
	} catch (e) {
		console.warn('landxml package failed, falling back to TIN-only parsing:', e);
	}

	// フォールバック: 自前でTINをパースして最低限のサーフェス情報を返す
	const tinSurfaces = parseTinSurfaces(text);

	if (tinSurfaces.length === 0) {
		throw new Error('No surfaces found in LandXML file');
	}

	const surfaces: LandXmlSurface[] = tinSurfaces.map((tin) => ({
		name: tin.name,
		description: '',
		contourGeojsonRaw: { type: 'FeatureCollection', features: [] } as unknown as FeatureCollection,
		contourGeojson: null,
		glb: new Uint8Array(0),
		center: [0, 0] as [number, number],
		wktString: undefined
	}));

	return { surfaces, detectedZone, isReprojected: false };
};

// ---- TIN → DEM ラスタライズ ----

export interface TinSurfaceData {
	name: string;
	points: [number, number, number][];
	faces: [number, number, number][];
}

export interface LandXmlDemResult {
	data: Float32Array;
	width: number;
	height: number;
	/** WGS84 bbox [minLon, minLat, maxLon, maxLat] */
	bbox: [number, number, number, number];
	nodata: number;
}

/**
 * LandXMLからTINサーフェスデータを直接XMLパースで取得する
 */
export const parseTinSurfaces = (text: string): TinSurfaceData[] => {
	const parser = new DOMParser();
	const doc = parser.parseFromString(text, 'text/xml');
	const ns = 'http://www.landxml.org/schema/LandXML-1.2';

	const surfaceEls =
		doc.getElementsByTagNameNS(ns, 'Surface').length > 0
			? doc.getElementsByTagNameNS(ns, 'Surface')
			: doc.getElementsByTagName('Surface');

	const results: TinSurfaceData[] = [];

	for (const surfaceEl of surfaceEls) {
		const name = surfaceEl.getAttribute('name') || 'Surface';

		const pntsEl = surfaceEl.getElementsByTagName('Pnts')[0];
		const facesEl = surfaceEl.getElementsByTagName('Faces')[0];
		if (!pntsEl || !facesEl) continue;

		// ポイント: <P id="1">x y z</P>
		const pEls = pntsEl.getElementsByTagName('P');
		const points: [number, number, number][] = [];
		const idMap = new Map<string, number>(); // id → 0-based index

		for (const pEl of pEls) {
			const id = pEl.getAttribute('id') || '';
			const coords = pEl.textContent?.trim().split(/\s+/).map(Number);
			if (!coords || coords.length < 3) continue;
			idMap.set(id, points.length);
			points.push([coords[0], coords[1], coords[2]]);
		}

		// フェース: <F>1 2 3</F> (1-based ID)
		const fEls = facesEl.getElementsByTagName('F');
		const faces: [number, number, number][] = [];

		for (const fEl of fEls) {
			const indices = fEl.textContent?.trim().split(/\s+/);
			if (!indices || indices.length < 3) continue;
			// IDベースで解決（1-based indexではなく属性id参照の可能性あり）
			const i0 = idMap.get(indices[0]);
			const i1 = idMap.get(indices[1]);
			const i2 = idMap.get(indices[2]);
			if (i0 !== undefined && i1 !== undefined && i2 !== undefined) {
				// worker側は1-basedを期待するので+1
				faces.push([i0 + 1, i1 + 1, i2 + 1]);
			}
		}

		if (points.length > 0 && faces.length > 0) {
			results.push({ name, points, faces });
		}
	}

	return results;
};

/**
 * TINサーフェスをラスタライズしてDEMデータを生成する
 * @param tin TINサーフェスデータ
 * @param resolution 長辺のピクセル数
 * @param projString 元の座標系のproj4文字列（WGS84変換に使用）
 */
export const rasterizeTin = async (
	tin: TinSurfaceData,
	resolution: number = 256,
	projString?: string
): Promise<LandXmlDemResult> => {
	const worker = new RasterizeWorker();

	const result = await new Promise<{
		data: Float32Array;
		width: number;
		height: number;
		bbox: [number, number, number, number];
	}>((resolve, reject) => {
		worker.onmessage = (e) => {
			resolve(e.data);
			worker.terminate();
		};
		worker.onerror = (e) => {
			reject(new Error(e.message));
			worker.terminate();
		};
		worker.postMessage({ points: tin.points, faces: tin.faces, resolution });
	});

	// bbox を WGS84 に変換
	let bbox: [number, number, number, number];
	if (projString) {
		const [minX, minY, maxX, maxY] = result.bbox;
		const sw = proj4(projString, 'EPSG:4326', [minY, minX]); // J-LandXMLはX=北,Y=東
		const ne = proj4(projString, 'EPSG:4326', [maxY, maxX]);
		bbox = [sw[0], sw[1], ne[0], ne[1]];
	} else {
		bbox = result.bbox;
	}

	return {
		data: result.data,
		width: result.width,
		height: result.height,
		bbox,
		nodata: -9999
	};
};

/**
 * LandXMLファイルからDEMラスターを生成する
 */
export const landXmlFileToDem = async (
	file: File,
	surfaceIndex: number = 0,
	resolution: number = 256,
	overrideProjString?: string
): Promise<LandXmlDemResult> => {
	const text = await file.text();
	const detectedZone = detectJprZone(text);
	const tinSurfaces = parseTinSurfaces(text);

	if (tinSurfaces.length === 0) {
		throw new Error('No TIN surfaces found in LandXML file');
	}

	if (surfaceIndex >= tinSurfaces.length) {
		throw new Error(`Surface index ${surfaceIndex} out of range`);
	}

	let projString: string | undefined = overrideProjString;
	if (!projString && detectedZone) {
		const epsg = jprZoneToEpsg(detectedZone);
		if (epsg && isValidEpsg(epsg)) {
			projString = getProjContext(epsg);
		}
	}

	return rasterizeTin(tinSurfaces[surfaceIndex], resolution, projString);
};
