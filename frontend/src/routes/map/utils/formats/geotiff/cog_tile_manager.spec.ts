import type { GeoTIFF } from 'geotiff';
import proj4 from 'proj4';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sampleTestMesh } from './__fixtures__/test-mesh';
import { CogTileManager } from './cog_tile_manager';
import { fromUrl } from './reader';

vi.mock('./reader', () => ({ fromUrl: vi.fn() }));
vi.mock('$routes/map/utils/platform/request', () => ({ resolveCogProxyUrl: (url: string) => url }));

const entryId = 'test-cog-position';
afterEach(() => {
	CogTileManager.unregister(entryId);
	vi.clearAllMocks();
});

// 位置計算の回帰だけを切り分ける架空画像。読込画素の復号はreader.spec.tsで検証する。
const registerTestImage = async () => {
	const readRasters = vi.fn(async (
		{ width = 20, height = 40 } = {}
	) => [new Float32Array(width * height).fill(7)]);
	const image = {
		getWidth: () => 20,
		getHeight: () => 40,
		getSamplesPerPixel: () => 1,
		getGDALNoData: () => null,
		getBoundingBox: () => [0, 0, 20, 40],
		getGeoKeys: () => ({ GeographicTypeGeoKey: 4326 }),
		getTileWidth: () => 256,
		readRasters
	};
	vi.mocked(fromUrl).mockResolvedValue({
		getImage: async () => image,
		getImageCount: async () => 1
	} as unknown as GeoTIFF);
	await CogTileManager.register(entryId, 'https://test-cog.invalid/test-position.tif');
	readRasters.mockClear();
	return readRasters;
};

describe('COG切り出し画像の配置', () => {
	it('画像より広いviewportでも画像を引き伸ばさず、範囲外を透明にできるUVを返す', async () => {
		await registerTestImage();
		const result = await CogTileManager.readViewport(entryId, [-10, -10, 30, 60], 256, 256);
		expect(result?.triangles).toBeTruthy();
		const triangles = result!.triangles!;
		expect(sampleTestMesh(triangles, 0, 0)[0]).toBeCloseTo(-0.5);
		expect(sampleTestMesh(triangles, 1, 1)[0]).toBeCloseTo(1.5);
		expect(sampleTestMesh(triangles, 0, 0)[1]).toBeCloseTo(-0.5);
		expect(sampleTestMesh(triangles, 1, 1)[1]).toBeCloseTo(1.25);
		const northY = proj4('EPSG:4326', 'EPSG:3857', [0, 60])[1];
		const southY = proj4('EPSG:4326', 'EPSG:3857', [0, -10])[1];
		const pointY = proj4('EPSG:4326', 'EPSG:3857', [10, 20])[1];
		const uv = sampleTestMesh(triangles, 0.5, (northY - pointY) / (northY - southY));
		expect(uv[0]).toBeCloseTo(0.5, 6);
		expect(uv[1]).toBeCloseTo(0.5, 2);
	});

	it('タイルの一部にだけ画像が重なる場合も端まで引き伸ばさない', async () => {
		await registerTestImage();
		const result = await CogTileManager.readTile(entryId, 2, 2, 1);
		expect(result?.triangles).toBeTruthy();
		// このタイルの経度範囲は0〜90度。画像の東端20度より右のUVは1を超える。
		expect(sampleTestMesh(result!.triangles!, 1, 1)[0]).toBeCloseTo(4.5);
	});

	it('画素境界へ丸めた切り出し窓でも位置を保持する', async () => {
		const readRasters = await registerTestImage();
		const result = await CogTileManager.readViewport(entryId, [2.2, 4.4, 17.7, 35.5], 256, 256);
		expect(readRasters).toHaveBeenCalledWith({
			window: [2, 4, 18, 36],
			width: 256,
			height: 256
		});
		expect(sampleTestMesh(result!.triangles!, 0, 0)[0]).toBeCloseTo(0.2 / 16);
		expect(sampleTestMesh(result!.triangles!, 0, 0)[1]).toBeCloseTo(0.5 / 32);
	});

	it('画像と交差しない表示範囲では画素を取得しない', async () => {
		const readRasters = await registerTestImage();
		expect(await CogTileManager.readViewport(entryId, [30, 0, 40, 40], 256, 256)).toBeNull();
		expect(readRasters).not.toHaveBeenCalled();
	});
});

describe('COG登録時のプレビュー取得', () => {
	it.each([1, 2])(
		'画像数%dでも大きな画像の読み込み窓を512画素までに制限する',
		async (imageCount) => {
			const readRasters = vi.fn(async () => [new Float32Array(512 * 512).fill(7)]);
			const image = {
				getWidth: () => 8192,
				getHeight: () => 4096,
				getSamplesPerPixel: () => 1,
				getGDALNoData: () => null,
				getBoundingBox: () => [0, 0, 20, 40],
				getGeoKeys: () => ({ GeographicTypeGeoKey: 4326 }),
				getTileWidth: () => 256,
				readRasters
			};
			const overview = { ...image, getWidth: () => 2048, getHeight: () => 1024 };
			vi.mocked(fromUrl).mockResolvedValue({
				getImage: async (index = 0) => index === 0 ? image : overview,
				getImageCount: async () => imageCount
			} as unknown as GeoTIFF);
			const result = await CogTileManager.register(
				entryId,
				'https://test-cog.invalid/test-preview.tif'
			);
			expect(readRasters).toHaveBeenCalledExactlyOnceWith({
				window: imageCount === 1 ? [3840, 1792, 4352, 2304] : [768, 256, 1280, 768],
				width: 512,
				height: 512
			});
			expect(result.sampleWidth).toBe(512);
			expect(result.sampleHeight).toBe(512);
			expect(result.sampleBands[0]).toHaveLength(512 * 512);
		}
	);
});
