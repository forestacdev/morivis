import { describe, expect, it } from 'vitest';

import { generateThumbnail } from './thumbnail';

describe('generateThumbnail', () => {
	it('Uint8 RGB バンドはチャネルごとに再正規化せず元の色を保持する', () => {
		let captured: ImageData | null = null;

		const context = {
			createImageData: (width: number, height: number) => ({
				data: new Uint8ClampedArray(width * height * 4),
				width,
				height
			}),
			putImageData: (imageData: ImageData) => {
				captured = imageData;
			}
		};

		const canvas = {
			width: 0,
			height: 0,
			getContext: () => context,
			toDataURL: () => 'data:image/png;base64,test'
		};

		const originalDocument = globalThis.document;
		globalThis.document = {
			createElement: (tagName: string) => {
				if (tagName === 'canvas') {
					return canvas as unknown as HTMLCanvasElement;
				}
				throw new Error(`unexpected tag: ${tagName}`);
			}
		} as Document;

		try {
			const dataUrl = generateThumbnail({
				bands: [new Uint8Array([220]), new Uint8Array([38]), new Uint8Array([38])],
				width: 1,
				height: 1,
				thumbSize: 1,
				ranges: [
					{ min: 0, max: 220 },
					{ min: 0, max: 38 },
					{ min: 0, max: 38 }
				]
			});

			expect(dataUrl).toBe('data:image/png;base64,test');
			expect(captured).not.toBeNull();
			expect(Array.from(captured!.data)).toEqual([220, 38, 38, 255]);
		} finally {
			globalThis.document = originalDocument;
		}
	});
});
