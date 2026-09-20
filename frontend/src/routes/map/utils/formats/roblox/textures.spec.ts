import { Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { meshBytes, textureWorld } from './__fixtures__/textures';
import { partXml, worldXml } from './__fixtures__/world';
import { robloxWorldToGlb } from './glb';
import { parseRbxl, parseRbxlx } from './index';
import { parseRobloxMesh } from './mesh';
import { loadRobloxResources, robloxAssetKey } from './resources';
import { robloxSurfaceGeometry } from './surfaces';

const xml = worldXml(
	partXml(
		'',
		partXml(
			'<Content name="Texture"><url>rbxassetid://101</url></Content><token name="Face">1</token>',
			'',
			'Texture'
		)
	)
);
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
afterEach(() => vi.unstubAllGlobals());

describe('Robloxの画像・UV', () => {
	it('ローカル素材未配置の204は画像として解釈せず、認証付き取得へ進む', async () => {
		vi.stubGlobal('createImageBitmap', async () => ({ close: () => {} }));
		const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
			new Response(null, { status: 204 })
		).mockResolvedValueOnce(new Response(png));
		const world = parseRbxlx(xml);
		const result = await loadRobloxResources(world, {
			resourceUrl: '/test-local',
			authenticatedAssetUrl: '/test-auth',
			fetcher
		});
		expect(result.images.size).toBe(1);
		expect(world.warnings).toEqual([]);
	});
	it('APIの配信先エラーを502の数値だけにせず通知する', async () => {
		const world = parseRbxlx(xml);
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			Response.json({ error: 'Roblox素材の配信先が不正、または未対応です' }, { status: 502 })
		);
		await loadRobloxResources(world, { authenticatedAssetUrl: '/test-auth', fetcher });
		expect(world.warnings).toEqual(['Roblox素材の配信先が不正、または未対応です: 1件']);
	});
	it('認証済みAPIが返した404はキー未設定の404と区別する', async () => {
		const world = parseRbxlx(xml);
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			Response.json({ error: 'Roblox API: HTTP 404' }, { status: 404 })
		);
		await loadRobloxResources(world, { authenticatedAssetUrl: '/test-auth', fetcher });
		expect(fetcher).toHaveBeenCalledOnce();
		expect(world.warnings).toEqual(['Roblox API: HTTP 404: 1件']);
	});
	it('公開APIがcontentdelivery.roblox.comを返した場合も取得する', async () => {
		vi.stubGlobal('createImageBitmap', async () => ({ close: () => {} }));
		const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
			Response.json({
				locations: [{ location: 'https://contentdelivery.roblox.com/v1/bytes/test-image' }]
			})
		).mockResolvedValueOnce(new Response(png));
		const result = await loadRobloxResources(parseRbxlx(xml), { fetcher });
		expect(result.images.size).toBe(1);
		expect(fetcher.mock.calls[1][0]).toBe(
			'https://contentdelivery.roblox.com/v1/bytes/test-image'
		);
	});
	it('ローカル素材がなければ認証付き取得口を使い、キー未設定の404のみ公開APIへ進む', async () => {
		vi.stubGlobal('createImageBitmap', async () => ({ close: () => {} }));
		for (const configured of [true, false]) {
			const fetcher = vi.fn<typeof fetch>().mockImplementation(async url => {
				const path = String(url);
				if (path.startsWith('/test-resources')) return new Response('', { status: 404 });
				if (path.startsWith('/test-auth')) {
					return configured
						? new Response(png)
						: new Response('', { status: 404 });
				}
				if (path.includes('assetdelivery.roblox.com')) {
					return Response.json({
						locations: [{ location: 'https://test.rbxcdn.com/test-image' }]
					});
				}
				return new Response(png);
			});
			const result = await loadRobloxResources(parseRbxlx(xml), {
				resourceUrl: '/test-resources',
				authenticatedAssetUrl: '/test-auth',
				fetcher
			});
			expect(result.images.size).toBe(1);
			expect(fetcher).toHaveBeenCalledTimes(configured ? 2 : 4);
		}
	});
	it('認証付き取得の権限不足は画像を省略し、公開APIを再試行しない', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 403 }));
		const world = parseRbxlx(xml);
		await loadRobloxResources(world, { authenticatedAssetUrl: '/test-auth', fetcher });
		expect(fetcher).toHaveBeenCalledOnce();
		expect(world.warnings).toEqual(['素材を取得する権限がありません: 1件']);
	});
	it.each([false, true])(
		'バイナリの画像参照と面・色・タイル設定を読む（Content=%s）',
		async content => {
			const world = await parseRbxl(await textureWorld(content));
			expect(world.parts[0].textures).toEqual([{
				asset: 'rbxassetid://101',
				face: 1,
				color: [0.5, 1, 0.25],
				opacity: 0.75,
				tile: [2, 4],
				offset: [1, -2],
				zIndex: 3
			}]);
			const geometry = robloxSurfaceGeometry(world.parts[0], world.parts[0].textures![0], 0);
			expect(Array.from(geometry.getAttribute('uv').array)).toEqual([
				-0.5,
				0.5,
				1.5,
				2.5,
				1.5,
				0.5,
				-0.5,
				0.5,
				-0.5,
				2.5,
				1.5,
				2.5
			]);
		}
	);
	it('XMLのContentとDecalの非繰り返しを読む', () => {
		const world = parseRbxlx(xml.replace('class="Texture"', 'class="Decal"'));
		expect(world.parts[0].textures![0]).toMatchObject({
			asset: 'rbxassetid://101',
			face: 1,
			tile: undefined
		});
	});
	it.each([0, 1, 2, 3, 4, 5])('面%sの法線と三角形の表裏が一致する', face => {
		const part = parseRbxlx(xml).parts[0];
		const geometry = robloxSurfaceGeometry(part, { ...part.textures![0], face }, 0);
		const positions = geometry.getAttribute('position');
		const a = new Vector3().fromBufferAttribute(positions, 0);
		const b = new Vector3().fromBufferAttribute(positions, 1);
		const c = new Vector3().fromBufferAttribute(positions, 2);
		const normal = new Vector3().fromBufferAttribute(geometry.getAttribute('normal'), 0);
		expect(b.sub(a).cross(c.sub(a)).normalize().dot(normal)).toBeCloseTo(1);
	});
	it('同じ画像を1回だけGLBに埋め込み、samplerと透明度を分ける', () => {
		const world = parseRbxlx(xml);
		const part = world.parts[0];
		part.textures!.push({ ...part.textures![0], tile: undefined, face: 5, opacity: 0.5 });
		const bytes = robloxWorldToGlb(world, {
			images: new Map([['rbxassetid://101', { bytes: png, mimeType: 'image/png' }]]),
			meshes: new Map()
		});
		const view = new DataView(bytes);
		const json = JSON.parse(
			new TextDecoder().decode(new Uint8Array(bytes, 20, view.getUint32(12, true)))
		);
		expect(json.images).toHaveLength(1);
		expect(json.images[0].uri).toBeUndefined();
		expect(json.textures.map((t: { sampler: number; }) => t.sampler)).toEqual([1, 0]);
		expect(json.materials[2].pbrMetallicRoughness.baseColorFactor[3]).toBe(0.5);
		for (const buffer of json.bufferViews) expect(buffer.byteOffset % 4).toBe(0);
		const image = json.bufferViews[json.images[0].bufferView];
		expect(
			new Uint8Array(
				bytes,
				28 + view.getUint32(12, true) + image.byteOffset,
				image.byteLength
			)
		).toEqual(png);
	});
	it('同じ画像IDの異なる表記を1回だけ取得する', async () => {
		const world = parseRbxlx(xml);
		world.parts[0].textures!.push({
			...world.parts[0].textures![0],
			asset: 'http://www.roblox.com/asset/?id=101'
		});
		const close = vi.fn();
		vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close })));
		const fetcher = vi.fn(async () => new Response(png));
		const resources = await loadRobloxResources(world, {
			resourceUrl: '/test-resources',
			fetcher
		});
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(resources.images.size).toBe(2);
		expect(new Set(resources.images.values()).size).toBe(1);
		expect(close).toHaveBeenCalledOnce();
	});
	it('画像の401・壊れた画像でも基本形状を保持する', async () => {
		const world = parseRbxlx(xml);
		const fetcher = vi.fn(async () => new Response('', { status: 401 }));
		const resources = await loadRobloxResources(world, { fetcher });
		expect(resources.images.size).toBe(0);
		expect(world.warnings).toContain('素材の取得に認証が必要: 1件');
		expect(() => robloxWorldToGlb(world, resources)).not.toThrow();
		world.warnings = [];
		await loadRobloxResources(world, {
			resourceUrl: '/test-resources',
			fetcher: async () => new Response('<html>test</html>')
		});
		expect(world.warnings).toContain('未対応の画像形式: 1件');
	});
	it('ローカル404の後に配信APIとCDNを使う', async () => {
		vi.stubGlobal('createImageBitmap', async () => ({ close: () => {} }));
		const fetcher = vi.fn(async (url: RequestInfo | URL) => {
			if (String(url).startsWith('/test-resources')) return new Response('', { status: 404 });
			if (String(url).startsWith('/test-proxy')) {
				return Response.json({
					locations: [{ location: 'https://test.rbxcdn.com/test-image' }]
				});
			}
			return new Response(png);
		});
		const resources = await loadRobloxResources(parseRbxlx(xml), {
			fetcher,
			resourceUrl: '/test-resources',
			resolveUrl: url => url.replace('https://assetdelivery.roblox.com', '/test-proxy')
		});
		expect(resources.images.size).toBe(1);
		expect(fetcher).toHaveBeenCalledTimes(3);
	});
	it('合成済みの面は下地を除き、六面とも塗っても空のprimitiveを出さない', () => {
		const world = parseRbxlx(xml);
		const part = world.parts[0];
		part.textures = Array.from(
			{ length: 6 },
			(_, face) => ({ ...part.textures![0], face, baked: true })
		);
		const bytes = robloxWorldToGlb(world, {
			images: new Map([['rbxassetid://101', { bytes: png, mimeType: 'image/png' }]]),
			meshes: new Map()
		});
		const view = new DataView(bytes);
		const json = JSON.parse(
			new TextDecoder().decode(new Uint8Array(bytes, 20, view.getUint32(12, true)))
		);
		expect(json.meshes[0].primitives).toHaveLength(1);
		expect(json.accessors[json.meshes[0].primitives[0].attributes.POSITION].count).toBe(36);
	});
	it('同時取得数を4件以内にし、全画像を取り出す', async () => {
		const world = parseRbxlx(xml);
		world.parts[0].textures = Array.from(
			{ length: 9 },
			(_, i) => ({ ...world.parts[0].textures![0], asset: `rbxassetid://${101 + i}` })
		);
		vi.stubGlobal('createImageBitmap', async () => ({ close: () => {} }));
		let active = 0, max = 0;
		const fetcher = vi.fn(async () => {
			active++;
			max = Math.max(max, active);
			await new Promise(resolve => setTimeout(resolve, 0));
			active--;
			return new Response(png);
		});
		const result = await loadRobloxResources(world, {
			resourceUrl: '/test-resources',
			fetcher
		});
		expect(result.images.size).toBe(9);
		expect(max).toBe(4);
	});
	it('任意URL・パストラバーサルを素材として取得しない', () => {
		for (
			const value of [
				'file:///test',
				'https://test.invalid/image.png',
				'rbxasset://../test.png',
				'rbxasset://textures//test'
			]
		) expect(robloxAssetKey(value)).toBeNull();
		expect(robloxAssetKey('rbxasset://textures/test.png')).toBe('builtin/textures/test.png');
	});
});

