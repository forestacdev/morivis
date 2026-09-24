import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	concat,
	encodeRbxl,
	floats,
	inst,
	interleaved,
	parents,
	prop,
	text,
	u32
} from './__fixtures__/binary-world';
import { partXml, worldXml } from './__fixtures__/world';
import { robloxWorldToGlb } from './glb';
import { parseRbxl, parseRbxlx } from './index';
import { materialUv } from './material-uv';
import { packMetallicRoughness } from './pbr';
import { loadRobloxResources, type RobloxResources } from './resources';

const variant = (name: string, id: number, material = 256) =>
	partXml(
		`<string name="Name">${name}</string><token name="BaseMaterial">${material}</token><float name="StudsPerTile">2</float><Content name="ColorMap"><url>rbxassetid://${id}</url></Content>`,
		'',
		'MaterialVariant'
	);
const service = (properties: string, children: string) =>
	partXml(properties, children, 'MaterialService');
afterEach(() => vi.unstubAllGlobals());

describe('Roblox材質の解決', () => {
	it.each([[0, 'overlay'], [1, 'transparency'], [2, 'tint-mask'], [3, 'opaque']])(
		'SurfaceAppearanceのAlphaMode=%sを保つ',
		(token, mode) => {
			const world = parseRbxlx(
				worldXml(
					partXml(
						'<Content name="MeshId"><url>rbxassetid://201</url></Content>',
						partXml(
							`<token name="AlphaMode">${token}</token>`,
							'',
							'SurfaceAppearance'
						),
						'MeshPart'
					)
				)
			);
			expect(world.parts[0].material?.alphaMode).toBe(mode);
		}
	);
	it('標準材質名を保持する未上書きのサービス設定で警告を出さない', () => {
		const world = parseRbxlx(
			worldXml(
				partXml('<token name="Material">512</token>'),
				service('<string name="WoodName">Wood</string>', '')
			)
		);
		expect(world.warnings).toEqual([]);
		expect(world.parts[0].material?.colorMap).toBeTruthy();
	});
	it('MaterialService内の名前とBaseMaterialが一致するVariantを使い、明示指定を優先する', () => {
		const outside = service(
			'<string name="PlasticName">test-default</string>',
			variant('test-default', 101) + partXml('', variant('test-explicit', 102), 'Folder')
				+ variant('test-explicit', 103, 512)
		);
		const world = parseRbxlx(
			worldXml(
				partXml('<string name="MaterialVariantSerialized">test-explicit</string>')
					+ partXml(),
				outside
			)
		);
		expect(world.parts.map(part => part.material?.colorMap).sort()).toEqual([
			'rbxassetid://101',
			'rbxassetid://102'
		]);
		expect(world.parts.every(part => part.material?.studsPerTile === 2)).toBe(true);
	});
	it('サービス外のVariantは参照せず、不一致は標準材質へ戻す', () => {
		const world = parseRbxlx(
			worldXml(
				partXml(
					'<token name="Material">512</token><string name="MaterialVariant">test-missing</string>'
				),
				variant('test-missing', 101, 512)
			)
		);
		expect(world.parts[0].material?.colorMap).toMatch(/^rbxassetid:\/\/\d+$/);
		expect(world.parts[0].material?.colorMap).not.toBe('rbxassetid://101');
		expect(world.warnings).toEqual(['見つからないMaterialVariant（標準材質で代替）: 1件']);
	});
	it('Use2022Materials=falseで旧標準画像へ切り替える', () => {
		const part = partXml('<token name="Material">512</token>');
		const modern = parseRbxlx(worldXml(part)).parts[0].material;
		const legacy =
			parseRbxlx(worldXml(part, service('<bool name="Use2022Materials">false</bool>', '')))
				.parts[0].material;
		expect(legacy?.colorMap).toBeTruthy();
		expect(legacy?.colorMap).not.toBe(modern?.colorMap);
	});
	it('バイナリのVariant名・MaterialService・新Content型PBRを解決する', async () => {
		const content = (id: number) =>
			concat(interleaved([1]), u32(1), text(`rbxassetid://${id}`), u32(0), u32(0));
		const bytes = await encodeRbxl(
			[
				inst(0, 'Workspace', [1], true),
				inst(1, 'Part', [2]),
				inst(2, 'MaterialService', [3], true),
				inst(3, 'MaterialVariant', [4]),
				prop(1, 'Material', 0x12, interleaved([256])),
				prop(1, 'MaterialVariantSerialized', 0x01, text('test-variant')),
				prop(2, 'Use2022Materials', 0x02, new Uint8Array([0])),
				prop(2, 'PlasticName', 0x01, text('test-variant')),
				prop(3, 'Name', 0x01, text('test-variant')),
				prop(3, 'BaseMaterial', 0x12, interleaved([256])),
				prop(3, 'StudsPerTile', 0x04, floats([3])),
				...[
					'ColorMapContent',
					'NormalMapContent',
					'RoughnessMapContent',
					'MetalnessMapContent'
				].map((name, i) => prop(3, name, 0x22, content(101 + i))),
				parents([1, 2, 3, 4], [-1, 1, -1, 3]),
				{ kind: 'END', data: new TextEncoder().encode('</roblox>') }
			],
			'lz4',
			4,
			4
		);
		expect((await parseRbxl(bytes)).parts[0].material).toMatchObject({
			colorMap: 'rbxassetid://101',
			normalMap: 'rbxassetid://102',
			roughnessMap: 'rbxassetid://103',
			metalnessMap: 'rbxassetid://104',
			studsPerTile: 3
		});
	});
	it('SurfaceAppearanceはMeshPartのTextureIDとVariantより優先する', () => {
		const world = parseRbxlx(
			worldXml(
				partXml(
					'<Content name="MeshId"><url>rbxassetid://201</url></Content><Content name="TextureID"><url>rbxassetid://101</url></Content>',
					partXml(
						'<Content name="NormalMap"><url>rbxassetid://102</url></Content><token name="AlphaMode">1</token>',
						'',
						'SurfaceAppearance'
					),
					'MeshPart'
				)
			)
		);
		expect(world.parts[0].material).toMatchObject({
			normalMap: 'rbxassetid://102',
			alphaMode: 'transparency'
		});
		expect(world.parts[0].material?.colorMap).toBeUndefined();
	});
	it('カラー画像がなくてもPBR画像を取得し、同じIDはまとめる', async () => {
		vi.stubGlobal('createImageBitmap', async () => ({ close: () => {} }));
		const world = parseRbxlx(worldXml(partXml()));
		world.parts[0].material = {
			normalMap: 'rbxassetid://101',
			roughnessMap: 'rbxassetid://102',
			metalnessMap: 'rbxassetid://102',
			metallic: 1,
			roughness: 1
		};
		const fetcher = vi.fn(async () =>
			new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))
		);
		const result = await loadRobloxResources(world, {
			resourceUrl: '/test-materials',
			fetcher
		});
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(result.images.size).toBe(2);
	});
});

