/**
 * LandXML パーサー
 *
 * - LandXML仕様: http://www.landxml.org/
 * - J-LandXML (国交省): https://www.mlit.go.jp/tec/it/denshi/index.html
 * - landxml npm: https://github.com/abrman/landxml
 */

import type { FeatureCollection } from '$routes/map/types/geojson';
import { getProjContext, isValidEpsg } from '$routes/map/utils/proj/dict';
import { getJapanPlaneRectangularEpsg } from '../../proj/japan-plane-rectangular';
import { reprojectGeoJson, toGlbAndContours } from 'landxml';
import proj4 from 'proj4';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import RasterizeWorker from './rasterize.worker?worker';

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
	/** 元の座標系 bbox [minX, minY, maxX, maxY] */
	sourceBbox?: [number, number, number, number];
	/** 標高の最小値 */
	minHeight?: number;
	/** 標高の最大値 */
	maxHeight?: number;
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

const exportMeshToGlb = async (mesh: THREE.Mesh): Promise<Uint8Array> => {
	const exporter = new GLTFExporter();

	const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
		exporter.parse(
			mesh,
			(result) => {
				if (result instanceof ArrayBuffer) {
					resolve(result);
					return;
				}

				reject(new Error('GLB export did not return binary data'));
			},
			(error) => {
				reject(error instanceof Error ? error : new Error(String(error)));
			},
			{ binary: true }
		);
	});

	return new Uint8Array(arrayBuffer);
};

const getTinBounds = (points: [number, number, number][]): [number, number, number, number] => {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const [x, y] of points) {
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	}

	return [minX, minY, maxX, maxY];
};

const getTinHeightRange = (points: [number, number, number][]): [number, number] => {
	let minHeight = Infinity;
	let maxHeight = -Infinity;

	for (const [, , z] of points) {
		minHeight = Math.min(minHeight, z);
		maxHeight = Math.max(maxHeight, z);
	}

	return [minHeight, maxHeight];
};

const buildTinHeightRangeMap = (tinSurfaces: TinSurfaceData[]) => {
	const rangeMap = new Map<string, [number, number][]>();

	for (const tin of tinSurfaces) {
		const current = rangeMap.get(tin.name) ?? [];
		current.push(getTinHeightRange(tin.points));
		rangeMap.set(tin.name, current);
	}

	return rangeMap;
};

