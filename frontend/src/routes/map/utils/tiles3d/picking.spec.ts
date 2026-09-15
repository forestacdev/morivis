import { createTiles3DEntry } from '$routes/map/data/entries/model';
import type { PickingInfo } from '@deck.gl/core';
import { describe, expect, it, vi } from 'vitest';
import { readTileFeatureProperties } from './feature-metadata';
import { findTileFeatureAtPoint, pickTiles3DFeature, resolvePickedTiles3DFeature } from './picking';
import { type GltfPrimitiveLike, sanitizeScenegraphGltfForDeck } from './sanitize-scenegraph-gltf';

const triangle = (id: number, depth = 0): GltfPrimitiveLike => ({
	attributes: {
		POSITION: { value: new Float32Array([0, 0, depth, 2, 0, depth, 0, 2, depth]) },
		_BATCHID: { value: new Uint16Array([id, id, id]) }
	},
	indices: { value: new Uint8Array([0, 1, 2]) }
});
const scene = (...primitives: GltfPrimitiveLike[]) => {
	const mesh = { primitives };
	return { meshes: [mesh], scene: { nodes: [{ mesh }] } };
};
const project = (point: number[]) => point;

describe('3D Tilesのクリック属性', () => {
	it('描画用の独自属性削除とインデックス変換後も地物IDを参照できる', () => {
		const gltf = scene(triangle(0), triangle(1, -0.5));
		sanitizeScenegraphGltfForDeck(gltf);
		sanitizeScenegraphGltfForDeck(gltf);
		expect(gltf.meshes[0].primitives[0].attributes?._BATCHID).toBeUndefined();
		expect(findTileFeatureAtPoint(gltf, { x: 0.5, y: 0.5 }, project)?.id).toBe(1);
		expect(findTileFeatureAtPoint(gltf, { x: 3, y: 3 }, project)).toBeNull();
	});
	it('親子ノードの変換とサブレイヤーの投影を適用する', () => {
		const mesh = { primitives: [triangle(2)] };
		const gltf = {
			meshes: [mesh],
			scene: { nodes: [{ translation: [4, 0, 0], children: [{ mesh, scale: [2, 2, 1] }] }] }
		};
		const projected = (p: number[]) => [p[0] + 10, p[1] + 20, p[2]];
		expect(findTileFeatureAtPoint(gltf, { x: 15, y: 21 }, projected)?.id).toBe(2);
		expect(findTileFeatureAtPoint(gltf, { x: 1, y: 1 }, projected)).toBeNull();
	});
	it('手前がnullFeatureIdの場合、奥の地物属性を誤表示しない', () => {
		const front = triangle(0, -0.5);
		front.attributes!._FEATURE_ID_0 = { value: new Uint8Array([255, 255, 255]) };
		front.extensions = {
			EXT_mesh_features: {
				featureIds: [{
					attribute: 0,
					featureCount: 2,
					nullFeatureId: 255,
					propertyTable: 0
				}]
			}
		};
		const gltf = scene(triangle(1), front);
		sanitizeScenegraphGltfForDeck(gltf);
		expect(findTileFeatureAtPoint(gltf, { x: 0.5, y: 0.5 }, project)).toBeNull();
	});
	it('Batch Tableの選択行だけをパネル用に取り出す', () => {
		const content = {
			gltf: scene(triangle(1)),
			featureTableJson: { BATCH_LENGTH: 2 },
			batchTableJson: {
				name: ['test-a', 'test-b'],
				tags: [['test-x'], ['test-y', 'test-z']],
				active: [false, true]
			}
		};
		const info = {
			picked: true,
			x: 0.5,
			y: 0.5,
			object: { id: 'test-tile', content },
			sourceLayer: { projectPosition: project }
		} as unknown as PickingInfo;
		expect(resolvePickedTiles3DFeature(info, 'test-entry')).toEqual({
			entryId: 'test-entry',
			featureId: 'test-tile:batch:1',
			properties: { 地物ID: 1, name: 'test-b', tags: '["test-y","test-z"]', active: true }
		});
	});
	it('IDなしのタイルでは属性取得不可を表示する', () => {
		const primitive = triangle(0);
		delete primitive.attributes!._BATCHID;
		const info = {
			picked: true,
			x: 0.5,
			y: 0.5,
			object: { content: { gltf: scene(primitive) } },
			sourceLayer: { projectPosition: project }
		} as unknown as PickingInfo;
		expect(resolvePickedTiles3DFeature(info, 'test-entry')?.properties.属性情報).toContain(
			'地物IDを取得できません'
		);
	});
	it('新規メッシュはクリック可能で、非表示・クリック無効・点群はpick対象外', () => {
		const entry = createTiles3DEntry('test-mesh', 'https://example.invalid/test.json');
		const cloud = createTiles3DEntry(
			'test-points',
			'https://example.invalid/test.json',
			undefined,
			'point-cloud'
		);
		const pickObject = vi.fn().mockReturnValue(null);
		expect(entry.interaction.clickable).toBe(true);
		pickTiles3DFeature({ pickObject }, { x: 2, y: 3 }, [entry, cloud]);
		expect(pickObject).toHaveBeenCalledWith({
			x: 2,
			y: 3,
			radius: 0,
			layerIds: [`3d-tiles-layer-${entry.id}`]
		});
		pickObject.mockClear();
		entry.style.visible = false;
		pickTiles3DFeature({ pickObject }, { x: 2, y: 3 }, [entry, cloud]);
		entry.style.visible = true;
		entry.interaction.clickable = false;
		pickTiles3DFeature({ pickObject }, { x: 2, y: 3 }, [entry]);
		expect(pickObject).not.toHaveBeenCalled();
	});
});

