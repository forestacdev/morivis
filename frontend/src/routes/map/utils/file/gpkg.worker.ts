import { fromArrayBuffer } from 'geotiff';
import initSqlJs, { type Database } from 'sql.js';

// ---- 型定義 ----

interface WorkerRequest {
	id: number;
	type: 'open' | 'close' | 'getInfo' | 'toGeoJson' | 'toRaster';
	data?: Uint8Array;
	options?: any;
	tableName?: string;
	wasmUrl?: string;
}

interface WorkerResponse {
	id: number;
	result?: any;
	error?: string;
	transfer?: ArrayBuffer[];
}

// ---- sql.js初期化 ----

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;

const getSql = (wasmUrl: string) => {
	if (!sqlPromise) {
		sqlPromise = initSqlJs({ locateFile: () => wasmUrl });
	}
	return sqlPromise;
};

const openDb = async (data: Uint8Array, wasmUrl: string): Promise<Database> => {
	const SQL = await getSql(wasmUrl);
	return new SQL.Database(data);
};

// ---- GeoPackage Binary → GeoJSON ----

const parseGpkgBinary = (buf: Uint8Array): any | null => {
	if (buf.length < 8) return null;
	if (buf[0] !== 0x47 || buf[1] !== 0x50) return null;

	const flags = buf[3];
	const envelopeType = (flags >> 1) & 0x07;
	const envelopeSizes = [0, 32, 48, 48, 64];
	const envelopeSize = envelopeSizes[envelopeType] ?? 0;

	const wkbOffset = 8 + envelopeSize;
	if (wkbOffset >= buf.length) return null;

	return parseWkb(buf.subarray(wkbOffset));
};

const parseWkb = (buf: Uint8Array): any | null => {
	if (buf.length < 5) return null;

	const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	const le = buf[0] === 1;
	const wkbType = le ? dv.getUint32(1, true) : dv.getUint32(1, false);
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

	const hasZ = (wkbType >= 1000 && wkbType < 2000) || wkbType >= 3000;
	const hasM = (wkbType >= 2000 && wkbType < 3000) || wkbType >= 3000;
	const coordSize = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);

	const readCoord = (): [number, number] => {
		const x = readDouble();
		const y = readDouble();
		for (let i = 2; i < coordSize; i++) readDouble();
		return [x, y];
	};

	const readLinearRing = (): [number, number][] => {
		const n = readUint32();
		const coords: [number, number][] = [];
		for (let i = 0; i < n; i++) coords.push(readCoord());
		return coords;
	};

	switch (baseType) {
		case 1:
			return { type: 'Point', coordinates: readCoord() };
		case 2: {
			const n = readUint32();
			const c: [number, number][] = [];
			for (let i = 0; i < n; i++) c.push(readCoord());
			return { type: 'LineString', coordinates: c };
		}
		case 3: {
			const n = readUint32();
			const rings: [number, number][][] = [];
			for (let i = 0; i < n; i++) rings.push(readLinearRing());
			return { type: 'Polygon', coordinates: rings };
		}
		case 4: {
			const n = readUint32();
			const pts: [number, number][] = [];
			for (let i = 0; i < n; i++) {
				const child = parseWkb(buf.subarray(offset));
				if (child) pts.push(child.coordinates);
				offset += 5 + coordSize * 8;
			}
			return { type: 'MultiPoint', coordinates: pts };
		}
		case 5: {
			const n = readUint32();
			const lines: [number, number][][] = [];
			for (let i = 0; i < n; i++) {
				const child = parseWkb(buf.subarray(offset));
				if (child) lines.push(child.coordinates);
				const cb = buf.subarray(offset);
				const cdv = new DataView(cb.buffer, cb.byteOffset, cb.byteLength);
				const cle = cb[0] === 1;
				const nPts = cle ? cdv.getUint32(5, true) : cdv.getUint32(5, false);
				offset += 5 + 4 + nPts * coordSize * 8;
			}
			return { type: 'MultiLineString', coordinates: lines };
		}
		case 6: {
			const n = readUint32();
			const polys: [number, number][][][] = [];
			for (let i = 0; i < n; i++) {
				const start = offset;
				const child = parseWkb(buf.subarray(offset));
				if (child) polys.push(child.coordinates);
				const cb = buf.subarray(start);
				const cdv = new DataView(cb.buffer, cb.byteOffset, cb.byteLength);
				const cle = cb[0] === 1;
				let co = 5;
				const nRings = cle ? cdv.getUint32(co, true) : cdv.getUint32(co, false);
				co += 4;
				for (let r = 0; r < nRings; r++) {
					const nPts = cle ? cdv.getUint32(co, true) : cdv.getUint32(co, false);
					co += 4 + nPts * coordSize * 8;
				}
				offset = start + co;
			}
			return { type: 'MultiPolygon', coordinates: polys };
		}
		default:
			return null;
	}
};