describe('MeshPart', () => {
	it.each([2, 3, 4, 5])('FileMesh%sのUVとLOD0を取り出す', major => {
		const mesh = parseRobloxMesh(meshBytes(major));
		expect(Array.from(mesh.indices)).toEqual([0, 1, 2, 0, 2, 3]);
		expect(Array.from(mesh.uvs)).toEqual([0, 1, 1, 1, 1, 0, 0, 0]);
	});
	it('36バイト頂点も読める', () =>
		expect(parseRobloxMesh(meshBytes(2, 36)).positions.length).toBe(12));
	it('サイズ・インデックス・NaN・ボーンを検証する', () => {
		const invalid = meshBytes();
		expect(() => parseRobloxMesh(invalid.slice(0, -1))).toThrow();
		new DataView(invalid.buffer).setUint32(13 + 12 + 160, 99, true);
		expect(() => parseRobloxMesh(invalid)).toThrow();
		const nan = meshBytes();
		new DataView(nan.buffer).setFloat32(25, NaN, true);
		expect(() => parseRobloxMesh(nan)).toThrow();
		const bone = meshBytes(4);
		new DataView(bone.buffer).setUint16(27, 1, true);
		expect(() => parseRobloxMesh(bone)).toThrow(/ボーン/);
	});
	it('MeshIdとSurfaceAppearanceのColorMapを読む', () => {
		const world = parseRbxlx(
			worldXml(
				partXml(
					'<Content name="MeshId"><url>rbxassetid://201</url></Content><Content name="TextureID"><url>rbxassetid://101</url></Content>',
					partXml(
						'<Content name="ColorMap"><url>rbxassetid://102</url></Content>',
						'',
						'SurfaceAppearance'
					),
					'MeshPart'
				)
			)
		);
		expect(world.parts[0]).toMatchObject({
			meshId: 'rbxassetid://201',
			textureId: 'rbxassetid://102'
		});
		expect(() => robloxWorldToGlb(world)).toThrow(/MeshPart/);
		expect(() =>
			robloxWorldToGlb(world, {
				images: new Map(),
				meshes: new Map([['rbxassetid://201', parseRobloxMesh(meshBytes())]])
			})
		).not.toThrow();
	});
});
