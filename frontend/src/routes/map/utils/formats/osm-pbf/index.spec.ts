import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { convertOsmPbf } from '.';
import { formatOsmPbf } from './definition';
import { isOsmPbfFile, MAX_OSM_PBF_BYTES, validateOsmPbfFile } from './files';
const fixtureUrl = (name: string) => new URL(`./__fixtures__/${name}.osm.pbf`, import.meta.url);
const fixtureFile = (name = 'test-dense', filename = `${name}.osm.pbf`) =>
	new File([readFileSync(fixtureUrl(name))], filename);
const convert = (name: string) => convertOsmPbf(fixtureFile(name));

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
	it('15万wayのブロック間参照を最後まで変換できる', async () => {
		const result = await convert('test-spill');
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
});

describe('専用パーサーの互換性と異常系', () => {
	it('タグ配列を省略したDenseNodesからwayを組み立てる', async () => {
		const result = await convert('test-tagless-dense');
		expect(result.features).toHaveLength(1);
		expect(result.features[0].geometry).toEqual({
			type: 'LineString',
			coordinates: [[0, 0], [1, 1]]
		});
	});
	it('granularityと符号付きoffsetを適用する', async () => {
		expect((await convert('test-offset')).features[0].geometry).toEqual({
			type: 'Point',
			coordinates: [4, 1]
		});
	});
	it('routeとrestrictionの属性・構成図形を保持する', async () => {
		const result = await convert('test-relations');
		expect(result.features.find(f => f.id === 'relation/30')).toMatchObject({
			geometry: { type: 'LineString', coordinates: [[2, 2], [3, 2]] },
			properties: { name: 'test-route', 'osm:type': 'relation', 'osm:id': '30' }
		});
		const members = result.features.filter(f => f.properties['osm:id'] === '31');
		expect(members.map(f => f.geometry.type)).toEqual(['LineString', 'Point', 'LineString']);
		expect(members.every(f => f.properties.name === 'test-restriction')).toBe(true);
	});
	it('参照不足のwayには不完全な形状であることを残す', async () => {
		const way = (await convert('test-missing-node')).features.find(f => f.id === 'way/10');
		expect(way?.properties['osm:tainted']).toBe(true);
	});
	it.each([
		'test-bad-dense-count',
		'test-bad-dense-tags',
		'test-bad-tag-index',
		'test-missing-coordinate',
		'test-duplicate-id',
		'test-unsafe-id',
		'test-bad-message',
		'test-history',
		'test-relation-cycle',
		'test-bad-relation',
		'test-zlib-size',
		'test-oversize-blob',
		'test-lzma'
	])('%sを部分成功にしない', async name => {
		await expect(convert(name)).rejects.toBeInstanceOf(Error);
	});
	it.each(
		[
			['maxFeatures', 1],
			['maxVertices', 1],
			['maxSourcePoints', 1],
			['maxOutputBytes', 1],
			['maxExpandedBytes', 1]
		] as const
	)('%sの上限を検査する', async (key, limit) => {
		const original = formatOsmPbf.limits[key];
		try {
			Object.assign(formatOsmPbf.limits, { [key]: limit });
			await expect(convert('test-dense')).rejects.toThrow();
		} finally {
			Object.assign(formatOsmPbf.limits, { [key]: original });
		}
	});
});