// ---- プロパティフィルタリング ----

const filterProperties = (props: Record<string, any>, options: any): Record<string, any> => {
	if (!props) return {};
	let f = { ...props };
	if (options.includeColumns?.length > 0) {
		const inc: Record<string, any> = {};
		for (const c of options.includeColumns) {
			if (c in f) inc[c] = f[c];
		}
		f = inc;
	}
	if (options.excludeColumns?.length > 0) {
		for (const c of options.excludeColumns) delete f[c];
	}
	return f;
};

// ---- SRS ヘルパー ----

const lookupEpsg = (db: Database, srsId: number): { epsg: number | null; definition: string | null } => {
	try {
		const r = db.exec(
			`SELECT organization, organization_coordsys_id, definition FROM gpkg_spatial_ref_sys WHERE srs_id = ${srsId}`
		);
		if (r.length > 0) {
			const org = ((r[0].values[0][0] as string) ?? '').toUpperCase();
			const orgId = r[0].values[0][1] as number;
			const def = r[0].values[0][2] as string | null;
			return { epsg: org === 'EPSG' ? orgId : null, definition: def };
		}
	} catch {
		// skip
	}
	return { epsg: null, definition: null };
};

// ---- getInfo ----

const handleGetInfo = (db: Database) => {
	const featureTables: string[] = [];
	const tileTables: string[] = [];
	const tableInfo: Record<string, any> = {};

	const contents = db.exec("SELECT table_name, data_type FROM gpkg_contents");
	if (contents.length > 0) {
		for (const row of contents[0].values) {
			const name = row[0] as string;
			const type = row[1] as string;
			if (type === 'features') featureTables.push(name);
			else if (type === 'tiles') tileTables.push(name);
		}
	}

	for (const t of featureTables) {
		const countR = db.exec(`SELECT COUNT(*) FROM "${t}"`);
		const count = countR.length > 0 ? (countR[0].values[0][0] as number) : 0;
		const pragmaR = db.exec(`PRAGMA table_info("${t}")`);
		const columns = pragmaR.length > 0 ? pragmaR[0].values.map((r) => r[1] as string) : [];
		const geomR = db.exec(`SELECT geometry_type_name, srs_id FROM gpkg_geometry_columns WHERE table_name = '${t}'`);
		const geometryType = geomR.length > 0 ? (geomR[0].values[0][0] as string) : 'GEOMETRY';
		const srsId = geomR.length > 0 ? (geomR[0].values[0][1] as number) : null;
		const srs = srsId !== null ? { srs_id: srsId, ...lookupEpsg(db, srsId) } : { srs_id: null, epsg: null, definition: null };
		tableInfo[t] = { type: 'feature', count, columns, geometryType, srs };
	}

	for (const t of tileTables) {
		const countR = db.exec(`SELECT COUNT(*) FROM "${t}"`);
		const count = countR.length > 0 ? (countR[0].values[0][0] as number) : 0;
		let minZoom = 0, maxZoom = 0, tileWidth = 256, tileHeight = 256, matrixWidth = 1, matrixHeight = 1;
		try {
			const zr = db.exec(`SELECT MIN(zoom_level), MAX(zoom_level) FROM "${t}"`);
			if (zr.length > 0) { minZoom = (zr[0].values[0][0] as number) ?? 0; maxZoom = (zr[0].values[0][1] as number) ?? 0; }
			const mr = db.exec(`SELECT tile_width, tile_height, matrix_width, matrix_height FROM gpkg_tile_matrix WHERE table_name = '${t}' AND zoom_level = ${maxZoom}`);
			if (mr.length > 0) { tileWidth = mr[0].values[0][0] as number; tileHeight = mr[0].values[0][1] as number; matrixWidth = mr[0].values[0][2] as number; matrixHeight = mr[0].values[0][3] as number; }
		} catch { /* skip */ }

		let bounds: [number, number, number, number] | null = null;
		let tileSrsId: number | null = null;
		try {
			const sr = db.exec(`SELECT min_x, min_y, max_x, max_y, srs_id FROM gpkg_tile_matrix_set WHERE table_name = '${t}'`);
			if (sr.length > 0) { bounds = [sr[0].values[0][0] as number, sr[0].values[0][1] as number, sr[0].values[0][2] as number, sr[0].values[0][3] as number]; tileSrsId = sr[0].values[0][4] as number; }
		} catch { /* skip */ }

		const tileEpsg = tileSrsId !== null ? lookupEpsg(db, tileSrsId).epsg : null;

		let isGriddedCoverage = false;
		try {
			const gc = db.exec(`SELECT COUNT(*) FROM gpkg_2d_gridded_coverage_ancillary WHERE tile_matrix_set_name = '${t}'`);
			isGriddedCoverage = gc.length > 0 && (gc[0].values[0][0] as number) > 0;
		} catch { /* skip */ }

		tableInfo[t] = { type: 'tile', count, minZoom, maxZoom, tileWidth, tileHeight, matrixWidth, matrixHeight, bounds, isGriddedCoverage, srs: { srs_id: tileSrsId, epsg: tileEpsg } };
	}

	return { featureTables, tileTables, tableInfo };
};

