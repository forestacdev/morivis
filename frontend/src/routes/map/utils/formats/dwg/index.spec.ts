import { readFileSync } from 'node:fs';
import { Box3, Color, Mesh, Vector3 } from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { decode_dwg, initSync } from '../../../../../../static/vendor/dwg-acis/dwg_acis.js';

import { createDxfModel, disposeDxfModel } from '../dxf/mesh';
import { prepareDxfVectorData } from '../dxf/planar';

import { analyzeDwgArrayBuffer, analyzeDwgDrawing, dwgArrayBufferToGeoJson } from '.';

// ブラウザーの公開URL解決だけを置き換え、解析には実際の同梱WASMを使う。
vi.mock('./runtime', async () => {
	const runtime = await import('../../../../../../static/vendor/dwg-acis/dwg_acis.js');
	return { loadDwgRuntime: async () => runtime };
});

const readFixture = (name = 'test-mesh.dwg') => {
	const bytes = readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url));
	return new Uint8Array(bytes).buffer;
};

beforeAll(async () => {
	// Nodeでは同梱WASMを直接使い、ネットワークも変換のmockも使わない。
	initSync({
		module: readFileSync(
			new URL('../../../../../../static/vendor/dwg-acis/dwg_acis_bg.wasm', import.meta.url)
		)
	});
});

describe('DWGからDXFを経由した3D解析', () => {
	it('ポリフェイス・3DFACEの頂点、色、レイヤーとmm単位を保持する', async () => {
		const result = await analyzeDwgArrayBuffer(readFixture());
		expect(result.sourceUnitCode).toBe(4);
		expect(result.metersPerUnit).toBe(0.001);
		expect(result.geojson.features.map(feature => feature.properties.type).sort()).toEqual([
			'3DFACE',
			'LINE',
			'POLYLINE'
		]);
		const model = createDxfModel(result.geojson);
		try {
			expect(model.children).toHaveLength(2);
			model.children.sort((a, b) => b.userData.layer.localeCompare(a.userData.layer));
			expect(model.children.map(child => child.userData.layer)).toEqual([
				'test-mesh',
				'test-face'
			]);
			expect(model.children.map(child =>
				new Color().fromBufferAttribute(
					(child as Mesh).geometry.getAttribute('color'),
					0
				).getHexString()
			)).toEqual(['ff0000', '00ff00']);
			const size = new Box3().setFromObject(model).getSize(new Vector3());
			expect(size.x).toBeCloseTo(0.013, 8);
			expect(size.y).toBeCloseTo(0.006, 8);
			expect(size.z).toBeCloseTo(0.002, 8);
			expect(
				model.children.map(child => (child as Mesh).geometry.getAttribute('position').count)
			).toEqual([9, 6]);
		} finally {
			disposeDxfModel(model);
		}
	});

	it('手動の単位指定でヘッダー単位を置き換える', async () => {
		const result = await analyzeDwgArrayBuffer(readFixture(), 'm');
		expect(result.sourceUnitCode).toBe(4);
		expect(result.metersPerUnit).toBe(1);
		const model = createDxfModel(result.geojson);
		try {
			expect(new Box3().setFromObject(model).getSize(new Vector3()).y).toBeCloseTo(6);
		} finally {
			disposeDxfModel(model);
		}
	});

	it('2D線の登録と3D面の輪郭への変換も維持する', async () => {
		const geojson = await dwgArrayBufferToGeoJson(readFixture());
		const lines = {
			...geojson,
			features: geojson.features.filter(feature => feature.geometry.type === 'LineString')
		};
		const prepared = prepareDxfVectorData(lines, 'LineString', '2d');
		expect(prepared.geojson.features).toHaveLength(1);
		expect(prepared.geojson.features[0].geometry).toEqual({
			type: 'MultiLineString',
			coordinates: [[[0, 0], [0.02, 0.01]]]
		});
		const faces = {
			...geojson,
			features: geojson.features.filter(feature => feature.properties.type === '3DFACE')
		};
		const outline = prepareDxfVectorData(faces, 'Polygon', '2d-line');
		expect(outline.geometryType).toBe('LineString');
		expect(outline.allow3d).toBe(false);
		expect(outline.geojson.features.length).toBeGreaterThan(0);
	});

	it('不正なDWGは読み込みエラーにする', async () => {
		await expect(analyzeDwgArrayBuffer(new Uint8Array([0, 1, 2]).buffer)).rejects.toThrow();
	});
});

