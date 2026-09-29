import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { convertOsmPbf, type OsmPbfGdal } from '.';
import { isOsmPbfFile, MAX_OSM_PBF_BYTES, validateOsmPbfFile } from './files';
import { OSM_PBF_GDAL_ENV } from './gdal-config';

const require = createRequire(import.meta.url);
const fixtureUrl = (name: string) => new URL(`./__fixtures__/${name}.osm.pbf`, import.meta.url);
const fixtureFile = (name = 'test-dense', filename = `${name}.osm.pbf`) =>
	new File([readFileSync(fixtureUrl(name))], filename);
let gdal: OsmPbfGdal;
let errors: string[] = [];
let sqliteSpills: string[] = [];
beforeAll(async () => {
	const fetch = globalThis.fetch;
	vi.stubGlobal('fetch', undefined);
	try {
		gdal = await require('gdal3.js/node')({
			path: 'node_modules/gdal3.js/dist/package',
			dest: '.svelte-kit/osm-pbf-tests',
			useWorker: false,
			// 架空fixtureで一時SQLiteのファイル移行を通し、unlinkによるI/Oエラーを検出する。
			env: { ...OSM_PBF_GDAL_ENV, OSM_MAX_TMPFILE_SIZE: '0', CPL_DEBUG: 'OSM' },
			logHandler: () => {},
			errorHandler: (message: string) => {
				if (/ERROR|Parsing error|An error occurred/i.test(message)) errors.push(message);
				if (/sqlite too big for RAM/.test(message)) sqliteSpills.push(message);
			}
		});
	} finally {
		vi.stubGlobal('fetch', fetch);
	}
});

const convert = async (name: string) => {
	errors = [];
	sqliteSpills = [];
	await validateOsmPbfFile(fixtureFile(name));
	return convertOsmPbf(gdal, fileURLToPath(fixtureUrl(name)), () => {
		if (errors.length) throw new Error(errors.join('\n'));
	});
};

describe('OSM PBFの実デコーダー', () => {
	it.each(['test-raw', 'test-dense'])(
		'%sから点・線・建物・内周のあるrelationを読む',
		async name => {
			const result = await convert(name);
			expect(result.features).toHaveLength(4);
			const point = result.features.find(feature => feature.id === 'node/9');
			expect(point).toMatchObject({
				geometry: { type: 'Point', coordinates: [-1, -1] },
				properties: {
					name: 'test-point',
					amenity: 'bench',
					'test:tag': '架空の属性',
					'osm:id': '9'
				}
			});
			expect(result.features.find(feature => feature.id === 'way/10')).toMatchObject({
				geometry: { type: 'LineString', coordinates: [[2, 2], [3, 2]] },
				properties: { highway: 'path', name: 'test-line' }
			});
			expect(result.features.find(feature => feature.id === 'way/11')?.properties.building)
				.toBe('yes');
			const area = result.features.find(feature => feature.id === 'relation/20');
			expect(area?.properties).toMatchObject({ name: 'test-area', landuse: 'forest' });
			if (area?.geometry.type !== 'MultiPolygon') throw new Error('test-areaの形状');
			expect(area.geometry.coordinates[0]).toHaveLength(2);
			expect(area.geometry.coordinates[0].map(ring => ring.length)).toEqual([5, 5]);
		}
	);
	it('同じエンジンで読み直しても地物が欠落しない', async () => {
		expect(await convert('test-raw')).toEqual(await convert('test-dense'));
	});
	it('一時SQLiteがファイルへ移行しても最後まで変換できる', async () => {
		const result = await convert('test-spill');
		expect(sqliteSpills.length).toBeGreaterThan(0);
		expect(result.features).toHaveLength(150001);
		expect(result.features.at(-1)).toMatchObject({
			id: 'way/150099',
			properties: { building: 'yes' }
		});
	}, 20000);
	it('空のOSMを成功として登録しない', async () => {
		await expect(convert('test-empty')).rejects.toThrow('描画可能な地物がありません');
	});
	it.each(['test-corrupt', 'test-unsupported'])('%sを部分成功として返さない', async name => {
		await expect(convert(name)).rejects.toBeDefined();
	});
});

describe('OSM PBFの判定と境界検証', () => {
	it('通常の.pbfは内容からOSMと判定する', async () => {
		expect(await isOsmPbfFile(fixtureFile('test-dense', 'test-map.PBF'))).toBe(true);
	});
	it('明示的な.osm.pbfは壊れていてもOSMのエラー導線へ渡す', async () => {
		expect(await isOsmPbfFile(new File(['test-broken'], 'test-map.OSM.PBF'))).toBe(true);
	});
	it('ベクタータイルや無関係な拡張子をOSMとしない', async () => {
		expect(await isOsmPbfFile(new File([new Uint8Array([26, 3, 10, 1, 0])], 'test-tile.pbf')))
			.toBe(false);
		expect(await isOsmPbfFile(fixtureFile('test-dense', 'test-map.mvt'))).toBe(false);
	});
	it.each([1, 4, 8])('末尾を%dバイト切ったファイルを拒否する', async length => {
		const bytes = readFileSync(fixtureUrl('test-dense'));
		await expect(validateOsmPbfFile(new File([bytes.subarray(0, -length)], 'test-cut.osm.pbf')))
			.rejects.toThrow(/欠損|不正/);
	});
	it('巨大なヘッダー・空入力・上限超過を読み込む前に拒否する', async () => {
		await expect(
			validateOsmPbfFile(new File([new Uint8Array([255, 255, 255, 255])], 'test-bad.osm.pbf'))
		).rejects.toThrow('ヘッダー');
		await expect(validateOsmPbfFile(new File([], 'test-empty.osm.pbf'))).rejects.toThrow('空');
		await expect(validateOsmPbfFile({ size: MAX_OSM_PBF_BYTES + 1 } as File)).rejects.toThrow(
			'64 MiB'
		);
	});
	it('GDALが部分成功を返しても解析エラーがあれば登録しない', async () => {
		await expect(convertOsmPbf(gdal, fileURLToPath(fixtureUrl('test-raw')), () => {
			throw new Error('test-decoder-error');
		})).rejects.toThrow('test-decoder-error');
	});
});