// ---- toGeoJson ----

const handleToGeoJson = (db: Database, options: any) => {
	let tables: string[];
	if (options.tableName) {
		tables = [options.tableName];
	} else {
		const c = db.exec("SELECT table_name FROM gpkg_contents WHERE data_type = 'features'");
		tables = c.length > 0 ? c[0].values.map((r) => r[0] as string) : [];
	}

	const features: any[] = [];

	for (const t of tables) {
		const gcr = db.exec(`SELECT column_name FROM gpkg_geometry_columns WHERE table_name = '${t}'`);
		const geomCol = gcr.length > 0 ? (gcr[0].values[0][0] as string) : 'geom';
		let sql = `SELECT * FROM "${t}"`;
		if (options.maxFeatures) sql += ` LIMIT ${options.maxFeatures}`;

		const result = db.exec(sql);
		if (result.length === 0) continue;

		const cols = result[0].columns;
		const gi = cols.indexOf(geomCol);

		for (const row of result[0].values) {
			try {
				const gv = row[gi];
				if (!gv) continue;
				const gb = gv instanceof Uint8Array ? gv : new Uint8Array(gv as unknown as ArrayBuffer);
				const geometry = parseGpkgBinary(gb);
				if (!geometry) continue;

				const props: Record<string, any> = {};
				for (let i = 0; i < cols.length; i++) {
					if (i !== gi) props[cols[i]] = row[i];
				}

				features.push({ type: 'Feature', geometry, properties: filterProperties(props, options) });
				if (options.maxFeatures && features.length >= options.maxFeatures) break;
			} catch {
				// skip
			}
		}
		if (options.maxFeatures && features.length >= options.maxFeatures) break;
	}

	return { type: 'FeatureCollection', features };
};