describe('ACISソリッド', () => {
	it.each(['test-solids-sat.dwg', 'test-solids-sab.dwg'])(
		'%sの箱・円柱・球を色と単位を保って変換する',
		async name => {
			const result = await analyzeDwgArrayBuffer(readFixture(name));
			const solids = result.geojson.features.filter(feature =>
				feature.properties.type === '3DSOLID'
			);
			expect(solids).toHaveLength(3);
			expect(solids.map(feature => feature.properties.layer)).toEqual([
				'test-box',
				'test-cylinder',
				'test-sphere'
			]);
			expect(solids.map(feature => feature.properties.color)).toEqual([
				'#ff0000',
				'#00ff00',
				'#0000ff'
			]);
			expect(result.sourceUnitCode).toBe(4);
			expect(result.geojson.features.some(feature => feature.properties.type === 'LINE'))
				.toBe(true);
			const model = createDxfModel({ type: 'FeatureCollection', features: solids });
			try {
				expect(model.children).toHaveLength(3);
				const sizes = model.children.map(child =>
					new Box3().setFromObject(child).getSize(new Vector3())
				);
				for (
					const [index, expected] of [[0, [0.004, 0.008, 0.006]], [1, [
						0.006,
						0.012,
						0.006
					]], [2, [0.01, 0.01, 0.01]]] as const
				) {
					sizes[index].toArray().forEach((value, axis) =>
						expect(value).toBeCloseTo(expected[axis], 4)
					);
				}
				expect(model.children.every(child => child.userData.entityType === '3DSOLID')).toBe(
					true
				);
			} finally {
				disposeDxfModel(model);
			}
		}
	);

	it('ACIS内部の配置とINSERTの基点・回転・倍率、ByLayer/ByBlock色を保持する', async () => {
		const { geojson } = await analyzeDwgArrayBuffer(readFixture('test-placed-solids.dwg'));
		const solids = geojson.features.filter(feature => feature.properties.type === '3DSOLID');
		expect(solids).toHaveLength(2);
		expect(solids.map(feature => feature.properties.color)).toEqual(['#00ff00', '#4080c0']);
		const bounds = solids.map(feature => {
			if (feature.geometry.type !== 'MultiPolygon') throw new Error('Expected solid');
			return new Box3().setFromPoints(
				feature.geometry.coordinates.flat(2).map(point => new Vector3(...point))
			);
		});
		expect(bounds[0].getCenter(new Vector3()).toArray()).toEqual([10, 20, 30]);
		expect(bounds[1].getCenter(new Vector3()).toArray()).toEqual([100, 200, 300]);
		bounds[1].getSize(new Vector3()).toArray().forEach((v, i) =>
			expect(v).toBeCloseTo([12, 8, 16][i])
		);
	});

	it('変換できない部品は全体を除外し、対象と理由を返す', async () => {
		const result = await analyzeDwgArrayBuffer(readFixture('test-unsupported-solid.dwg'));
		expect(result.geojson.features).toHaveLength(0);
		expect(result.skippedSolids).toEqual([expect.objectContaining({
			handle: expect.any(String),
			layer: '0',
			entityType: '3DSOLID',
			blockPath: [],
			reason: expect.stringMatching(/未対応|解析できません/)
		})]);
	});

	it('失敗した部品を混ぜず、変換できた部品と2D線を読み込む', async () => {
		const result = await analyzeDwgArrayBuffer(readFixture('test-partial-solids.dwg'));
		expect(result.geojson.features).toHaveLength(2);
		expect(result.geojson.features.map(feature => feature.properties.type).sort()).toEqual([
			'3DSOLID',
			'LINE'
		]);
		expect(
			result.geojson.features.some(feature => feature.properties.layer === 'test-excluded')
		).toBe(false);
		expect(result.skippedSolids).toEqual([
			expect.objectContaining({
				layer: 'test-excluded',
				reason: expect.stringMatching(/未対応/)
			})
		]);
	});

	it('微小にずれたトリム境界を持つNURBS面を元の辺から再計算する', async () => {
		const result = await analyzeDwgArrayBuffer(readFixture('test-trimmed-solid.dwg'));
		expect(result.skippedSolids).toEqual([]);
		expect(result.geojson.features).toHaveLength(1);
		const model = createDxfModel(result.geojson);
		try {
			expect(new Box3().setFromObject(model).getSize(new Vector3()).toArray()).toEqual([
				2,
				4,
				3
			]);
		} finally {
			disposeDxfModel(model);
		}
	});

	it('両端だけでは面積が消える細いNURBS面を境界の分割で復元する', async () => {
		const result = await analyzeDwgDrawing(readFixture('test-shallow-lens.dwg'));
		expect(result.skippedSolids).toEqual([]);
		expect(result.solids).toHaveLength(1);
		const { positions, indices } = result.solids[0];
		let area = 0;
		for (let i = 0; i < indices.length; i += 3) {
			const [a, b, c] = [0, 1, 2].map(offset =>
				new Vector3().fromArray(positions, indices[i + offset] * 3)
			);
			const cross = b.sub(a).cross(c.sub(a));
			expect(cross.z).toBeGreaterThan(0);
			area += cross.length() / 2;
		}
		expect(area).toBeCloseTo(0.002, 10);
	});
});

