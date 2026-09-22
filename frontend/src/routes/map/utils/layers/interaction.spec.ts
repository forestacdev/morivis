import { describe, expect, it } from 'vitest';
import { getPoiLayerInteraction } from './interaction';

describe('スタイルのPOI操作定義', () => {
	it('POIとPlanetilerの宣言を読み取る', () => {
		expect(getPoiLayerInteraction({
			'morivis:interaction': { type: 'poi', osmIdEncoding: 'planetiler' }
		})).toEqual({ type: 'poi', osmIdEncoding: 'planetiler' });
	});

	it.each([undefined, null, [], 'test-invalid', {}, { 'morivis:interaction': null }, {
		'morivis:interaction': 'poi'
	}, { 'morivis:interaction': { type: 'test-other' } }])(
		'未定義・不正なmetadataはPOI操作の対象にしない: %j',
		(metadata) => {
			expect(getPoiLayerInteraction(metadata)).toBeNull();
		}
	);

	it.each([undefined, 'test-unsupported', null])(
		'POIでもID形式が未指定・未対応ならOSM取得用の形式を補わない: %s',
		(osmIdEncoding) => {
			expect(getPoiLayerInteraction({
				'morivis:interaction': { type: 'poi', osmIdEncoding }
			})).toEqual({ type: 'poi', osmIdEncoding: undefined });
		}
	);
});