// ---- toRaster ----

const getMinMax = (band: ArrayLike<number>, nodata: number | null): { min: number; max: number } => {
	let min = Infinity;
	let max = -Infinity;
	for (let i = 0; i < band.length; i++) {
		const v = band[i];
		if (nodata !== null && v === nodata) continue;
		if (!Number.isFinite(v)) continue;
		if (v < min) min = v;
		if (v > max) max = v;
	}
	if (min === Infinity) { min = 0; max = 1; }
	return { min, max };
};

const handleToRaster = async (db: Database, tableName: string) => {
	const maxZR = db.exec(`SELECT MAX(zoom_level) FROM "${tableName}"`);
	const maxZoom = maxZR.length > 0 ? (maxZR[0].values[0][0] as number) : 0;

	const matR = db.exec(`SELECT tile_width, tile_height FROM gpkg_tile_matrix WHERE table_name = '${tableName}' AND zoom_level = ${maxZoom}`);
	if (matR.length === 0) throw new Error('タイルマトリクス情報が見つかりません');
	const tileW = matR[0].values[0][0] as number;
	const tileH = matR[0].values[0][1] as number;

	const setR = db.exec(`SELECT min_x, min_y, max_x, max_y, srs_id FROM gpkg_tile_matrix_set WHERE table_name = '${tableName}'`);
	if (setR.length === 0) throw new Error('タイルマトリクスセット情報が見つかりません');
	const bounds: [number, number, number, number] = [setR[0].values[0][0] as number, setR[0].values[0][1] as number, setR[0].values[0][2] as number, setR[0].values[0][3] as number];
	const srsId = setR[0].values[0][4] as number;

	let epsg: number | null = null;
	try {
		const sr = db.exec(`SELECT organization, organization_coordsys_id FROM gpkg_spatial_ref_sys WHERE srs_id = ${srsId}`);
		if (sr.length > 0) { const org = ((sr[0].values[0][0] as string) ?? '').toUpperCase(); if (org === 'EPSG') epsg = sr[0].values[0][1] as number; }
	} catch { /* skip */ }

	let isGridded = false, gcScale = 1, gcOffset = 0, gcNodata: number | null = null;
	try {
		const gc = db.exec(`SELECT datatype, scale, "offset", data_null FROM gpkg_2d_gridded_coverage_ancillary WHERE tile_matrix_set_name = '${tableName}'`);
		if (gc.length > 0 && gc[0].values.length > 0) { isGridded = true; gcScale = (gc[0].values[0][1] as number) ?? 1; gcOffset = (gc[0].values[0][2] as number) ?? 0; gcNodata = gc[0].values[0][3] as number | null; }
	} catch { /* skip */ }

	const tilesR = db.exec(`SELECT tile_column, tile_row, tile_data FROM "${tableName}" WHERE zoom_level = ${maxZoom}`);
	if (tilesR.length === 0 || tilesR[0].values.length === 0) throw new Error('タイルデータが見つかりません');

	const tiles = tilesR[0].values;
	let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
	for (const t of tiles) {
		const c = t[0] as number, r = t[1] as number;
		minCol = Math.min(minCol, c); maxCol = Math.max(maxCol, c);
		minRow = Math.min(minRow, r); maxRow = Math.max(maxRow, r);
	}

	const colCount = maxCol - minCol + 1;
	const rowCount = maxRow - minRow + 1;
	const totalW = colCount * tileW;
	const totalH = rowCount * tileH;

	// Transferableなバンドデータを構築
	const transferBuffers: ArrayBuffer[] = [];

	if (isGridded) {
		const band = new Float32Array(totalW * totalH);
		band.fill(gcNodata ?? NaN);

		for (const tile of tiles) {
			const col = (tile[0] as number) - minCol;
			const row = (tile[1] as number) - minRow;
			const td = tile[2] as Uint8Array;
			try {
				const ab = new ArrayBuffer(td.byteLength);
				new Uint8Array(ab).set(td);
				const tiff = await fromArrayBuffer(ab);
				const img = await tiff.getImage();
				const rasters = await img.readRasters({ interleave: true });
				const px = rasters as unknown as Float32Array | Uint16Array;
				for (let y = 0; y < tileH; y++) {
					for (let x = 0; x < tileW; x++) {
						const si = y * tileW + x;
						const di = (row * tileH + y) * totalW + (col * tileW + x);
						band[di] = px[si] * gcScale + gcOffset;
					}
				}
			} catch { /* skip */ }
		}

		const range = getMinMax(band, gcNodata);
		transferBuffers.push(band.buffer as ArrayBuffer);
		return {
			result: { numBands: 1, width: totalW, height: totalH, bounds, epsg, nodata: gcNodata, dataRanges: [range], bandBuffers: [band.buffer] },
			transfer: transferBuffers
		};
	} else {
		const canvas = new OffscreenCanvas(totalW, totalH);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas context取得失敗');

		for (const tile of tiles) {
			const col = (tile[0] as number) - minCol;
			const row = (tile[1] as number) - minRow;
			const td = tile[2] as Uint8Array;
			try {
				const ab = new ArrayBuffer(td.byteLength);
				new Uint8Array(ab).set(td);
				const bitmap = await createImageBitmap(new Blob([ab]));
				ctx.drawImage(bitmap, col * tileW, row * tileH);
				bitmap.close();
			} catch { /* skip */ }
		}

		const imgData = ctx.getImageData(0, 0, totalW, totalH);
		const rgba = imgData.data;
		const px = totalW * totalH;
		const rB = new Uint8Array(px);
		const gB = new Uint8Array(px);
		const bB = new Uint8Array(px);
		for (let i = 0; i < px; i++) {
			rB[i] = rgba[i * 4];
			gB[i] = rgba[i * 4 + 1];
			bB[i] = rgba[i * 4 + 2];
		}

		const ranges = [getMinMax(rB, null), getMinMax(gB, null), getMinMax(bB, null)];
		transferBuffers.push(rB.buffer as ArrayBuffer, gB.buffer as ArrayBuffer, bB.buffer as ArrayBuffer);
		return {
			result: { numBands: 3, width: totalW, height: totalH, bounds, epsg, nodata: null, dataRanges: ranges, bandBuffers: [rB.buffer, gB.buffer, bB.buffer] },
			transfer: transferBuffers
		};
	}
};

