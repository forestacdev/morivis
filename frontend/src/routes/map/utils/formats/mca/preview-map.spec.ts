import { expect, it } from 'vitest';
import {
	indexPreviewRegions,
	MCA_PREVIEW_ZOOM,
	previewLngLat,
	previewRegion,
	previewTile
} from './preview-map';

it('基準タイルから東は+X、南は+Zで、負座標の区画もクリックで復元できる', () => {
	const anchor = { x: -1000000, z: 1000000 };
	const region = { x: anchor.x + 1, z: anchor.z - 2 };
	const middle = 2 ** (MCA_PREVIEW_ZOOM - 1);
	const tile = previewTile(region, anchor);
	expect(tile).toEqual({ x: middle + 1, y: middle - 2 });
	const lngLat = previewLngLat(tile.x + 0.5, tile.y + 0.5);
	expect(previewRegion(...lngLat, anchor)).toEqual(region);
	const files = ['r.-999999.999998.mca', 'r.-999999.999998.MCA', 'test-invalid.mca'].map(name =>
		new File([], name)
	);
	expect([...indexPreviewRegions(files, anchor).values()]).toEqual([{
		...tile,
		files: files.slice(0, 2)
	}]);
});
