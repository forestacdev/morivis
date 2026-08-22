import { describe, expect, it } from 'vitest';
import { inspectGltfFile } from '.';

const createFile = (name: string, text: string) =>
	({
		name,
		text: async () => text
	}) as File;

describe('gltf parser', () => {
	it('外部 buffer と画像 URI を取り出せる', async () => {
		const result = await inspectGltfFile(
			createFile(
				'scene.gltf',
				JSON.stringify({
					asset: { version: '2.0' },
					buffers: [{ uri: 'scene.bin' }],
					images: [{ uri: 'textures/diffuse.png' }, { uri: 'textures/normal.jpg' }]
				})
			)
		);

		expect(result).toEqual({
			externalBufferUris: ['scene.bin'],
			externalImageUris: ['textures/diffuse.png', 'textures/normal.jpg']
		});
	});

	it('data URI と絶対 URL は外部ローカル参照として扱わない', async () => {
		const result = await inspectGltfFile(
			createFile(
				'scene.gltf',
				JSON.stringify({
					asset: { version: '2.0' },
					buffers: [
						{ uri: 'data:application/octet-stream;base64,AAAA' },
						{ uri: 'https://example.com/remote.bin' }
					],
					images: [
						{ uri: '//cdn.example.com/texture.png' },
						{ uri: 'textures/local.webp' }
					]
				})
			)
		);

		expect(result).toEqual({
			externalBufferUris: [],
			externalImageUris: ['textures/local.webp']
		});
	});
});