describe('PBRと材質UV', () => {
	it('粗さはG、金属感はBに格納し、欠けたマップの既定値を保持する', () => {
		const roughness = new Uint8ClampedArray([64, 64, 64, 255]);
		const metalness = new Uint8ClampedArray([192, 192, 192, 255]);
		expect([...packMetallicRoughness(4, roughness, metalness)]).toEqual([255, 64, 192, 255]);
		expect([...packMetallicRoughness(4, roughness)]).toEqual([255, 64, 0, 255]);
		expect([...packMetallicRoughness(4, undefined, metalness, 0.5)]).toEqual([
			255,
			128,
			192,
			255
		]);
	});
	it('stud単位で繰り返し、上下・左右の面で鏡像にしない', () => {
		expect(materialUv([0.5, 0.5, 0.5], [0, 1, 0], [4, 2, 8], 2)).toEqual([2, 4]);
		expect(materialUv([-0.5, -0.5, -0.5], [-1, 0, 0], [4, 2, 8], 2)).toEqual([0, 1]);
		expect(materialUv([0.5, -0.5, -0.5], [1, 0, 0], [4, 2, 8], 2)).toEqual([4, 1]);
	});
	it('GLBのカラー・法線・MRを別スロットへ格納し、合成面でも材質UVを保つ', () => {
		const world = parseRbxlx(worldXml(partXml()));
		const part = world.parts[0];
		part.material = { studsPerTile: 2, metallic: 1, roughness: 1 };
		part.textures = [{
			asset: 'test-baked',
			face: 1,
			color: [1, 1, 1],
			opacity: 1,
			offset: [0, 0],
			zIndex: 1,
			baked: true
		}];
		const image = () => ({ bytes: new Uint8Array([1]), mimeType: 'image/png' as const });
		const color = image(), normal = image(), mr = image();
		const resources: RobloxResources = {
			images: new Map([['test-baked', color]]),
			meshes: new Map(),
			materials: new Map([[part, {
				color,
				normal,
				metallicRoughness: mr,
				colorFactor: [1, 1, 1],
				metallic: 1,
				roughness: 1,
				transparent: false
			}]])
		};
		const glb = robloxWorldToGlb(world, resources), view = new DataView(glb);
		const json = JSON.parse(
			new TextDecoder().decode(new Uint8Array(glb, 20, view.getUint32(12, true)))
		);
		expect(json.images).toHaveLength(3);
		expect(json.materials[1]).toMatchObject({
			alphaMode: 'OPAQUE',
			normalTexture: { texCoord: 1 },
			pbrMetallicRoughness: { metallicRoughnessTexture: { texCoord: 1 } }
		});
		expect(json.meshes[0].primitives[1].attributes.TEXCOORD_1).toBeDefined();
		expect(json.materials[0].normalTexture.index).not.toBe(
			json.materials[0].pbrMetallicRoughness.metallicRoughnessTexture.index
		);
	});
});