it('展開上限に収まらない部品は全体を除外し、上限を超えるメッシュを返さない', () => {
	const drawing = JSON.parse(decode_dwg(new Uint8Array(readFixture('test-solids-sab.dwg')), 1));
	expect(drawing.solids).toEqual([]);
	expect(drawing.skippedSolids).toHaveLength(3);
	expect(
		drawing.skippedSolids.every((solid: { reason: string; }) => solid.reason.includes('上限'))
	).toBe(true);
});

it('3D解析ではGeoJSONへ展開せず、頂点共有メッシュで寸法・配置・色を保持する', async () => {
	const compact = await analyzeDwgDrawing(readFixture('test-placed-solids.dwg'));
	expect(compact.solids).toHaveLength(2);
	expect(compact.geojson.features.some(feature => feature.properties.type === '3DSOLID')).toBe(
		false
	);
	expect(compact.solids[0].positions).toBeInstanceOf(Float64Array);
	expect(compact.solids[0].indices).toBeInstanceOf(Uint32Array);
	expect(compact.solids[0].positions.buffer).toBe(compact.solids[1].positions.buffer);
	const legacy = await analyzeDwgArrayBuffer(readFixture('test-placed-solids.dwg'));
	const model = createDxfModel(compact.geojson, compact.solids);
	const reference = createDxfModel(legacy.geojson);
	try {
		expect(model.children).toHaveLength(reference.children.length);
		expect(model.userData.sourceOrigin).toEqual(reference.userData.sourceOrigin);
		for (const [index, child] of model.children.entries()) {
			const actual = new Box3().setFromObject(child);
			const expected = new Box3().setFromObject(reference.children[index]);
			actual.min.toArray().forEach((value, axis) =>
				expect(value).toBeCloseTo(expected.min.toArray()[axis], 5)
			);
			actual.max.toArray().forEach((value, axis) =>
				expect(value).toBeCloseTo(expected.max.toArray()[axis], 5)
			);
			expect((child as Mesh).geometry.index?.count).toBe(
				compact.solids[index].indices.length
			);
		}
		expect(
			model.children.map(child =>
				((child as Mesh).material as import('three').MeshStandardMaterial).color
					.getHexString()
			)
		).toEqual(['00ff00', '4080c0']);
	} finally {
		disposeDxfModel(model);
		disposeDxfModel(reference);
	}
});

it('頂点共有メッシュの単位をメートルへ換算する', async () => {
	const result = await analyzeDwgDrawing(readFixture('test-solids-sab.dwg'));
	expect(result.metersPerUnit).toBe(0.001);
	expect(result.solids[0].bounds[3] - result.solids[0].bounds[0]).toBeCloseTo(0.004);
	expect(result.solids[0].bounds[5] - result.solids[0].bounds[2]).toBeCloseTo(0.008);
});

it('一覧の読み取りでは未対応ソリッドも三角形化せず、レイヤーと種類を返す', async () => {
	const result = await analyzeDwgDrawing(readFixture('test-partial-solids.dwg'), 'auto', {
		mode: 'inspect'
	});
	expect(result.solids).toEqual([]);
	expect(result.skippedSolids).toEqual([]);
	expect(result.solidDescriptors).toEqual([
		{ layer: 'test-valid', entityType: '3DSOLID' },
		{ layer: 'test-excluded', entityType: '3DSOLID' }
	]);
	expect(result.geojson.features.map(feature => feature.properties.type)).toEqual(['LINE']);
});