// ---- メッセージハンドラー ----

// DBを保持（openで開き、closeで解放）
let currentDb: Database | null = null;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
	const { id, type, data, options, tableName, wasmUrl } = e.data;

	try {
		switch (type) {
			case 'open': {
				currentDb?.close();
				currentDb = await openDb(data!, wasmUrl!);
				self.postMessage({ id, result: true } as WorkerResponse);
				break;
			}
			case 'close': {
				currentDb?.close();
				currentDb = null;
				self.postMessage({ id, result: true } as WorkerResponse);
				break;
			}
			case 'getInfo': {
				if (!currentDb) throw new Error('DBが開かれていません');
				const result = handleGetInfo(currentDb);
				self.postMessage({ id, result } as WorkerResponse);
				break;
			}
			case 'toGeoJson': {
				if (!currentDb) throw new Error('DBが開かれていません');
				const result = handleToGeoJson(currentDb, options ?? {});
				self.postMessage({ id, result } as WorkerResponse);
				break;
			}
			case 'toRaster': {
				if (!currentDb) throw new Error('DBが開かれていません');
				const { result, transfer } = await handleToRaster(currentDb, tableName!);
				self.postMessage({ id, result } as WorkerResponse, { transfer: transfer as Transferable[] });
				break;
			}
		}
	} catch (err) {
		self.postMessage({ id, error: err instanceof Error ? err.message : String(err) } as WorkerResponse);
	}
};
