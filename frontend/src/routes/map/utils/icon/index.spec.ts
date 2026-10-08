import type { Map as MapLibreMapType } from '$routes/map/utils/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	buildGeneratedPoiIconExpression,
	buildGeneratedPoiIconId,
	resolveMissingStyleImage
} from './index';

vi.mock('$routes/constants', () => ({
	ICON_IMAGE_BASE_PATH: '/test-icons',
	USE_WORKER_GENERATED_POI_ICONS: true
}));
vi.mock('$routes/map/utils/platform/request', () => ({
	resolveRequestUrl: (url: string) => url
}));

describe('写真のないPOIの代替アイコン', () => {
	const dotImage = { width: 16, height: 16, data: new Uint8ClampedArray(16 * 16 * 4) };
	const fetchImage = vi.fn();
	const addImage = vi.fn();
	const map = { hasImage: () => false, addImage } as unknown as MapLibreMapType;

	beforeEach(() => {
		fetchImage.mockReset();
		addImage.mockClear();
		vi.stubGlobal('fetch', fetchImage);
		vi.stubGlobal(
			'OffscreenCanvas',
			class {
				width = 16;
				height = 16;
				getContext = () => ({
					beginPath: vi.fn(),
					arc: vi.fn(),
					fill: vi.fn(),
					stroke: vi.fn(),
					getImageData: () => dotImage
				});
			}
		);
	});

	afterEach(() => vi.unstubAllGlobals());

	it('写真IDなしのスタイルでも、画像を取得せず小さいアイコンを登録する', async () => {
		const expression = buildGeneratedPoiIconExpression({
			type: 'absolute',
			imageIdKey: 'test-id',
			urlKey: 'test-image'
		});
		const fallbackId = (expression as unknown[]).at(-1) as string;
		expect(fallbackId).toBe(buildGeneratedPoiIconId(''));
		await resolveMissingStyleImage(fallbackId, map);
		expect(fetchImage).not.toHaveBeenCalled();
		expect(addImage).toHaveBeenCalledWith(fallbackId, dotImage, { pixelRatio: 1 });
	});

	it('写真が404の場合も、代替画像を取得せず同じ点を登録する', async () => {
		fetchImage.mockResolvedValue({ ok: false });
		const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const id = buildGeneratedPoiIconId('test-missing-photo', '/test-icons/missing.webp');
			await resolveMissingStyleImage(id, map);
			expect(fetchImage).toHaveBeenCalledExactlyOnceWith('/test-icons/missing.webp');
			expect(addImage).toHaveBeenCalledWith(id, dotImage, { pixelRatio: 1 });
		} finally {
			errorLog.mockRestore();
		}
	});
});

describe('元画像のアイコン', () => {
	it('画像表を式へ含め、POI用の吹き出し生成を通さず元画像を登録する', async () => {
		const image = { width: 32, height: 16 };
		const uri = 'data:image/png;base64,dGVzdC1pbWFnZQ==';
		const expression = buildGeneratedPoiIconExpression({
			type: 'absolute',
			urlKey: 'test-url',
			imageIdKey: 'test-id',
			rendering: 'original',
			embeddedImages: { 'test-original': uri }
		});
		expect((expression as unknown[])[0]).toBe('match');
		const id = (expression as unknown[])[3] as string;
		expect(id).toBe(`original_icon:::test-original:::${uri}`);
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['test-image']) })
		);
		vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(image));
		const addImage = vi.fn();
		try {
			await resolveMissingStyleImage(
				id,
				{ hasImage: () => false, addImage } as unknown as MapLibreMapType
			);
			expect(addImage).toHaveBeenCalledExactlyOnceWith(id, image, { pixelRatio: 1 });
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
