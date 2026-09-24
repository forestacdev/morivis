import type { MapGeoJSONFeature, StyleImage } from '$routes/map/utils/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPoiIconMarker } from './poi-marker';
import { POI_HIGHLIGHT_SCALE } from './poi-marker-image';

const createFeature = (iconImage: unknown = { name: 'test-icon', available: true }) =>
	({
		id: 12,
		geometry: { type: 'Point', coordinates: [1, 2] },
		properties: { class: 'test-category' },
		layer: {
			id: 'test-layer',
			type: 'symbol',
			source: 'test-source',
			layout: {
				'icon-image': iconImage,
				'icon-size': 0.5,
				'icon-anchor': 'bottom',
				'icon-offset': [2, -4],
				'icon-rotate': 30
			}
		}
	}) as unknown as MapGeoJSONFeature;

describe('POI画像のマーカー化', () => {
	const context = {
		putImageData: vi.fn(),
		fillRect: vi.fn(),
		fillStyle: '',
		globalCompositeOperation: ''
	};
	const canvas = {
		width: 0,
		height: 0,
		getContext: () => context,
		toDataURL: () => 'data:image/png;base64,test'
	};
	const image = {
		data: { width: 4, height: 2, data: new Uint8Array(4 * 2 * 4).fill(255) },
		pixelRatio: 2,
		sdf: false
	} as StyleImage;
	const getImage = vi.fn();

	beforeEach(() => {
		getImage.mockReset().mockReturnValue(image);
		context.putImageData.mockClear();
		context.fillRect.mockClear();
		vi.stubGlobal('devicePixelRatio', 1);
		vi.stubGlobal('document', { createElement: () => canvas });
		vi.stubGlobal(
			'ImageData',
			class {
				constructor(
					public data: Uint8ClampedArray,
					public width: number,
					public height: number
				) {}
			}
		);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('評価済みの画像名を使い、pixelRatioとicon-sizeから表示サイズを決める', () => {
		const feature = createFeature();
		const original = structuredClone(feature);
		const result = createPoiIconMarker({ getImage }, feature);
		expect(getImage).toHaveBeenCalledWith('test-icon');
		expect(result).toEqual({
			iconImage: 'data:image/png;base64,test',
			iconMarker: {
				width: 1,
				height: 0.5,
				anchor: 'bottom',
				offset: [1, -2],
				rotation: 30,
				rotationAlignment: 'viewport',
				pitchAlignment: 'viewport',
				opacity: 1
			}
		});
		expect(context.putImageData).toHaveBeenCalledOnce();
		expect(feature).toEqual(original);
	});

	it.each([1, 2, 3])('SDFはDPR %s と拡大率に合わせて生成し、表示寸法と色を維持する', (dpr) => {
		vi.stubGlobal('devicePixelRatio', dpr);
		getImage.mockReturnValue({
			data: { width: 20, height: 16, data: new Uint8Array(20 * 16 * 4).fill(255) },
			pixelRatio: 2,
			sdf: true
		});
		const feature = createFeature();
		feature.layer.paint = { 'icon-color': '#123456' };
		const result = createPoiIconMarker({ getImage }, feature);
		const width = Math.ceil(5 * POI_HIGHLIGHT_SCALE * dpr);
		const height = Math.ceil(4 * POI_HIGHLIGHT_SCALE * dpr);
		expect(canvas.width).toBe(width);
		expect(canvas.height).toBe(height);
		expect(context.putImageData.mock.calls[0][0]).toMatchObject({ width, height });
		expect(result?.iconMarker).toMatchObject({ width: 5, height: 4, offset: [1, -2] });
		expect(context.fillStyle).toBe('#123456');
		expect(context.fillRect).toHaveBeenCalledWith(0, 0, width, height);
	});

	it('通常の画像はRetinaでも元の画素を保持する', () => {
		vi.stubGlobal('devicePixelRatio', 3);
		createPoiIconMarker({ getImage }, createFeature());
		expect(canvas.width).toBe(4);
		expect(canvas.height).toBe(2);
		expect(context.putImageData.mock.calls[0][0].data).toEqual(
			new Uint8ClampedArray(image.data.data)
		);
		expect(context.fillRect).not.toHaveBeenCalled();
	});

	it('文字列の画像名に含まれる属性トークンを解決する', () => {
		createPoiIconMarker({ getImage }, createFeature('{class}-icon'));
		expect(getImage).toHaveBeenCalledWith('test-category-icon');
	});

	it('登録画像がなければ代替マーカーに戻せる', () => {
		getImage.mockReturnValue(undefined);
		expect(createPoiIconMarker({ getImage }, createFeature())).toBeNull();
	});

	it('アイコンのないラベルは画像を生成しない', () => {
		expect(createPoiIconMarker({ getImage }, createFeature(''))).toBeNull();
		expect(getImage).not.toHaveBeenCalled();
	});
});
