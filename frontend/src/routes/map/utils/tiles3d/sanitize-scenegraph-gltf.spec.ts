import { describe, expect, it } from 'vitest';

import {
	sanitizeScenegraphGltfAttributes,
	sanitizeScenegraphGltfForDeck,
	type ScenegraphGltfLike
} from './sanitize-scenegraph-gltf';

describe('sanitizeScenegraphGltfAttributes', () => {
	it('ScenegraphLayer が使わない独自属性を落とす', () => {
		const gltf: ScenegraphGltfLike = {
			meshes: [
				{
					primitives: [
						{
							attributes: {
								POSITION: {},
								NORMAL: {},
								TANGENT: {},
								TEXCOORD_0: {},
								COLOR_0: {},
								JOINTS_0: {},
								WEIGHTS_0: {},
								_BATCHID: {},
								_FEATURE_ID_0: {},
								CUSTOM_ATTRIBUTE: {}
							}
						}
					]
				}
			]
		};

		const sanitized = sanitizeScenegraphGltfAttributes(gltf);
		const attributes = gltf.meshes?.[0]?.primitives?.[0]?.attributes;

		expect(sanitized).toBe(true);
		expect(attributes).toEqual({
			POSITION: {},
			NORMAL: {},
			TANGENT: {},
			TEXCOORD_0: {},
			COLOR_0: {},
			JOINTS_0: {},
			WEIGHTS_0: {}
		});
	});

	it('対象属性がなければそのまま通す', () => {
		const gltf: ScenegraphGltfLike = {
			meshes: [
				{
					primitives: [
						{
							attributes: {
								POSITION: {},
								NORMAL: {},
								TEXCOORD_0: {}
							}
						}
					]
				}
			]
		};

		expect(sanitizeScenegraphGltfAttributes(gltf)).toBe(false);
		expect(gltf.meshes?.[0]?.primitives?.[0]?.attributes).toEqual({
			POSITION: {},
			NORMAL: {},
			TEXCOORD_0: {}
		});
	});

	it('Uint8Array のインデックスを Uint16Array に正規化する', () => {
		const gltf: ScenegraphGltfLike = {
			meshes: [
				{
					primitives: [
						{
							attributes: {
								POSITION: {}
							},
							indices: {
								componentType: 5121,
								type: 'SCALAR',
								value: Uint8Array.from([0, 1, 2, 2, 3, 0])
							}
						}
					]
				}
			]
		};

		const sanitized = sanitizeScenegraphGltfForDeck(gltf);
		const indices = gltf.meshes?.[0]?.primitives?.[0]?.indices;

		expect(sanitized).toBe(true);
		expect(indices?.value instanceof Uint16Array).toBe(true);
		if (!(indices?.value instanceof Uint16Array)) {
			throw new Error('indices.value must be Uint16Array');
		}
		expect(Array.from(indices.value)).toEqual([0, 1, 2, 2, 3, 0]);
		expect(indices?.componentType).toBe(5123);
		expect(indices?.components).toBe(1);
		expect(indices?.count).toBe(6);
	});

	it('すでに対応済みの Uint16Array インデックスはそのまま通す', () => {
		const indices = {
			componentType: 5123,
			type: 'SCALAR',
			value: Uint16Array.from([0, 1, 2])
		};
		const gltf: ScenegraphGltfLike = {
			meshes: [
				{
					primitives: [
						{
							attributes: {
								POSITION: {}
							},
							indices
						}
					]
				}
			]
		};

		expect(sanitizeScenegraphGltfForDeck(gltf)).toBe(false);
		expect(gltf.meshes?.[0]?.primitives?.[0]?.indices).toBe(indices);
	});
});