it('選択したレイヤーだけ変換し、未選択の不正なACISには触れない', async () => {
	const result = await analyzeDwgDrawing(readFixture('test-partial-solids.dwg'), 'auto', {
		mode: 'convert',
		layers: ['test-valid']
	});
	expect(result.skippedSolids).toEqual([]);
	expect(result.solids.map(solid => solid.layer)).toEqual(['test-valid']);
	const failed = await analyzeDwgDrawing(readFixture('test-partial-solids.dwg'), 'auto', {
		mode: 'convert',
		layers: ['test-excluded']
	});
	expect(failed.solids).toEqual([]);
	expect(failed.skippedSolids.map(solid => solid.layer)).toEqual(['test-excluded']);
});

it('ソリッドの選択が空なら三角形化せず、通常図形だけ返す', async () => {
	const result = await analyzeDwgDrawing(readFixture('test-partial-solids.dwg'), 'auto', {
		mode: 'convert',
		layers: []
	});
	expect(result.solids).toEqual([]);
	expect(result.skippedSolids).toEqual([]);
	expect(result.geojson.features).toHaveLength(1);
});

it('単位変更は一覧の通常図形だけ換算し、原本とレイヤー情報を保持する', async () => {
	const { rescaleDxfResult } = await import('../dxf');
	const result = await analyzeDwgDrawing(readFixture(), 'auto', { mode: 'inspect' });
	const original = structuredClone(result.geojson);
	const scaled = rescaleDxfResult(result, 'm');
	const expected = await analyzeDwgDrawing(readFixture(), 'm', { mode: 'inspect' });
	expect(scaled.geojson).toEqual(expected.geojson);
	expect(result.geojson).toEqual(original);
	expect(rescaleDxfResult(scaled, 'auto').geojson).toEqual(original);
});

// 部品分割APIも実際のWASMで検証し、従来の一括変換と形状・除外情報を比較する。
it.each([
	'test-solids-sat.dwg',
	'test-solids-sab.dwg',
	'test-placed-solids.dwg',
	'test-partial-solids.dwg',
	'test-trimmed-solid.dwg',
	'test-shallow-lens.dwg',
	'test-unsupported-solid.dwg',
	'test-mesh.dwg'
])('%sを部品単位で変換しても一括変換と同じ結果になる', async name => {
	const runtime = await import('../../../../../../static/vendor/dwg-acis/dwg_acis.js');
	const { readDwgBinary } = await import('./acis');
	const { normalizeDwgDrawing } = await import('.');
	const bytes = readFixture(name);
	const expected = await analyzeDwgDrawing(bytes);
	const prepared = runtime.prepare_dwg(new Uint8Array(bytes), 'null');
	try {
		const result = normalizeDwgDrawing(JSON.parse(prepared.drawing()), 'auto');
		expect(result.solids).toEqual([]);
		expect(result.skippedSolids).toEqual([]);
		const count = prepared.job_count();
		for (let index = 0; index < count; index++) {
			const part = readDwgBinary(runtime.mesh_dwg_solid(prepared.next_job()));
			const { scaleIndexedCadMesh } = await import('../dxf/indexed-mesh');
			for (const solid of part.solids) scaleIndexedCadMesh(solid, result.metersPerUnit);
			result.solids.push(...part.solids);
			result.skippedSolids.push(...part.skippedSolids);
		}
		expect(prepared.job_count()).toBe(0);
		expect(result).toEqual(expected);
	} finally {
		prepared.free();
	}
});

it('部品取り出しでもレイヤー選択を保持し、未選択のACISを解析しない', async () => {
	const runtime = await import('../../../../../../static/vendor/dwg-acis/dwg_acis.js');
	const { readDwgBinary } = await import('./acis');
	for (const layers of [[], ['test-valid'], ['test-excluded']]) {
		const prepared = runtime.prepare_dwg(
			new Uint8Array(readFixture('test-partial-solids.dwg')),
			JSON.stringify(layers)
		);
		try {
			expect(prepared.job_count()).toBe(layers.length);
			if (!layers.length) continue;
			const result = readDwgBinary(runtime.mesh_dwg_solid(prepared.next_job()));
			expect([...result.solids, ...result.skippedSolids].map(part => part.layer)).toEqual(
				layers
			);
		} finally {
			prepared.free();
		}
	}
});
