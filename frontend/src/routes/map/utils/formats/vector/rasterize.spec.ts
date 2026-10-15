import type { FeatureCollection } from '$routes/map/types/geojson';
import { GeoRefVectorSourceCache } from '$routes/map/utils/cache/georef-vector-source-cache';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { featureCollectionToGeoRefData } from './rasterize';

vi.mock(
	'$routes/map/utils/formats/raster/thumbnail',
	() => ({ generateThumbnail: () => 'data:image/png;base64,test' })
);
afterEach(() => vi.unstubAllGlobals());

describe('位置合わせに渡すベクターの出典', () => {
	it.each(['SVG', 'Shapefile', 'test-provider'])(
		'%sは位置合わせ用画像の生成後も出典を保持する',
		async (attribution) => {
			const context = {
				clearRect: vi.fn(),
				beginPath: vi.fn(),
				arc: vi.fn(),
				fill: vi.fn(),
				stroke: vi.fn(),
				getImageData: () => ({ data: new Uint8ClampedArray(16) })
			};
			vi.stubGlobal('document', {
				createElement: () => ({
					getContext: () => context,
					toBlob: (callback: BlobCallback) => callback(new Blob(['test-preview']))
				})
			});
			const featureCollection: FeatureCollection = {
				type: 'FeatureCollection',
				features: [{
					type: 'Feature',
					properties: {},
					geometry: { type: 'Point', coordinates: [0, 0] }
				}]
			};
			const data = await featureCollectionToGeoRefData({
				featureCollection,
				entryName: 'test-vector',
				attribution,
				width: 2,
				height: 2
			});
			try {
				expect(data.imageFile.name).toBe('test-vector.png');
				expect(data.sourceType).toBe('vector');
				expect(data.vectorAttribution).toBe(attribution);
				expect(GeoRefVectorSourceCache.get(data.entryId)).toBe(featureCollection);
			} finally {
				GeoRefVectorSourceCache.remove(data.entryId);
			}
		}
	);
});
