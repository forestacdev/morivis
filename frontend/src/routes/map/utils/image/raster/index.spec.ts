import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DemRasterEntry, DemStyleMode } from '$routes/map/data/types/raster';
import { generateDemCoverImage } from '.';

const { listeners, postMessage } = vi.hoisted(() => ({
	listeners: new Set<(event: { data: unknown; }) => void>(),
	postMessage: vi.fn()
}));

vi.mock('$routes/constants', () => ({ IMAGE_TILE_XYZ: { x: 1, y: 1, z: 2 } }));
vi.mock('$routes/map/utils/sources', () => ({ convertTmsToXyz: (url: string) => url }));
vi.mock('$routes/map/utils/raster/tile-query', () => ({ getImagePmtiles: vi.fn() }));
vi.mock('$routes/map/utils/platform/request', () => ({ resolveRequestUrl: (url: string) => url }));
vi.mock('$routes/map/utils/image', () => ({
	TileProxy: { toProxyUrl: (url: string) => url },
	CoverImageManager: {}
}));
vi.mock('pmtiles', () => ({
	PMTiles: class {
		getZxy = async () => ({ data: new Uint8Array([1, 2, 3]) });
	}
}));

const createEntry = (mode: DemStyleMode): DemRasterEntry => ({
	id: 'test-dem-preview',
	type: 'raster',
	format: { type: 'pmtiles', url: 'https://test.invalid/dem.pmtiles' },
	metaData: {
		name: 'test-dem',
		attribution: 'test',
		location: 'その他',
		tags: [],
		tileSize: 256,
		bounds: [0, 0, 1, 1],
		xyzImageTile: { x: 1, y: 1, z: 2 },
		minZoom: 0,
		maxZoom: 2
	},
	interaction: { clickable: false },
	style: {
		type: 'dem',
		opacity: 1,
		visible: true,
		visualization: {
			demType: 'terrarium',
			mode,
			uniformsData: {
				relief: { type: 'linear', colorMap: 'bone', min: 0, max: 100 },
				slope: { type: 'linear', colorMap: 'bone', min: 0, max: 90 },
				// $state に由来する設定と同様、Proxy 自体は structured clone できない。
				shadow: new Proxy({ azimuth: 270, altitude: 0 }, {})
			}
		}
	}
});

beforeEach(() => {
	postMessage.mockImplementation((message: { tileId: string; }) => {
		// 実際の Worker と同じく、複製不能なペイロードは同期的に例外になる。
		structuredClone(message);
		queueMicrotask(() => {
			for (const listener of listeners) {
				listener({ data: { id: message.tileId, blob: new Blob(['test-image']) } });
			}
		});
	});
	vi.stubGlobal(
		'Worker',
		class {
			postMessage = postMessage;
			addEventListener = (_type: string, listener: (event: { data: unknown; }) => void) => {
				listeners.add(listener);
			};
			removeEventListener = (
				_type: string,
				listener: (event: { data: unknown; }) => void
			) => {
				listeners.delete(listener);
			};
		}
	);
	vi.stubGlobal('ImageData', class {});
	vi.stubGlobal('createImageBitmap', async () => ({ width: 1, height: 1 }));
});

afterEach(() => {
	listeners.clear();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe('DEM プレビューの Worker 送信', () => {
	it.each<DemStyleMode>(['shadow', 'slope', 'aspect', 'curvature'])(
		'%s は Proxy の陰影設定があっても生成できる',
		async (mode) => {
			const url = await generateDemCoverImage('none', createEntry(mode));
			try {
				expect(url).toMatch(/^blob:/);
				expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
					mode,
					shadow: mode === 'shadow' ? { azimuth: 270, altitude: 0 } : undefined
				}));
				expect(listeners.size).toBe(0);
			} finally {
				URL.revokeObjectURL(url);
			}
		}
	);

	it('送信が同期的に失敗した場合も応答リスナーを解放する', async () => {
		postMessage.mockImplementationOnce(() => {
			throw new DOMException('test-clone-failure', 'DataCloneError');
		});
		await expect(generateDemCoverImage('none', createEntry('shadow')))
			.rejects.toMatchObject({ name: 'DataCloneError' });
		expect(listeners.size).toBe(0);
	});
});
