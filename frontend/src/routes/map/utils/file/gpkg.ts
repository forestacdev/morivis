import { fromArrayBuffer } from 'geotiff';
import initSqlJs, { type Database } from 'sql.js';
import { base } from '$app/paths';

import { getMinMax, type RasterBands, type BandDataRange } from '$routes/map/utils/file/geotiff';

export interface GeoJSONFeature {
	type: 'Feature';
	geometry: any;
	properties: { [key: string]: any };
	id?: string | number;
}

export interface GeoJSONFeatureCollection {
	type: 'FeatureCollection';
	features: GeoJSONFeature[];
}

export interface GpkgReadOptions {
	tableName?: string;
	includeColumns?: string[];
	excludeColumns?: string[];
	maxFeatures?: number;
	boundingBox?: [number, number, number, number];
}

export interface GpkgInfo {
	featureTables: string[];
	tileTables: string[];
	tableInfo: { [tableName: string]: any };
}

// ---- sql.js初期化 ----

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;

const getSql = () => {
	if (!sqlPromise) {
		sqlPromise = initSqlJs({
			locateFile: () => `${base}/sql-wasm.wasm`
		});
	}
	return sqlPromise;
};

const openDb = async (data: Uint8Array): Promise<Database> => {
	const SQL = await getSql();
	return new SQL.Database(data);
};

// ---- GeoPackage Binary → GeoJSON ----

const parseGpkgBinary = (buf: Uint8Array): any | null => {
	if (buf.length < 8) return null;

	// Magic "GP"
	if (buf[0] !== 0x47 || buf[1] !== 0x50) return null;

	const flags = buf[3];
	const littleEndian = (flags & 0x01) === 1;
	const envelopeType = (flags >> 1) & 0x07;

	// Envelope sizes: 0=none, 1=xy(32), 2=xyz(48), 3=xym(48), 4=xyzm(64)
	const envelopeSizes = [0, 32, 48, 48, 64];
	const envelopeSize = envelopeSizes[envelopeType] ?? 0;

	const wkbOffset = 8 + envelopeSize;
	if (wkbOffset >= buf.length) return null;

	const wkb = buf.subarray(wkbOffset);
	return parseWkb(wkb);
};

const parseWkb = (buf: Uint8Array): any | null => {
	if (buf.length < 5) return null;

	const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	const le = buf[0] === 1;
	const wkbType = le ? dv.getUint32(1, true) : dv.getUint32(1, false);

	// 2D type (strip Z/M flags)
	const baseType = wkbType % 1000;
	let offset = 5;

	const readDouble = (): number => {
		const v = le ? dv.getFloat64(offset, true) : dv.getFloat64(offset, false);
		offset += 8;
		return v;
	};

	const readUint32 = (): number => {
		const v = le ? dv.getUint32(offset, true) : dv.getUint32(offset, false);
		offset += 4;
		return v;
	};

	const hasZ = wkbType >= 1000 && wkbType < 2000 || wkbType >= 3000;
	const hasM = wkbType >= 2000 && wkbType < 3000 || wkbType >= 3000;
	const coordSize = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);

	const readCoord = (): [number, number] => {
		const x = readDouble();
		const y = readDouble();
		// Skip Z and/or M if present
		for (let i = 2; i < coordSize; i++) readDouble();
		return [x, y];
	};

	const readLinearRing = (): [number, number][] => {
		const numPoints = readUint32();
		const coords: [number, number][] = [];
		for (let i = 0; i < numPoints; i++) {
			coords.push(readCoord());
		}
		return coords;
	};

	switch (baseType) {
		case 1: // Point
			return { type: 'Point', coordinates: readCoord() };

		case 2: { // LineString
			const numPoints = readUint32();
			const coords: [number, number][] = [];
			for (let i = 0; i < numPoints; i++) coords.push(readCoord());
			return { type: 'LineString', coordinates: coords };
		}

		case 3: { // Polygon
			const numRings = readUint32();
			const rings: [number, number][][] = [];
			for (let i = 0; i < numRings; i++) rings.push(readLinearRing());
			return { type: 'Polygon', coordinates: rings };
		}

		case 4: { // MultiPoint
			const num = readUint32();
			const points: [number, number][] = [];
			for (let i = 0; i < num; i++) {
				const child = parseWkb(buf.subarray(offset));
				if (child) points.push(child.coordinates);
				// Each embedded WKB has its own byte order + type header
				offset += 5 + coordSize * 8;
			}
			return { type: 'MultiPoint', coordinates: points };
		}

		case 5: { // MultiLineString
			const num = readUint32();
			const lines: [number, number][][] = [];
			for (let i = 0; i < num; i++) {
				const child = parseWkb(buf.subarray(offset));
				if (child) lines.push(child.coordinates);
				// Advance offset: need to parse to find actual size
				const childBuf = buf.subarray(offset);
				const childDv = new DataView(childBuf.buffer, childBuf.byteOffset, childBuf.byteLength);
				const childLe = childBuf[0] === 1;
				const nPts = childLe ? childDv.getUint32(5, true) : childDv.getUint32(5, false);
				offset += 5 + 4 + nPts * coordSize * 8;
			}
			return { type: 'MultiLineString', coordinates: lines };
		}

		case 6: { // MultiPolygon
			const num = readUint32();
			const polygons: [number, number][][][] = [];
			for (let i = 0; i < num; i++) {
				const childStart = offset;
				const child = parseWkb(buf.subarray(offset));
				if (child) polygons.push(child.coordinates);
				// Calculate child polygon size
				const childBuf = buf.subarray(childStart);
				const childDv = new DataView(childBuf.buffer, childBuf.byteOffset, childBuf.byteLength);
				const childLe = childBuf[0] === 1;
				let childOffset = 5;
				const nRings = childLe ? childDv.getUint32(childOffset, true) : childDv.getUint32(childOffset, false);
				childOffset += 4;
				for (let r = 0; r < nRings; r++) {
					const nPts = childLe ? childDv.getUint32(childOffset, true) : childDv.getUint32(childOffset, false);
					childOffset += 4 + nPts * coordSize * 8;
				}
				offset = childStart + childOffset;
			}
			return { type: 'MultiPolygon', coordinates: polygons };
		}

		default:
			console.warn(`未対応のWKBタイプ: ${wkbType}`);
			return null;
	}
};