describe('3D Tilesの属性デコード', () => {
	it('Batch Tableのバイナリ属性をbyteOffset・成分数に従って読む', () => {
		const bytes = new Uint8Array(20);
		new Float32Array(bytes.buffer, 4).set([1, 2, 3, 4]);
		const content = {
			featureTableJson: { BATCH_LENGTH: 2 },
			batchTableBinary: bytes,
			batchTableJson: {
				pair: { byteOffset: 4, componentType: 'FLOAT', type: 'VEC2' },
				extras: {}
			}
		};
		expect(readTileFeatureProperties(content, 1)).toEqual({ pair: '[3,4]' });
		expect(readTileFeatureProperties(content, 2)).toEqual({});
	});
	it('Property Tableの正規化・scale・offset・noDataとdefaultを解釈する', () => {
		const gltf = {
			bufferViews: [{ data: new Uint8Array([0, 128, 255]) }],
			extensions: {
				EXT_structural_metadata: {
					schema: {
						classes: {
							test: {
								properties: {
									amount: {
										type: 'SCALAR',
										componentType: 'UINT8',
										normalized: true,
										scale: 10,
										offset: 1,
										noData: 255,
										default: 7
									}
								}
							}
						}
					},
					propertyTables: [{
						class: 'test',
						count: 3,
						properties: { amount: { values: 0, scale: 20 } }
					}]
				}
			}
		};
		expect(readTileFeatureProperties({ gltf }, 0, 0)).toEqual({ amount: 1 });
		expect(readTileFeatureProperties({ gltf }, 1, 0).amount).toBeCloseTo(128 / 255 * 20 + 1);
		expect(readTileFeatureProperties({ gltf }, 2, 0)).toEqual({ amount: 7 });
	});
	it('不正なバッファがあっても他の属性を取得する', () => {
		const content = {
			batchTableJson: {
				name: ['test-a'],
				bad: { byteOffset: 100, componentType: 'FLOAT', type: 'SCALAR' }
			},
			batchTableBinary: new Uint8Array(4)
		};
		const props = readTileFeatureProperties(content, 0);
		expect(props.name).toBe('test-a');
		expect(props.bad).toContain('属性を読み取れません');
	});
});

it('EXT_mesh_featuresの疎なIDをfeatureCountで除外せず、最も近い頂点を選ぶ', () => {
	const primitive = triangle(0);
	primitive.attributes!._FEATURE_ID_0 = { value: new Uint16Array([10, 20, 30]) };
	primitive.extensions = {
		EXT_mesh_features: { featureIds: [{ attribute: 0, featureCount: 3, propertyTable: 2 }] }
	};
	const gltf = scene(primitive);
	sanitizeScenegraphGltfForDeck(gltf);
	expect(findTileFeatureAtPoint(gltf, { x: 0.1, y: 0.1 }, project)).toEqual({
		id: 10,
		propertyTable: 2
	});
	expect(findTileFeatureAtPoint(gltf, { x: 1.8, y: 0.1 }, project)).toEqual({
		id: 20,
		propertyTable: 2
	});
});
