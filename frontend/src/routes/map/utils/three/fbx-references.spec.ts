import { describe, expect, it } from 'vitest';

import { inspectFbxFile, inspectFbxTextureReferences } from './fbx-references';

const createBinaryFbxWithStringProperty = (propertyName: string, valueText: string) => {
	const encoder = new TextEncoder();
	const name = encoder.encode(propertyName);
	const value = encoder.encode(valueText);
	const property = new Uint8Array(1 + 4 + value.length);
	property[0] = 'S'.charCodeAt(0);
	new DataView(property.buffer).setUint32(1, value.length, true);
	property.set(value, 5);
	const nodeLength = 13 + name.length + property.length;
	const bytes = new Uint8Array(27 + nodeLength + 13);
	bytes.set(encoder.encode('Kaydara FBX Binary  '));
	new DataView(bytes.buffer).setUint32(23, 7400, true);
	const view = new DataView(bytes.buffer);
	view.setUint32(27, 27 + nodeLength, true);
	view.setUint32(31, 1, true);
	view.setUint32(35, property.length, true);
	view.setUint8(39, name.length);
	bytes.set(name, 40);
	bytes.set(property, 40 + name.length);
	return new File([bytes], 'test-model.fbx');
};

describe('inspectFbxTextureReferences', () => {
	it('ASCII FBX の相対テクスチャ参照を取得する', async () => {
		const file = new File(
			['Texture: 1, "Texture::test", "" {\n\tRelativeFilename: "textures/test-color.png"\n}'],
			'test-model.fbx'
		);

		await expect(inspectFbxTextureReferences(file)).resolves.toEqual([
			'textures/test-color.png'
		]);
	});

	it('Binary FBX の相対テクスチャ参照を取得する', async () => {
		const file = createBinaryFbxWithStringProperty('RelativeFilename', 'test.png');

		await expect(inspectFbxTextureReferences(file)).resolves.toEqual(['test.png']);
		await expect(inspectFbxFile(file)).resolves.toMatchObject({
			referencedTexturePaths: ['test.png'],
			description: expect.stringMatching(/^Binary FBX 7400、/)
		});
	});

	it.each(['Original', 'LastSaved'])(
		'%sのアプリ名がNavisworksのASCII FBXは両面を初期設定にする',
		async prefix => {
			const file = new File([
				`FBXHeaderExtension: {\n SceneInfo: "GlobalInfo", "UserData" {\n Properties70: {\n P: "${prefix}|ApplicationName", "KString", "", "", "Navisworks"\n }\n }\n }`
			], 'test-model.fbx');
			expect((await inspectFbxFile(file)).initialFaceSide).toBe('double');
		}
	);

	it('生成ツールがNavisworksのBinary FBXは両面を初期設定にする', async () => {
		const file = createBinaryFbxWithStringProperty('Creator', 'Navisworks test-version');
		expect((await inspectFbxFile(file)).initialFaceSide).toBe('double');
	});

	it('判別情報がない、または別の生成ソフトのFBXは元データに従う', async () => {
		for (const text of ['', 'Creator: "test-exporter"', 'Creator: "test-notnavisworks"']) {
			const file = new File([text], 'test-navisworks.fbx');
			expect((await inspectFbxFile(file)).initialFaceSide).toBe('source');
		}
	});
});
