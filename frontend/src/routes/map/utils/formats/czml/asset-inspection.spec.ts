import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parseCzml } from '.';
import { inspectCzmlAssets } from './asset-inspection';
import { mergeCzmlFiles } from './files';
import { createCzmlAssetResolver } from './model-assets';

const fixture = (name: string) =>
	new File([
		readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))
	], name);
const signal = () => new AbortController().signal;

describe('CZMLの関連ファイル事前検査', () => {
	it('CZMLのみ・画像1枚追加・残りの画像追加で不足一覧を更新する', async () => {
		const document = fixture('test-billboards.czml');
		const result = await parseCzml(await document.text());
		const red = fixture('test-billboard-red.png');
		const blue = fixture('test-billboard-blue.png');
		expect(await inspectCzmlAssets(result, document, [document], signal(), 'billboards'))
			.toEqual(['test-billboard-red.png', 'test-billboard-blue.png']);
		expect(await inspectCzmlAssets(result, document, [document, red], signal(), 'billboards'))
			.toEqual(['test-billboard-blue.png']);
		expect(
			await inspectCzmlAssets(result, document, [document, red, blue], signal(), 'billboards')
		)
			.toEqual([]);
	});
	it('追加されたglTFのバッファ・画像もモデルの参照位置から解決する', async () => {
		const document = fixture('test-models.czml');
		const result = await parseCzml(await document.text());
		result.models[0].uri = 'assets/test-model.gltf';
		expect(await inspectCzmlAssets(result, document, [document], signal(), 'models'))
			.toEqual(['assets/test-model.gltf']);
		const json = JSON.parse(await fixture('test-model.gltf').text());
		json.buffers[0].uri = '../buffers/test.bin';
		json.images = [{ uri: '../images/test.png' }];
		const model = new File([JSON.stringify(json)], 'test-model.gltf');
		expect(await inspectCzmlAssets(result, document, [document, model], signal(), 'models'))
			.toEqual(['buffers/test.bin', 'images/test.png']);
		const files = [document, model, new File([''], 'test.bin'), new File([''], 'test.png')];
		expect(await inspectCzmlAssets(result, document, files, signal(), 'models')).toEqual([]);
	});
	it('GLBのJSONチャンクも検査し、不正なチャンク長は拒否する', async () => {
		const document = fixture('test-models.czml');
		const result = await parseCzml(await document.text());
		result.models[0].uri = 'test.glb';
		const text = JSON.stringify({ asset: { version: '2.0' }, images: [{ uri: 'test.png' }] });
		const json = new TextEncoder().encode(text.padEnd(Math.ceil(text.length / 4) * 4, ' '));
		const bytes = new Uint8Array(20 + json.length);
		const view = new DataView(bytes.buffer);
		[0x46546c67, 2, bytes.length, json.length, 0x4e4f534a].forEach((value, index) =>
			view.setUint32(index * 4, value, true)
		);
		bytes.set(json, 20);
		expect(
			await inspectCzmlAssets(
				result,
				document,
				[new File([bytes], 'test.glb')],
				signal(),
				'models'
			)
		).toEqual(['test.png']);
		view.setUint32(12, bytes.length, true);
		await expect(
			inspectCzmlAssets(result, document, [new File([bytes], 'test.glb')], signal(), 'models')
		).rejects.toThrow('JSON長');
	});
	it('URLとdata URIは不足ファイルにせず、事前検査では通信しない', async () => {
		const document = fixture('test-models.czml');
		const result = await parseCzml(await document.text());
		const fetch = vi.spyOn(globalThis, 'fetch');
		try {
			for (const uri of ['https://test.invalid/test.glb', 'data:model/gltf+json,%7B%7D']) {
				result.models[0].uri = uri;
				expect(await inspectCzmlAssets(result, document, [], signal(), 'models')).toEqual(
					[]
				);
			}
			expect(fetch).not.toHaveBeenCalled();
		} finally {
			fetch.mockRestore();
		}
	});
	it('フォルダーの同名画像を正確なパスで選び、追加時には同じパスだけ差し替える', async () => {
		const document = new File(['[]'], 'test.czml');
		const red = fixture('test-billboard-red.png');
		const blue = fixture('test-billboard-blue.png');
		const a = new File([red], 'test.png');
		const b = new File([blue], 'test.png');
		Object.defineProperty(a, 'morivisRelativePath', { value: 'a/test.png' });
		Object.defineProperty(b, 'morivisRelativePath', { value: 'b/test.png' });
		const replacement = new File([blue], 'test.png');
		Object.defineProperty(replacement, 'morivisRelativePath', { value: 'a/test.png' });
		const files = mergeCzmlFiles([document, a, b], [replacement]);
		expect(files).toEqual([document, replacement, b]);
		const resolver = createCzmlAssetResolver(document, files, signal());
		expect(await resolver.read(resolver.resolve('a/test.png'))).toEqual(
			await blue.arrayBuffer()
		);
		await expect(resolver.read(resolver.resolve('test.png'))).rejects.toThrow('同名');
	});
	it('中断された検査はファイルを読み始めない', async () => {
		const document = fixture('test-models.czml');
		const result = await parseCzml(await document.text());
		const controller = new AbortController();
		controller.abort();
		await expect(inspectCzmlAssets(result, document, [], controller.signal, 'models')).rejects
			.toThrow();
	});
});
