import { createTiles3DEntry } from '$routes/map/data/entries/model';
import { Tile3DLayer } from '@deck.gl/geo-layers';
import { type Loader, parse } from '@loaders.gl/core';
import { describe, expect, it, vi } from 'vitest';
import { createTiles3DLayer } from './overlay';

vi.mock('@geoarrow/deck.gl-layers', () => ({
	GeoArrowPathLayer: vi.fn(),
	GeoArrowPolygonLayer: vi.fn(),
	GeoArrowScatterplotLayer: vi.fn()
}));

const createMetadataGlb = () => {
	const binary = new Uint8Array(68);
	new Float32Array(binary.buffer, 0, 9).set([0, 0, 0, 1, 0, 0, 0, 1, 0]);
	binary.set(new TextEncoder().encode('test-atest-b'), 36);
	new Uint32Array(binary.buffer, 48, 3).set([0, 6, 12]);
	new Uint32Array(binary.buffer, 60, 2).set([0, 2]);
	const metadata = {
		schema: { classes: { test: { properties: { labels: { type: 'STRING', array: true } } } } },
		propertyTables: [{
			class: 'test',
			count: 1,
			properties: { labels: { values: 1, stringOffsets: 2, arrayOffsets: 3 } }
		}]
	};
	const json = JSON.stringify({
		asset: { version: '2.0' },
		extensionsUsed: ['EXT_structural_metadata'],
		extensions: { EXT_structural_metadata: metadata },
		buffers: [{ byteLength: binary.length }],
		bufferViews: [
			{ buffer: 0, byteOffset: 0, byteLength: 36 },
			{ buffer: 0, byteOffset: 36, byteLength: 12 },
			{ buffer: 0, byteOffset: 48, byteLength: 12 },
			{ buffer: 0, byteOffset: 60, byteLength: 8 }
		],
		accessors: [{
			bufferView: 0,
			componentType: 5126,
			count: 3,
			type: 'VEC3',
			min: [0, 0, 0],
			max: [1, 1, 0]
		}],
		materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1] } }],
		meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
		nodes: [{ mesh: 0 }],
		scenes: [{ nodes: [0] }],
		scene: 0
	});
	const chunk = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4, ' '));
	const glb = new Uint8Array(28 + chunk.length + binary.length);
	const header = new DataView(glb.buffer);
	[0x46546c67, 2, glb.length, chunk.length, 0x4e4f534a].forEach((value, index) =>
		header.setUint32(index * 4, value, true)
	);
	glb.set(chunk, 20);
	header.setUint32(20 + chunk.length, binary.length, true);
	header.setUint32(24 + chunk.length, 0x004e4942, true);
	glb.set(binary, 28 + chunk.length);
	return { buffer: glb.buffer, metadata };
};

describe('3D Tilesの文字列配列属性', () => {
	it('未実装デコーダーを回避し、形状・色と元の属性を保持する', async () => {
		const { buffer, metadata } = createMetadataGlb();
		const loader = Tile3DLayer.defaultProps.loader as Loader;
		await expect(parse(buffer.slice(0), loader)).rejects.toThrow(
			'Not implemented - arrayOffsets for strings is specified'
		);
		const layer = createTiles3DLayer(
			createTiles3DEntry('test-model', 'https://example.invalid/tileset.json')
		);
		const result = await parse(buffer, loader, layer.props.loadOptions) as {
			gltf: {
				extensions: Record<string, unknown>;
				meshes: {
					primitives: { attributes: { POSITION: { value: Float32Array; }; }; }[];
				}[];
				materials: { pbrMetallicRoughness: { baseColorFactor: number[]; }; }[];
			};
		};
		expect(result.gltf.extensions.EXT_structural_metadata).toEqual(metadata);
		expect(Array.from(result.gltf.meshes[0].primitives[0].attributes.POSITION.value)).toEqual(
			[0, 0, 0, 1, 0, 0, 0, 1, 0]
		);
		expect(result.gltf.materials[0].pbrMetallicRoughness.baseColorFactor).toEqual([1, 0, 0, 1]);
	});
});
