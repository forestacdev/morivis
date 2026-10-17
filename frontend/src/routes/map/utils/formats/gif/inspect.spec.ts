import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inspectGif } from './inspect';

const fixture = new Uint8Array(
	readFileSync(new URL('./__fixtures__/test-animation.gif', import.meta.url))
);

describe('GIFの事前検査', () => {
	it('透明な背景と可変間隔を持つ3フレームのGIFを受け付ける', () => {
		expect(inspectGif(fixture)).toEqual({ width: 65, height: 49, frames: 3 });
	});
	it('不正なヘッダー、途中で切れた画像、フレームのないGIFを拒否する', () => {
		for (
			const bytes of [
				new Uint8Array(13),
				fixture.slice(0, -1),
				new Uint8Array([...fixture.slice(0, 25), 0x3b])
			]
		) {
			expect(() => inspectGif(bytes)).toThrow('不正');
		}
	});
	it('極端に大きな画像を復号前に拒否する', () => {
		const bytes = fixture.slice();
		bytes[6] = 1;
		bytes[7] = 16;
		expect(() => inspectGif(bytes)).toThrow('4096');
	});
});
