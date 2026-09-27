import { expect, it, vi } from 'vitest';

import { buildCadStyle } from '../vector';
import { DEFAULT_VECTOR_POINT_STYLE } from '../vector/_style';
import { testPointConfig, testPointData } from './__fixtures__/point';
import { createGeoJsonPointEntry } from './geojson';
import { createTilePointEntry } from './vector';

vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));

it.each(
	[
		['アップロード', () => buildCadStyle(testPointData, 'Point', [])],
		[
			'GeoJSONファクトリー',
			() => createGeoJsonPointEntry({ ...testPointConfig, format: 'geojson' }).style
		],
		[
			'タイルファクトリー',
			() => createTilePointEntry({ ...testPointConfig, format: 'mvt' }).style
		]
	] as const
)('%sでアウトラインを変更しても、他のポイントと新規作成の初期値はオンのまま', (_name, create) => {
	const first = create();
	const second = create();
	if (first.type !== 'circle' || second.type !== 'circle') throw new Error('test point required');
	expect(first.outline.show).toBe(true);
	first.outline.show = false;
	first.outline.width = 5;
	const next = create();
	if (next.type !== 'circle') throw new Error('test point required');
	expect(second.outline).toEqual({ show: true, color: '#ffffff', width: 2 });
	expect(next.outline).toEqual(second.outline);
	expect(DEFAULT_VECTOR_POINT_STYLE.outline).toEqual(second.outline);
});
