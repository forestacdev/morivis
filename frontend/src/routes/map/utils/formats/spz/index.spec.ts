import { gunzipSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { getGaussianSplatRenderBounds, parseGaussianSplat } from '../gaussian-splat';
import { createSyntheticSpz } from './__fixtures__/synthetic-spz';
import { inspectSpzFile, parseSpz } from './index';

const mutateLegacy = async (mutate: (bytes: Uint8Array) => Uint8Array | void) => {
	const bytes = new Uint8Array(gunzipSync(new Uint8Array(await createSyntheticSpz())));
	return new Uint8Array(gzipSync(mutate(bytes) ?? bytes)).buffer;
};

describe('SPZ', () => {
	it.each([1, 2, 3, 4])(
		'v%sの圧縮を展開して色・透明度・大きさ・範囲を読み取る',
		async version => {
			const buffer = await createSyntheticSpz(version, 3);
			expect(await inspectSpzFile(new File([buffer], 'test-splats.spz'))).toEqual({
				kind: 'gaussian-splat',
				splatCount: 2,
				shDegree: 3
			});
			const data = await parseGaussianSplat(buffer, 'spz');
			expect([...data.positions]).toEqual(
				version === 1 ? [1, -2, 3, 4, 5, -6] : [1.25, -2.5, 3, 4, 5, -6.75]
			);
			expect(data.bounds).toEqual(
				version === 1 ? [1, -2, -6, 4, 5, 3] : [1.25, -2.5, -6.75, 4, 5, 3]
			);
			expect([...data.colors]).toEqual([128, 189, 68, 255, 0, 128]);
			expect(data.opacities[0]).toBeCloseTo(64 / 255);
			expect(data.opacities[1]).toBe(1);
			expect(data.scales[0]).toBe(1);
			expect(data.scales[1]).toBeCloseTo(Math.E);
			expect(getGaussianSplatRenderBounds(data.bounds)[1]).toBe(0);
		}
	);
	it('v4のSH0は5ストリームで読み取る', async () => {
		const buffer = await createSyntheticSpz(4);
		expect(new Uint8Array(buffer)[15]).toBe(5);
		expect((await parseSpz(buffer)).positions.length).toBe(6);
	});
	it.each([3, 4])('v%sの座標系拡張をRUBへ揃える', async version => {
		const data = await parseSpz(await createSyntheticSpz(version, 0, 6));
		expect([...data.positions]).toEqual([1.25, 2.5, -3, 4, -5, 6.75]);
		expect(data.bounds).toEqual([1.25, -5, -3, 4, 2.5, 6.75]);
	});
	it('別系列の座標系拡張は公式と同じ順序で軸を変換する', async () => {
		const data = await parseSpz(await createSyntheticSpz(4, 0, 12));
		expect([...data.positions]).toEqual([1.25, 3, 2.5, 4, -6.75, -5]);
	});
	it('未知の拡張は長さに従って読み飛ばす', async () => {
		const buffer = await createSyntheticSpz(4, 0, 6);
		new DataView(buffer).setUint32(32, 0x12340001, true);
		expect((await parseSpz(buffer)).positions[1]).toBe(-2.5);
	});
	it('ヘッダーだけの確認で旧形式の本体まで展開しない', async () => {
		const buffer = await mutateLegacy(bytes => bytes.slice(0, 16));
		expect((await inspectSpzFile(new File([buffer], 'test-header.spz'))).splatCount).toBe(2);
		await expect(parseSpz(buffer)).rejects.toThrow('途中');
	});
	it('不正なファイルと壊れたgzipを拒否する', async () => {
		await expect(parseSpz(new Uint8Array(32).buffer)).rejects.toThrow('SPZファイル');
		await expect(parseSpz(new Uint8Array([31, 139, 0]).buffer)).rejects.toThrow('gzip');
	});
	it.each(
		[
			[4, 99, '未対応'],
			[8, 0, '点数'],
			[8, 0x7fffffff, '途中']
		] as const
	)('不正なヘッダー offset=%s value=%s を拒否する', async (offset, value, message) => {
		const buffer = await mutateLegacy(bytes => {
			new DataView(bytes.buffer).setUint32(offset, value, true);
		});
		await expect(parseSpz(buffer)).rejects.toThrow(message);
	});
	it('v4の途中切れ・展開サイズ偽装・不正ストリーム数を拒否する', async () => {
		const buffer = await createSyntheticSpz(4);
		await expect(parseSpz(buffer.slice(0, -1))).rejects.toThrow('サイズ');
		const wrongSize = buffer.slice(0);
		new DataView(wrongSize).setBigUint64(40, 0xffffffffffn, true);
		await expect(parseSpz(wrongSize)).rejects.toThrow('サイズ');
		const wrongCount = buffer.slice(0);
		new Uint8Array(wrongCount)[15] = 6;
		await expect(parseSpz(wrongCount)).rejects.toThrow('ストリーム一覧');
	});
	it('v4の不正な拡張範囲と座標系を拒否する', async () => {
		const buffer = await createSyntheticSpz(4, 0, 6);
		new DataView(buffer).setUint32(40, 17, true);
		await expect(parseSpz(buffer)).rejects.toThrow('座標系');
		new DataView(buffer).setUint32(36, 100, true);
		await expect(parseSpz(buffer)).rejects.toThrow('拡張データ');
	});
});