// ---- プロパティフィルタリング ----

const filterProperties = (
	properties: { [key: string]: any },
	options: GpkgReadOptions
): { [key: string]: any } => {
	if (!properties) return {};

	let filtered = { ...properties };

	if (options.includeColumns && options.includeColumns.length > 0) {
		const included: { [key: string]: any } = {};
		for (const col of options.includeColumns) {
			if (col in filtered) included[col] = filtered[col];
		}
		filtered = included;
	}

	if (options.excludeColumns && options.excludeColumns.length > 0) {
		for (const col of options.excludeColumns) {
			delete filtered[col];
		}
	}

	return filtered;
};

// ---- 公開API ----

export const getGpkgInfo = async (filePath: string | Uint8Array): Promise<GpkgInfo> => {
	const data = filePath instanceof Uint8Array ? filePath : new TextEncoder().encode(filePath);
	const db = await openDb(data);

	try {
		const featureTables: string[] = [];
		const tileTables: string[] = [];
		const tableInfo: { [tableName: string]: any } = {};

		// gpkg_contentsからテーブル一覧取得
		const contents = db.exec(
			"SELECT table_name, data_type FROM gpkg_contents"
		);

		if (contents.length > 0) {
			for (const row of contents[0].values) {
				const tableName = row[0] as string;
				const dataType = row[1] as string;

				if (dataType === 'features') {
					featureTables.push(tableName);
				} else if (dataType === 'tiles') {
					tileTables.push(tableName);
				}
			}
		}

		// フィーチャーテーブルの情報取得
		for (const tableName of featureTables) {
			// フィーチャー数
			const countResult = db.exec(`SELECT COUNT(*) FROM "${tableName}"`);
			const count = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

			// 列名
			const pragmaResult = db.exec(`PRAGMA table_info("${tableName}")`);
			const columns = pragmaResult.length > 0
				? pragmaResult[0].values.map((r) => r[1] as string)
				: [];

			// ジオメトリ型とSRS
			const geomResult = db.exec(
				`SELECT geometry_type_name, srs_id FROM gpkg_geometry_columns WHERE table_name = '${tableName}'`
			);
			const geometryType = geomResult.length > 0 ? (geomResult[0].values[0][0] as string) : 'GEOMETRY';
			const srsId = geomResult.length > 0 ? (geomResult[0].values[0][1] as number) : null;

			// gpkg_spatial_ref_sysからEPSGコードとproj4定義を取得
			let epsg: number | null = null;
			let definition: string | null = null;
			if (srsId !== null) {
				const srsResult = db.exec(
					`SELECT organization, organization_coordsys_id, definition FROM gpkg_spatial_ref_sys WHERE srs_id = ${srsId}`
				);
				if (srsResult.length > 0) {
					const org = (srsResult[0].values[0][0] as string ?? '').toUpperCase();
					const orgId = srsResult[0].values[0][1] as number;
					definition = srsResult[0].values[0][2] as string | null;
					if (org === 'EPSG') {
						epsg = orgId;
					}
				}
			}

			tableInfo[tableName] = {
				type: 'feature',
				count,
				columns,
				geometryType,
				srs: {
					srs_id: srsId,
					epsg,
					definition
				}
			};
		}

		// タイルテーブルの情報取得
		for (const tableName of tileTables) {
			const countResult = db.exec(`SELECT COUNT(*) FROM "${tableName}"`);
			const count = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

			let minZoom = 0;
			let maxZoom = 0;
			let tileWidth = 256;
			let tileHeight = 256;
			let matrixWidth = 1;
			let matrixHeight = 1;
			try {
				const zoomResult = db.exec(
					`SELECT MIN(zoom_level), MAX(zoom_level) FROM "${tableName}"`
				);
				if (zoomResult.length > 0) {
					minZoom = (zoomResult[0].values[0][0] as number) ?? 0;
					maxZoom = (zoomResult[0].values[0][1] as number) ?? 0;
				}
				// 最大ズームのマトリクス情報
				const matrixResult = db.exec(
					`SELECT tile_width, tile_height, matrix_width, matrix_height FROM gpkg_tile_matrix WHERE table_name = '${tableName}' AND zoom_level = ${maxZoom}`
				);
				if (matrixResult.length > 0) {
					tileWidth = matrixResult[0].values[0][0] as number;
					tileHeight = matrixResult[0].values[0][1] as number;
					matrixWidth = matrixResult[0].values[0][2] as number;
					matrixHeight = matrixResult[0].values[0][3] as number;
				}
			} catch {
				// skip
			}

			// bounds と SRS
			let bounds: [number, number, number, number] | null = null;
			let tileSrsId: number | null = null;
			let tileEpsg: number | null = null;
			try {
				const setResult = db.exec(
					`SELECT min_x, min_y, max_x, max_y, srs_id FROM gpkg_tile_matrix_set WHERE table_name = '${tableName}'`
				);
				if (setResult.length > 0) {
					bounds = [
						setResult[0].values[0][0] as number,
						setResult[0].values[0][1] as number,
						setResult[0].values[0][2] as number,
						setResult[0].values[0][3] as number
					];
					tileSrsId = setResult[0].values[0][4] as number;
				}
			} catch {
				// skip
			}

			if (tileSrsId !== null) {
				try {
					const srsResult = db.exec(
						`SELECT organization, organization_coordsys_id FROM gpkg_spatial_ref_sys WHERE srs_id = ${tileSrsId}`
					);
					if (srsResult.length > 0) {
						const org = ((srsResult[0].values[0][0] as string) ?? '').toUpperCase();
						if (org === 'EPSG') {
							tileEpsg = srsResult[0].values[0][1] as number;
						}
					}
				} catch {
					// skip
				}
			}

			// GriddedCoverage拡張の検出
			let isGriddedCoverage = false;
			try {
				const gcResult = db.exec(
					`SELECT COUNT(*) FROM gpkg_2d_gridded_coverage_ancillary WHERE tile_matrix_set_name = '${tableName}'`
				);
				isGriddedCoverage = gcResult.length > 0 && (gcResult[0].values[0][0] as number) > 0;
			} catch {
				// テーブルが存在しない場合
			}

			tableInfo[tableName] = {
				type: 'tile',
				count,
				minZoom,
				maxZoom,
				tileWidth,
				tileHeight,
				matrixWidth,
				matrixHeight,
				bounds,
				isGriddedCoverage,
				srs: {
					srs_id: tileSrsId,
					epsg: tileEpsg
				}
			};
		}

		return { featureTables, tileTables, tableInfo };
	} finally {
		db.close();
	}
};

