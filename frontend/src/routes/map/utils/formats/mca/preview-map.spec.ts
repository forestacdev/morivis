import { expect, it } from 'vitest';
import {
	indexPreviewRegions,
	MCA_PREVIEW_ZOOM,
	previewLngLat,
	previewMapStyle,
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

it('選択を解除しても、区画の中心に元のファイル名を表示する', () => {
	const anchor = { x: 3, z: -4 };
	const file = new File([], 'r.-1.2.MCA');
	const regions = indexPreviewRegions([file], anchor);
	const { x, y } = previewTile({ x: -1, z: 2 }, anchor);
	const style = previewMapStyle('test', regions, anchor, [file]);
	expect(style.sources.regionLabels).toMatchObject({
		data: {
			features: [{
				properties: { name: file.name },
				geometry: { type: 'Point', coordinates: previewLngLat(x + 0.5, y + 0.5) }
			}]
		}
	});
	expect(style.layers).toContainEqual(expect.objectContaining({
		type: 'symbol',
		source: 'regionLabels',
		layout: expect.objectContaining({ 'text-field': ['get', 'name'] })
	}));
});
