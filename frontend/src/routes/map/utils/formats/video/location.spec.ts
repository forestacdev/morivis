import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parseVideoLocation, readVideoLocation } from './location';

const uint32 = (value: number) => {
	const bytes = new Uint8Array(4);
	new DataView(bytes.buffer).setUint32(0, value);
	return bytes;
};
const text = (value: string) => new TextEncoder().encode(value);
const join = (...parts: Uint8Array[]) => new Uint8Array(parts.flatMap(part => [...part]));
const atom = (type: string | number, ...parts: Uint8Array[]) => {
	const payload = join(...parts);
	return join(
		uint32(payload.length + 8),
		typeof type === 'number'
			? uint32(type)
			: new Uint8Array([...type].map(char => char.charCodeAt(0))),
		payload
	);
};
const read = (bytes: Uint8Array) =>
	readVideoLocation(new Blob([bytes as Uint8Array<ArrayBuffer>]), new AbortController().signal);
const legacy = (location = '+01.2500-002.5000+12.5/') =>
	atom('moov', atom('udta', atom('©xyz', new Uint8Array(4), text(location))));

describe('動画の撮影位置', () => {
	it('経度・緯度の順序、符号、標高とゼロ座標を扱う', () => {
		expect(parseVideoLocation('+01.2500-002.5000+12.5/')).toEqual({
			latitude: 1.25,
			longitude: -2.5,
			altitude: 12.5
		});
		expect(parseVideoLocation('+00+000/')).toEqual({ latitude: 0, longitude: 0 });
	});
	it.each(['+91+000/', '+00+181/', '1,2', '+0130+00230/', '+01+002/garbage'])(
		'不正・未対応表記 %s は配置しない',
		value => {
			expect(parseVideoLocation(value)).toBeNull();
		}
	);
	it('legacy ©xyzを読む', async () => {
		expect(await read(legacy())).toEqual({ latitude: 1.25, longitude: -2.5, altitude: 12.5 });
	});
	it.each([true, false])('keys/ilstを索引で解決する (FullBox=%s)', async fullBox => {
		const keys = atom(
			'keys',
			uint32(0),
			uint32(2),
			atom('mdta', text('test-name')),
			atom('mdta', text('com.apple.quicktime.location.ISO6709'))
		);
		const list = atom(
			'ilst',
			atom(1, atom('data', uint32(1), uint32(0), text('+09+009/'))),
			atom(2, atom('data', uint32(1), uint32(0), text('-01+002/')))
		);
		const meta = atom('meta', ...(fullBox ? [uint32(0)] : []), list, keys);
		expect(await read(atom('moov', meta))).toEqual({ latitude: -1, longitude: 2 });
	});
	it('映像データ内のタグを誤認せず、映像本体を読み飛ばす', async () => {
		const file = new Blob([atom('mdat', legacy(), new Uint8Array(100_000)), legacy()]);
		const slice = vi.spyOn(file, 'slice');
		expect(await readVideoLocation(file, new AbortController().signal)).not.toBeNull();
		expect(Math.max(...slice.mock.calls.map(([start = 0, end = 0]) => end - start)))
			.toBeLessThan(100);
	});
	it('64bitサイズと末尾までのサイズを扱う', async () => {
		const size = new Uint8Array(8);
		new DataView(size.buffer).setBigUint64(0, 16n);
		const bytes = legacy();
		bytes.set(uint32(0), 0);
		expect(await read(join(uint32(1), text('free'), size, bytes))).not.toBeNull();
	});
	it('タグなし・破損・過大なメタデータは位置なしとして返す', async () => {
		for (
			const bytes of [
				new Uint8Array(),
				text('test-webm'),
				atom('free'),
				join(uint32(9999), text('moov')),
				atom('moov', atom('meta', atom('keys', new Uint8Array(1024 * 1024)), atom('ilst')))
			]
		) {
			expect(await read(bytes)).toBeNull();
		}
	});
	it('中断を位置なしとして握りつぶさない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(readVideoLocation(new Blob([legacy()]), controller.signal)).rejects
			.toMatchObject({ name: 'AbortError' });
	});
	it('生成したMP4の実際のメタデータを読む', async () => {
		const bytes = readFileSync(new URL('./__fixtures__/test-location.mp4', import.meta.url));
		expect(await read(bytes)).toEqual({ latitude: 1.25, longitude: 2.5, altitude: 12.5 });
	});
});