export const gpkgToGeoJson = async (
	filePath: string | Uint8Array,
	options: GpkgReadOptions = {}
): Promise<GeoJSONFeatureCollection> => {
	const data = filePath instanceof Uint8Array ? filePath : new TextEncoder().encode(filePath);
	const db = await openDb(data);

	try {
		// テーブル名の決定
		let tables: string[];
		if (options.tableName) {
			tables = [options.tableName];
		} else {
			const contents = db.exec(
				"SELECT table_name FROM gpkg_contents WHERE data_type = 'features'"
			);
			tables = contents.length > 0
				? contents[0].values.map((r) => r[0] as string)
				: [];
		}

		const allFeatures: GeoJSONFeature[] = [];

		for (const tableName of tables) {
			// ジオメトリ列名を取得
			const geomColResult = db.exec(
				`SELECT column_name FROM gpkg_geometry_columns WHERE table_name = '${tableName}'`
			);
			const geomColumn = geomColResult.length > 0
				? (geomColResult[0].values[0][0] as string)
				: 'geom';

			// クエリ構築
			let sql = `SELECT * FROM "${tableName}"`;
			if (options.maxFeatures) {
				sql += ` LIMIT ${options.maxFeatures}`;
			}

			const result = db.exec(sql);
			if (result.length === 0) continue;

			const columnNames = result[0].columns;
			const geomIndex = columnNames.indexOf(geomColumn);

			for (const row of result[0].values) {
				try {
					// ジオメトリ解析
					const geomValue = row[geomIndex];
					if (!geomValue) continue;

					const geomBuf = geomValue instanceof Uint8Array
						? geomValue
						: new Uint8Array(geomValue as unknown as ArrayBuffer);

					const geometry = parseGpkgBinary(geomBuf);
					if (!geometry) continue;

					// プロパティ構築
					const properties: { [key: string]: any } = {};
					for (let i = 0; i < columnNames.length; i++) {
						if (i !== geomIndex) {
							properties[columnNames[i]] = row[i];
						}
					}

					const filteredProperties = filterProperties(properties, options);

					allFeatures.push({
						type: 'Feature',
						geometry,
						properties: filteredProperties
					});

					if (options.maxFeatures && allFeatures.length >= options.maxFeatures) break;
				} catch (e) {
					console.warn('フィーチャー変換エラー:', e);
				}
			}

			if (options.maxFeatures && allFeatures.length >= options.maxFeatures) break;
		}

		return {
			type: 'FeatureCollection',
			features: allFeatures
		};
	} finally {
		db.close();
	}
};

