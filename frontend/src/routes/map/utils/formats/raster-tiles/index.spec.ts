import {
	registerLocalRasterTiles,
	releaseLocalRasterTileEntry,
	requestLocalRasterTile,
	retainLocalRasterTileEntry
} from '$routes/map/protocol/raster/local-tiles';
import { inflateSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectLocalRasterTiles, isLocalRasterTileFolder } from './index';

const fileAt = (path: string, data = 'test-image') => {
	const file = new File([data], path.split('/').at(-1)!);
	Object.defineProperty(file, 'morivisRelativePath', { value: path });
	return file;
};
const metadata = (extra = {}) =>
	fileAt('test-set/tilejson.json', JSON.stringify({ tilejson: '3.0.0', ...extra }));
const bitmapClose = vi.fn();
const disposers: (() => void)[] = [];
beforeEach(() => {
	vi.stubGlobal(
		'createImageBitmap',
		vi.fn().mockResolvedValue({ width: 256, height: 256, close: bitmapClose })
	);
});
afterEach(() => {
	disposers.splice(0).forEach(dispose => dispose());
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	bitmapClose.mockClear();
});
const register = async (files: File[], scheme?: 'xyz' | 'tms') => {
	const source = await inspectLocalRasterTiles(files, scheme);
	const runtime = registerLocalRasterTiles(source);
	disposers.push(runtime.dispose);
	return { source, ...runtime };
};
const request = (url: string, key = '2/1/1', controller = new AbortController()) =>
	requestLocalRasterTile({ url: url.replace('{z}/{x}/{y}', key) }, controller);

describe('ローカルラスタータイル', () => {
	it('表示範囲・ズームをTileJSONと階層から取得し、画像を1枚だけ確認する', async () => {
		const source = await inspectLocalRasterTiles([
			metadata({ name: 'test-raster', bounds: [-20, -10, 20, 10] }),
			fileAt('test-set/2/1/1.png'),
			fileAt('test-set/3/2/2.png')
		]);
		expect(source.name).toBe('test-raster');
		expect(source.bounds).toEqual([-20, -10, 20, 10]);
		expect([source.minZoom, source.maxZoom, source.tileSize]).toEqual([2, 3, 256]);
		expect(createImageBitmap).toHaveBeenCalledOnce();
		expect(bitmapClose).toHaveBeenCalledOnce();
	});
	it.each(['png', 'jpg', 'jpeg', 'webp'])(
		'TileJSONなしの%sフォルダを受け取る',
		async extension => {
			const source = await inspectLocalRasterTiles([fileAt(`test-set/0/0/0.${extension}`)]);
			expect(source.bounds[0]).toBe(-180);
			expect(source.bounds[2]).toBe(180);
		}
	);
	it('512pxの画像サイズを認識する', async () => {
		vi.mocked(createImageBitmap).mockResolvedValue(
			{ width: 512, height: 512, close: bitmapClose } as unknown as ImageBitmap
		);
		expect((await inspectLocalRasterTiles([fileAt('test-set/2/1/1.png')])).tileSize).toBe(512);
	});
	it('TMSをXYZのキーに変換し、明示したXYZ指定を優先する', async () => {
		const files = [metadata({ scheme: 'tms' }), fileAt('test-set/2/1/1.png')];
		expect((await inspectLocalRasterTiles(files)).tiles.has('2/1/2')).toBe(true);
		expect((await inspectLocalRasterTiles(files, 'xyz')).tiles.has('2/1/1')).toBe(true);
	});
	it('表示を要求したタイルだけをFileから読み出す', async () => {
		const first = fileAt('test-set/2/1/1.png');
		const later = fileAt('test-set/3/2/2.webp');
		const readFirst = vi.spyOn(first, 'arrayBuffer'),
			readLater = vi.spyOn(later, 'arrayBuffer');
		const { url } = await register([first, later]);
		expect(readFirst).not.toHaveBeenCalled();
		expect(readLater).not.toHaveBeenCalled();
		expect(new TextDecoder().decode((await request(url, '3/2/2')).data)).toBe('test-image');
		expect(readLater).toHaveBeenCalledOnce();
		expect(readFirst).not.toHaveBeenCalled();
	});
	it('欠けた座標には通信せず透明なPNGを返す', async () => {
		const { url } = await register([fileAt('test-set/2/1/1.png')]);
		const fetch = vi.spyOn(globalThis, 'fetch');
		const bytes = Buffer.from((await request(url, '2/0/0')).data);
		expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		expect(bytes.readUInt32BE(16)).toBe(1);
		expect(bytes.readUInt32BE(20)).toBe(1);
		const idatLength = bytes.readUInt32BE(33);
		expect([...inflateSync(bytes.subarray(41, 41 + idatLength))]).toEqual([0, 0, 0, 0, 0]);
		expect(fetch).not.toHaveBeenCalled();
	});
	it('コピーが残る間は保持し、最後の削除で解放する', async () => {
		const { url } = await register([fileAt('test-set/2/1/1.png')]);
		retainLocalRasterTileEntry('test-original', url);
		retainLocalRasterTileEntry('test-copy', url);
		releaseLocalRasterTileEntry('test-original');
		expect((await request(url)).data.byteLength).toBeGreaterThan(0);
		releaseLocalRasterTileEntry('test-copy');
		await expect(request(url)).rejects.toThrow('もう一度');
	});
	it('読み込み中に中止されたタイルを描画へ返さない', async () => {
		const file = fileAt('test-set/2/1/1.png');
		const { url } = await register([file]);
		const controller = new AbortController();
		vi.spyOn(file, 'arrayBuffer').mockImplementation(async () => {
			controller.abort();
			return new ArrayBuffer(0);
		});
		await expect(request(url, '2/1/1', controller)).rejects.toThrow();
	});
	it('通常の写真・モデルテクスチャ一式をタイルと誤認しない', () => {
		expect(isLocalRasterTileFolder([fileAt('photos/test.jpg')])).toBe(false);
		expect(
			isLocalRasterTileFolder([fileAt('test-set/2/1/1.png'), fileAt('test-set/test.gltf')])
		).toBe(false);
	});
	it('位置不明、重複、壊れた画像、非正方形を拒否する', async () => {
		await expect(inspectLocalRasterTiles([fileAt('1.png')])).rejects.toThrow('階層');
		await expect(
			inspectLocalRasterTiles([fileAt('test-set/2/1/1.png'), fileAt('test-set/2/1/1.jpg')])
		).rejects.toThrow('重複');
		vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('test-decode-error'));
		await expect(inspectLocalRasterTiles([fileAt('test-set/2/1/1.png')])).rejects.toThrow(
			'読み取れません'
		);
		vi.mocked(createImageBitmap).mockResolvedValue(
			{ width: 256, height: 128, close: bitmapClose } as unknown as ImageBitmap
		);
		await expect(inspectLocalRasterTiles([fileAt('test-set/2/1/1.png')])).rejects.toThrow(
			'256×256'
		);
		expect(bitmapClose).toHaveBeenCalledOnce();
	});
});
