import type initGdalJs from 'gdal3.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { parseDgn } from '.';
import { convertDgn } from './convert';
import { formatDgn } from './definition';
import { checkDgnSize, validateDgnBytes } from './files';

const require = createRequire(import.meta.url);
const fixture = (name = 'test-2d.dgn') => new URL(`./__fixtures__/${name}`, import.meta.url);
const source = JSON.parse(readFileSync(fixture('test-source.geojson'), 'utf8'));
let gdal: Awaited<ReturnType<typeof initGdalJs>>;
beforeAll(async () => {
	const fetch = globalThis.fetch;
	vi.stubGlobal('fetch', undefined);
	try {
		gdal = await require('gdal3.js/node')({
			path: 'node_modules/gdal3.js/dist/package',
			dest: '.svelte-kit/dgn-tests',
			useWorker: false,
			env: { PROJ_NETWORK: 'OFF' },
			logHandler: () => {}
		});
	} finally {
		vi.stubGlobal('fetch', fetch);
	}
});
const oracle = async (name: string) => {
	const { datasets } = await gdal.open(fileURLToPath(fixture(name)));
	try {
		const out = await gdal.ogr2ogr(datasets[0], ['-f', 'GeoJSON', '-dim', 'XY'], 'test-oracle');
		return JSON.parse(new TextDecoder().decode(await gdal.getFileBytes(out)));
	} finally {
		for (const dataset of datasets) await gdal.close(dataset);
	}
};

describe('DGN V7 TypeScriptパーサー', () => {
	it('円弧・曲線・座標補正・複合線・複合面をGDALと比較する', async () => {
		const result = parseDgn(readFileSync(fixture('test-curves.dgn')));
		const reference = await oracle('test-curves.dgn');
		expect(result.geojson.features).toHaveLength(7);
		expect(reference.features).toHaveLength(7);
		const compare = (a: unknown, b: unknown): void => {
			if (typeof a === 'number') {
				expect(a).toBeCloseTo(b as number, 8);
				return;
			}
			expect(Array.isArray(a) && Array.isArray(b)).toBe(true);
			expect((a as unknown[]).length).toBe((b as unknown[]).length);
			(a as unknown[]).forEach((v, i) => compare(v, (b as unknown[])[i]));
		};
		result.geojson.features.forEach((feature, i) => {
			expect(feature.geometry.type).toBe(reference.features[i].geometry.type);
			compare(feature.geometry.coordinates, reference.features[i].geometry.coordinates);
		});
	});
	it.each(['test-2d.dgn', 'test-3d.dgn'])(
		'%sの線・面・文字をGDALと同じ座標で読む',
		async name => {
			const result = parseDgn(readFileSync(fixture(name)));
			const reference = await oracle(name);
			expect(result.geojson.features.map(f => f.geometry)).toEqual(
				reference.features.map((f: { geometry: unknown; }) => f.geometry)
			);
			expect(result.spatialStatus).toBe('crs-missing');
			expect(result.metadata.masterUnit).toBe('m');
			expect(result.metadata.dimension).toBe(name.includes('3d') ? 3 : 2);
			expect(result.geojson.features.map(f => f.properties.layer)).toEqual(['1', '2', '3']);
			expect(result.geojson.features.map(f => f.properties.color)).toEqual([
				'#ff0000',
				'#ffff00',
				'#ff00ff'
			]);
			expect(result.geojson.features[0].properties.Text).toBe('test-label');
			expect(result.geojson.features[1].properties.Weight).toBe(2);
			expect(result.geojson.features).toHaveLength(source.features.length);
		}
	);
	it('経緯度内の数値でもCRSを推測せず、明示した座標系で変換する', async () => {
		const bytes = readFileSync(fixture());
		expect((await convertDgn(bytes)).spatialStatus).toBe('crs-missing');
		const result = await convertDgn(bytes, 'EPSG:3857');
		expect(result.spatialStatus).toBe('resolved');
		const point = result.geojson.features[0].geometry;
		if (point.type !== 'Point') throw new Error('test-point');
		expect(point.coordinates).toEqual(proj4('EPSG:3857', 'EPSG:4326', [2, 3]));
		await expect(convertDgn(bytes, 'test-invalid-crs')).rejects.toThrow('座標系');
	});
});

describe('DGN入力検証', () => {
	it('V8コンテナと異形式を明示的に拒否する', () => {
		expect(() =>
			validateDgnBytes(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
		).toThrow('V8');
		expect(() => validateDgnBytes(new TextEncoder().encode('test-invalid'))).toThrow(
			'ヘッダー'
		);
	});
	it.each([3, 20])('末尾が%dバイト欠けた入力を拒否する', length => {
		expect(() => parseDgn(readFileSync(fixture()).subarray(0, -length))).toThrow('欠損');
	});
	it('入力上限・空入力を拒否する', () => {
		expect(() => checkDgnSize({ size: 0 })).toThrow('空');
		expect(() => checkDgnSize({ size: formatDgn.limits.maxFileBytes + 1 })).toThrow('64 MiB');
	});
});
