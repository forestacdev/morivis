import { DEFAULT_DEM_SHADOW_STYLE } from '$routes/map/data/types/raster';
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

describe('DEM のタイル要求', () => {
	it.each(['image', 'pmtiles'].flatMap((formatType) => [
		...['default', 'opaque', 'transparent'].map((colors) => ({
			formatType,
			mode: 'shadow',
			slopeAutoRange: undefined,
			colors
		})),
		{ formatType, mode: 'slope', slopeAutoRange: 'true', colors: 'default' },
		{ formatType, mode: 'slope', slopeAutoRange: 'false', colors: 'default' },
		{ formatType, mode: 'slope', slopeAutoRange: undefined, colors: 'default' }
	]))(
		'$formatType $mode 配色=$colors 自動補正=$slopeAutoRange の隣接タイルと設定を Worker に渡す',
		async ({ formatType, mode, slopeAutoRange, colors }) => {
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
				mode,
				azimuth: '0',
				altitude: '0',
				x: '1',
				y: '1',
				z: '2',
				tileSize: '512',
				baseUrl: 'https://test.invalid/{z}/{x}/{y}.png'
			});
			if (colors !== 'default') {
				params.set('shadowColor', '#336699');
				params.set('baseColor', '#ffcc00');
				params.set('baseTransparent', String(colors === 'transparent'));
			}
			if (slopeAutoRange !== undefined) params.set('slopeAutoRange', slopeAutoRange);
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
				mode,
				modeNumber: mode === 'shadow' ? 5 : 2,
				slopeAutoRange: slopeAutoRange === 'true',
				min: 0,
				max: 90,
				tile: { x: 1, y: 1, z: 2 },
				demTypeNumber: 2,
				shadow: mode === 'shadow'
					? {
						...DEFAULT_DEM_SHADOW_STYLE,
						azimuth: 0,
						altitude: 0,
						...(colors === 'default'
							? {}
							: {
								shadowColor: '#336699',
								baseColor: '#ffcc00',
								baseTransparent: colors === 'transparent'
							})
					}
					: undefined,
				tileSize: 512,
				...Object.fromEntries(
					Object.entries(images).map(([side, item]) => [side, item.image])
				)
			}));
		}
	);
});
