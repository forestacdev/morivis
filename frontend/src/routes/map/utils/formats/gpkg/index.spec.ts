import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import initSqlJs, { type Database } from 'sql.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const wasmPath = resolve(import.meta.dirname, '../../../../../../static/sql-wasm.wasm');

vi.mock('$routes/map/utils/platform/asset-path', () => ({
	resolveStaticAssetPath: (path: string) => {
		if (path === '/sql-wasm.wasm') {
			return `file://${wasmPath}`;
		}
		return path;
	}
}));

import { closeGpkg, getGpkgInfo, gpkgToGeoJson, openGpkg } from '.';

const gpkgBytes = readFileSync(
	resolve(import.meta.dirname, '__fixtures__', 'sample-point', 'sample-point.gpkg')
);

const parsePointGeometry = (blob: Uint8Array) => {
	const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
	const x = view.getFloat64(13, true);
	const y = view.getFloat64(21, true);
	return {
		type: 'Point',
		coordinates: [x, y]
	};
};

class MockGpkgWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	private db: Database | null = null;
	private sqlPromise: ReturnType<typeof initSqlJs> | null = null;

	private async getSql(wasmUrl: string) {
		if (!this.sqlPromise) {
			this.sqlPromise = initSqlJs({
				locateFile: () => wasmUrl.replace(/^file:\/\//, '')
			});
		}
		return this.sqlPromise;
	}

	private emit(result: Record<string, unknown>) {
		this.onmessage?.({ data: result } as MessageEvent);
	}

	private handleGetInfo() {
		if (!this.db) throw new Error('DB not open');
		const info = {
			featureTables: ['points'],
			tileTables: [],
			tableInfo: {
				points: {
					type: 'feature',
					count: 1,
					columns: ['id', 'geom', 'name'],
					geometryType: 'POINT',
					srs: {
						srs_id: 4326,
						epsg: 4326,
						definition:
							'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'
					}
				}
			}
		};
		return info;
	}

	private handleToGeoJson(tableName: string) {
		if (!this.db) throw new Error('DB not open');
		const result = this.db.exec(`SELECT id, geom, name FROM "${tableName}"`);
		const features = result[0]?.values.map((row) => ({
			type: 'Feature',
			id: row[0] as number,
			geometry: parsePointGeometry(row[1] as Uint8Array),
			properties: {
				name: row[2] as string
			}
		})) ?? [];
		return {
			type: 'FeatureCollection',
			features
		};
	}

	postMessage(message: Record<string, unknown>) {
		(async () => {
			try {
				const id = message.id as number;
				const type = message.type as string;
				if (type === 'open') {
					const SQL = await this.getSql(String(message.wasmUrl));
					this.db = new SQL.Database(message.data as Uint8Array);
					this.emit({ id, result: true });
					return;
				}
				if (type === 'getInfo') {
					this.emit({ id, result: this.handleGetInfo() });
					return;
				}
				if (type === 'toGeoJson') {
					const options = (message.options ?? {}) as { tableName?: string; };
					this.emit({
						id,
						result: this.handleToGeoJson(options.tableName ?? 'points')
					});
					return;
				}
				if (type === 'query') {
					if (!this.db) throw new Error('DB not open');
					const rows = this.db.exec(String(message.sql));
					this.emit({
						id,
						result: {
							columns: rows[0]?.columns ?? [],
							values: rows[0]?.values ?? []
						}
					});
					return;
				}
				this.emit({ id, error: `Unsupported command: ${type}` });
			} catch (error) {
				this.emit({
					id: message.id as number,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		})().catch((error) => {
			this.onerror?.(
				{ message: error instanceof Error ? error.message : String(error) } as ErrorEvent
			);
		});
	}

	terminate() {
		this.db?.close();
		this.db = null;
	}
}

beforeEach(() => {
	vi.stubGlobal('Worker', MockGpkgWorker as unknown as typeof Worker);
});

afterEach(() => {
	closeGpkg();
	vi.unstubAllGlobals();
});

describe('gpkg parser', () => {
	it('GeoPackage fixture から情報を取得できる', async () => {
		const info = await getGpkgInfo(new Uint8Array(gpkgBytes));

		expect(info.featureTables).toEqual(['points']);
		expect(info.tileTables).toEqual([]);
		expect(info.tableInfo.points.geometryType).toBe('POINT');
		expect(info.tableInfo.points.srs.epsg).toBe(4326);
	});

	it('GeoPackage fixture を GeoJSON に変換できる', async () => {
		await openGpkg(new Uint8Array(gpkgBytes));
		const geojson = await gpkgToGeoJson(new Uint8Array(), { tableName: 'points' });

		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.geometry.type).toBe('Point');
		expect(geojson.features[0]?.geometry.coordinates).toEqual([139.6917, 35.6895]);
		expect(geojson.features[0]?.properties?.name).toBe('Sample Point');
	});
});
