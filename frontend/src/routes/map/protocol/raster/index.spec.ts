import { afterEach, describe, expect, it, vi } from 'vitest';

import { demProtocol, terminateDemWorkerPool } from '.';

const { getAdjacentTilesWithImages, postMessage } = vi.hoisted(() => ({
	getAdjacentTilesWithImages: vi.fn(),
	postMessage: vi.fn()
}));

vi.mock('../image', () => ({
	TileImageManager: { getInstance: () => ({ getAdjacentTilesWithImages }) }
}));
vi.mock('$routes/map/utils/style/color-mapping', () => ({
	ColorMapManager: class {
		createColorArray = () => new Uint8Array(4);
	}
}));

afterEach(() => {
	terminateDemWorkerPool();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('陰影起伏図のタイル要求', () => {
	it.each(['image', 'pmtiles'])(
		'%s の隣接タイルと 0° の光源を Worker に渡す',
		async (formatType) => {
			vi.stubGlobal('window', { location: { origin: 'https://test.invalid' } });
			vi.stubGlobal(
				'Worker',
				class {
					listener?: (event: { data: unknown; }) => void;
					addEventListener = (
						type: string,
						listener: (event: { data: unknown; }) => void
					) => {
						if (type === 'message') this.listener = listener;
					};
					postMessage = (message: { tileId: string; }) => {
						postMessage(message);
						queueMicrotask(() =>
							this.listener?.({
								data: { id: message.tileId, buffer: new Uint8Array([1, 2, 3]) }
							})
						);
					};
					terminate = () => {};
				}
			);
			const images = Object.fromEntries(['center', 'left', 'right', 'top', 'bottom']
				.map((side) => [side, { image: { testSide: side } }]));
			getAdjacentTilesWithImages.mockResolvedValue(images);
			const params = new URLSearchParams({
				entryId: 'test-dem',
				formatType,
				demType: 'terrarium',
				mode: 'shadow',
				azimuth: '0',
				altitude: '0',
				x: '1',
				y: '1',
				z: '2',
				tileSize: '512',
				baseUrl: 'https://test.invalid/{z}/{x}/{y}.png'
			});
			const result = await demProtocol('webgl').request({
				url: `webgl://https://test.invalid/tile?${params}`
			}, new AbortController());
			expect(result.data).toEqual(new Uint8Array([1, 2, 3]));
			expect(getAdjacentTilesWithImages).toHaveBeenCalledWith(
				'test-dem',
				1,
				1,
				2,
				'https://test.invalid/{z}/{x}/{y}.png',
				formatType,
				expect.any(AbortController)
			);
			expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
				mode: 'shadow',
				modeNumber: 5,
				demTypeNumber: 2,
				shadow: { azimuth: 0, altitude: 0 },
				tileSize: 512,
				...Object.fromEntries(
					Object.entries(images).map(([side, item]) => [side, item.image])
				)
			}));
		}
	);
});
