import { describe, expect, it } from 'vitest';
import {
	getRenderableAssets,
	getThumbnailUrl,
	normalizeStacUrl,
	type StacItem
} from '.';

const sampleItem: StacItem = {
	id: 'sample-item',
	type: 'Feature',
	bbox: [139, 35, 140, 36],
	geometry: {
		type: 'Polygon',
		coordinates: [[[139, 35], [140, 35], [140, 36], [139, 36], [139, 35]]]
	},
	properties: {
		datetime: '2024-01-02T03:04:05Z'
	},
	assets: {
		visual: {
			href: 'https://example.com/visual.tif',
			type: 'image/tiff; application=geotiff; profile=cloud-optimized'
		},
		zarr: {
			href: 'https://example.com/data.zarr',
			type: 'application/vnd+zarr'
		},
		thumbnail: {
			href: 'https://example.com/thumb.jpg',
			roles: ['thumbnail']
		}
	}
};

describe('stac utils', () => {
	it('Copernicus browser URL を STAC endpoint に正規化できる', () => {
		expect(normalizeStacUrl('https://api.explorer.eopf.copernicus.eu/')).toBe(
			'https://api.explorer.eopf.copernicus.eu/stac'
		);
		expect(
			normalizeStacUrl(
				'https://api.explorer.eopf.copernicus.eu/browser/external/example.com/catalog.json?.language=en'
			)
		).toBe('https://example.com/catalog.json');
	});

	it('描画可能アセットとサムネイルを抽出できる', () => {
		const assets = getRenderableAssets(sampleItem);

		expect(assets).toEqual([
			{
				key: 'visual',
				asset: sampleItem.assets.visual,
				type: 'cog'
			},
			{
				key: 'zarr',
				asset: sampleItem.assets.zarr,
				type: 'geozarr'
			}
		]);
		expect(getThumbnailUrl(sampleItem)).toBe('https://example.com/thumb.jpg');
	});
});