const createGlbFromTin = async (
	tin: TinSurfaceData
): Promise<{
	glb: Uint8Array;
	center: [number, number];
	sourceBbox: [number, number, number, number];
	minHeight: number;
	maxHeight: number;
}> => {
	const sourceBbox = getTinBounds(tin.points);
	const [minHeight, maxHeight] = getTinHeightRange(tin.points);
	const normalizedHeightRange = Math.max(1e-6, maxHeight - minHeight);
	const centerX = (sourceBbox[0] + sourceBbox[2]) / 2;
	const centerY = (sourceBbox[1] + sourceBbox[3]) / 2;
	const positions = new Float32Array(tin.points.length * 3);
	const uvs = new Float32Array(tin.points.length * 2);
	const indices: number[] = [];

	for (let i = 0; i < tin.points.length; i++) {
		const [xNorth, yEast, z] = tin.points[i];
		const posIndex = i * 3;
		const uvIndex = i * 2;

		// LandXML では X=北, Y=東 の並びを取ることがあるため、
		// モデルローカルでは X=東西, Y=高さ, Z=南北 として扱う。
		positions[posIndex] = yEast - centerY;
		positions[posIndex + 1] = z;
		positions[posIndex + 2] = xNorth - centerX;
		uvs[uvIndex] = 0.5;
		uvs[uvIndex + 1] = (z - minHeight) / normalizedHeightRange;
	}

	for (const [a, b, c] of tin.faces) {
		// LandXML の座標軸を model local へ組み替える際に handedness が反転するので、
		// カリングで消えないよう winding を反転しておく。
		indices.push(a - 1, c - 1, b - 1);
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();

	const material = new THREE.MeshStandardMaterial({
		color: '#d9d9d9',
		roughness: 1,
		metalness: 0
	});
	const mesh = new THREE.Mesh(geometry, material);

	try {
		return {
			glb: await exportMeshToGlb(mesh),
			center: [centerX, centerY],
			sourceBbox,
			minHeight,
			maxHeight
		};
	} finally {
		geometry.dispose();
		material.dispose();
	}
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
	const tinSurfaces = parseTinSurfaces(text);
	const tinHeightRangeMap = buildTinHeightRangeMap(tinSurfaces);
	const tinMeshMap = new Map<
		string,
		{
			glb: Uint8Array;
			center: [number, number];
			sourceBbox: [number, number, number, number];
			minHeight: number;
			maxHeight: number;
		}[]
	>();

	// landxmlパッケージでの等高線+GLB生成を試行
	try {
		const results = await toGlbAndContours(text, contourInterval, true, 'auto');

		if (results && results.length > 0) {
			const tinMeshes = await Promise.all(
				tinSurfaces.map(async (tin) => ({
					name: tin.name,
					mesh: await createGlbFromTin(tin)
				}))
			);
			for (const { name, mesh } of tinMeshes) {
				const current = tinMeshMap.get(name) ?? [];
				current.push(mesh);
				tinMeshMap.set(name, current);
			}

			let projString: string | null = null;
			let isReprojected = false;

			if (results[0].wktString) {
				projString = results[0].wktString;
			} else if (detectedZone) {
				const epsg = getJapanPlaneRectangularEpsg(detectedZone, 'jgd2011')?.replace(
					/^EPSG:/i,
					''
				);
				if (epsg && isValidEpsg(epsg)) {
					projString = getProjContext(epsg);
				}
			}

			const surfaces: LandXmlSurface[] = results.map((result) => {
				let contourGeojson: FeatureCollection | null = null;
				const rawGeojson = result.geojson as unknown as FeatureCollection;
				const surfaceName = result.name || 'Surface';
				const heightRangeCandidates = tinHeightRangeMap.get(surfaceName) ?? [];
				const heightRange = heightRangeCandidates.shift();
				if (heightRangeCandidates.length === 0) {
					tinHeightRangeMap.delete(surfaceName);
				}
				const meshCandidates = tinMeshMap.get(surfaceName) ?? [];
				const mesh = meshCandidates.shift();
				if (meshCandidates.length === 0) {
					tinMeshMap.delete(surfaceName);
				}

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
					name: surfaceName,
					description: result.description || '',
					contourGeojsonRaw: rawGeojson,
					contourGeojson,
					glb: mesh?.glb ?? result.glb,
					center: mesh?.center ?? result.center,
					sourceBbox: mesh?.sourceBbox,
					minHeight: mesh?.minHeight ?? heightRange?.[0],
					maxHeight: mesh?.maxHeight ?? heightRange?.[1],
					wktString: result.wktString
				};
			});

			return { surfaces, detectedZone, isReprojected };
		}
	} catch (e) {
		console.warn('landxml package failed, falling back to TIN-only parsing:', e);
	}

	// フォールバック: 自前でTINをパースして最低限のサーフェス情報を返す
	if (tinSurfaces.length === 0) {
		throw new Error('No surfaces found in LandXML file');
	}

	const surfaces: LandXmlSurface[] = await Promise.all(
		tinSurfaces.map(async (tin) => {
			const mesh = await createGlbFromTin(tin);
			return {
				name: tin.name,
				description: '',
				contourGeojsonRaw: {
					type: 'FeatureCollection',
					features: []
				} as unknown as FeatureCollection,
				contourGeojson: null,
				glb: mesh.glb,
				center: mesh.center,
				sourceBbox: mesh.sourceBbox,
				minHeight: mesh.minHeight,
				maxHeight: mesh.maxHeight,
				wktString: undefined
			};
		})
	);

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

	const surfaceEls = doc.getElementsByTagNameNS(ns, 'Surface').length > 0
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
		const epsg = getJapanPlaneRectangularEpsg(detectedZone, 'jgd2011')?.replace(
			/^EPSG:/i,
			''
		);
		if (epsg && isValidEpsg(epsg)) {
			projString = getProjContext(epsg);
		}
	}

	return rasterizeTin(tinSurfaces[surfaceIndex], resolution, projString);
};
