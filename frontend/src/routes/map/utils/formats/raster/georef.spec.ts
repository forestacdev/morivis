import { describe, expect, it, vi } from 'vitest';
import { createRasterGeoRefData } from './georef';

vi.mock('./thumbnail', () => ({ generateThumbnail: () => 'data:image/png;base64,test' }));

const input = {
	entryId: 'test-raster',
	entryName: 'test-raster',
	parsedBands: [new Float32Array([0, 1, 2, 3])],
	parsedNodata: null,
	dataRanges: [{ min: 0, max: 3 }],
	imageWidth: 2,
	imageHeight: 2,
	imageFile: new File([], 'test-converted.png')
};

describe('位置合わせに渡すラスターの出典', () => {
	it.each(['PDF', 'ASCII Grid', 'ENVI／ESRI BIL', 'JPEG2000／GeoJP2', 'LandXML'])(
		'%sは表示用のPNGやGeoTIFFに置き換わらない',
		(attribution) => {
			const data = createRasterGeoRefData({
				...input,
				attribution,
				registrationMode: 'raster'
			});
			expect(data.rasterConfig?.attribution).toBe(attribution);
			// 位置合わせ中にメッシュ表示へ変更しても元の出典を使う。
			expect(data.meshConfig?.attribution).toBe(attribution);
		}
	);

	it('メッシュの設定と専用の出典を保持し、ラスターには元の出典を使う', () => {
		const meshConfig = { attribution: 'NetCDF 3D Mesh', heightScale: 2, opacity: 0.7 } as const;
		const data = createRasterGeoRefData({
			...input,
			attribution: 'NetCDF',
			registrationMode: 'mesh',
			meshConfig
		});
		expect(data.meshConfig).toEqual(meshConfig);
		expect(data.rasterConfig?.attribution).toBe('NetCDF');
	});
});
