import { describe, expect, it } from 'vitest';
import { createSourcesItems } from '../../sources';
import type { GeoRefCorners } from '../../transform/georef/homography';
import { createVideoEntry } from '.';

describe('動画エントリー', () => {
	it('四隅と元動画を保持し、video sourceへ変換する', () => {
		const corners: GeoRefCorners = [[0, 2], [2, 3], [3, 1], [1, 0]];
		const entry = createVideoEntry(
			'test-video',
			'blob:test-video',
			[0, 0, 3, 3],
			corners,
			'data:image/png;base64,test'
		);
		expect(entry.format).toEqual({ type: 'video', url: 'blob:test-video' });
		expect(entry.style.type).toBe('basemap');
		expect(entry.metaData.imageCorners).toEqual(corners);
		expect(entry.metaData.imageCorners).not.toBe(corners);
		const sources = createSourcesItems({
			entries: [entry],
			prepared: {},
			mode: 'main',
			baseMap: null
		});
		expect(sources[`${entry.id}_source`]).toEqual({
			type: 'video',
			urls: ['blob:test-video'],
			coordinates: corners
		});
	});
});