// ---- ラスタータイル読み込み ----

export interface GpkgRasterResult {
	bands: RasterBands;
	width: number;
	height: number;
	bounds: [number, number, number, number];
	epsg: number | null;
	nodata: number | null;
	dataRanges: BandDataRange[];
}

/**
 * GeoPackageタイルテーブルからラスターデータを抽出
 * 最大ズームの全タイルを結合して1枚の画像にする
 */
export const gpkgToRaster = async (
	filePath: string | Uint8Array,
	tableName: string
): Promise<GpkgRasterResult> => {
	const data = filePath instanceof Uint8Array ? filePath : new TextEncoder().encode(filePath);
	const db = await openDb(data);

	try {
		// マトリクス情報取得
		const maxZoomResult = db.exec(
			`SELECT MAX(zoom_level) FROM "${tableName}"`
		);
		const maxZoom = maxZoomResult.length > 0 ? (maxZoomResult[0].values[0][0] as number) : 0;

		const matrixResult = db.exec(
			`SELECT tile_width, tile_height, matrix_width, matrix_height FROM gpkg_tile_matrix WHERE table_name = '${tableName}' AND zoom_level = ${maxZoom}`
		);
		if (matrixResult.length === 0) throw new Error('タイルマトリクス情報が見つかりません');

		const tileW = matrixResult[0].values[0][0] as number;
		const tileH = matrixResult[0].values[0][1] as number;

		// bounds取得
		const setResult = db.exec(
			`SELECT min_x, min_y, max_x, max_y, srs_id FROM gpkg_tile_matrix_set WHERE table_name = '${tableName}'`
		);
		if (setResult.length === 0) throw new Error('タイルマトリクスセット情報が見つかりません');

		const bounds: [number, number, number, number] = [
			setResult[0].values[0][0] as number,
			setResult[0].values[0][1] as number,
			setResult[0].values[0][2] as number,
			setResult[0].values[0][3] as number
		];
		const srsId = setResult[0].values[0][4] as number;

		// EPSG取得
		let epsg: number | null = null;
		try {
			const srsResult = db.exec(
				`SELECT organization, organization_coordsys_id FROM gpkg_spatial_ref_sys WHERE srs_id = ${srsId}`
			);
			if (srsResult.length > 0) {
				const org = ((srsResult[0].values[0][0] as string) ?? '').toUpperCase();
				if (org === 'EPSG') epsg = srsResult[0].values[0][1] as number;
			}
		} catch {
			// skip
		}

		// GriddedCoverage検出
		let isGridded = false;
		let gcScale = 1;
		let gcOffset = 0;
		let gcNodata: number | null = null;
		try {
			const gcResult = db.exec(
				`SELECT datatype, scale, "offset", data_null FROM gpkg_2d_gridded_coverage_ancillary WHERE tile_matrix_set_name = '${tableName}'`
			);
			if (gcResult.length > 0 && gcResult[0].values.length > 0) {
				isGridded = true;
				gcScale = (gcResult[0].values[0][1] as number) ?? 1;
				gcOffset = (gcResult[0].values[0][2] as number) ?? 0;
				gcNodata = gcResult[0].values[0][3] as number | null;
			}
		} catch {
			// テーブルなし
		}

		// タイルデータ取得（最大ズーム）
		const tilesResult = db.exec(
			`SELECT tile_column, tile_row, tile_data FROM "${tableName}" WHERE zoom_level = ${maxZoom}`
		);
		if (tilesResult.length === 0 || tilesResult[0].values.length === 0) {
			throw new Error('タイルデータが見つかりません');
		}

		// タイルの範囲を計算
		const tiles = tilesResult[0].values;
		let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
		for (const tile of tiles) {
			const col = tile[0] as number;
			const row = tile[1] as number;
			minCol = Math.min(minCol, col);
			maxCol = Math.max(maxCol, col);
			minRow = Math.min(minRow, row);
			maxRow = Math.max(maxRow, row);
		}

		const colCount = maxCol - minCol + 1;
		const rowCount = maxRow - minRow + 1;
		const totalWidth = colCount * tileW;
		const totalHeight = rowCount * tileH;

		if (isGridded) {
			// GriddedCoverage: TIFFタイルをfloat値として結合
			const band = new Float32Array(totalWidth * totalHeight);
			band.fill(gcNodata ?? NaN);

			for (const tile of tiles) {
				const col = (tile[0] as number) - minCol;
				const row = (tile[1] as number) - minRow;
				const tileData = tile[2] as Uint8Array;

				try {
					const ab = new ArrayBuffer(tileData.byteLength);
					new Uint8Array(ab).set(tileData);
					const tiff = await fromArrayBuffer(ab);
					const image = await tiff.getImage();
					const rasters = await image.readRasters({ interleave: true });
					const pixels = rasters as unknown as Float32Array | Uint16Array;

					for (let y = 0; y < tileH; y++) {
						for (let x = 0; x < tileW; x++) {
							const srcIdx = y * tileW + x;
							const dstX = col * tileW + x;
							const dstY = row * tileH + y;
							const dstIdx = dstY * totalWidth + dstX;
							const raw = pixels[srcIdx];
							band[dstIdx] = raw * gcScale + gcOffset;
						}
					}
				} catch (e) {
					console.warn(`タイル(${col},${row})のTIFFデコードに失敗:`, e);
				}
			}

			const range = getMinMax(band, gcNodata);
			return {
				bands: [band],
				width: totalWidth,
				height: totalHeight,
				bounds,
				epsg,
				nodata: gcNodata,
				dataRanges: [range]
			};
		} else {
			// 通常タイル (PNG/JPEG): Canvas結合 → RGBバンド
			const canvas = new OffscreenCanvas(totalWidth, totalHeight);
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Canvas context取得失敗');

			for (const tile of tiles) {
				const col = (tile[0] as number) - minCol;
				const row = (tile[1] as number) - minRow;
				const tileData = tile[2] as Uint8Array;

				try {
					const ab = new ArrayBuffer(tileData.byteLength);
					new Uint8Array(ab).set(tileData);
					const blob = new Blob([ab]);
					const bitmap = await createImageBitmap(blob);
					ctx.drawImage(bitmap, col * tileW, row * tileH);
					bitmap.close();
				} catch (e) {
					console.warn(`タイル(${col},${row})のデコードに失敗:`, e);
				}
			}

			const imgData = ctx.getImageData(0, 0, totalWidth, totalHeight);
			const rgba = imgData.data;
			const pixelCount = totalWidth * totalHeight;

			const rBand = new Uint8Array(pixelCount);
			const gBand = new Uint8Array(pixelCount);
			const bBand = new Uint8Array(pixelCount);
			for (let i = 0; i < pixelCount; i++) {
				rBand[i] = rgba[i * 4];
				gBand[i] = rgba[i * 4 + 1];
				bBand[i] = rgba[i * 4 + 2];
			}

			const bands: RasterBands = [rBand, gBand, bBand];
			const ranges: BandDataRange[] = bands.map((b) => getMinMax(b, null));

			return {
				bands,
				width: totalWidth,
				height: totalHeight,
				bounds,
				epsg,
				nodata: null,
				dataRanges: ranges
			};
		}
	} finally {
		db.close();
	}
};
