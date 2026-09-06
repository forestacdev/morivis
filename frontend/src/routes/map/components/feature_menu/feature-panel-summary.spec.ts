import { describe, expect, it, vi } from 'vitest';

import type { MorivisLayerEntry } from '$routes/map/data/types';

vi.mock('es-toolkit', () => ({
	delay: () => Promise.resolve()
}));

vi.mock('$routes/map/api/inaturalist', () => ({
	getImageByName: vi.fn().mockResolvedValue(null)
}));

vi.mock('$routes/map/api/wikipedia', () => ({
	getWikipediaArticle: vi.fn().mockResolvedValue(null)
}));

vi.mock('$routes/map/data/forest/timber_species', () => ({
	getTimberSpeciesData: vi.fn().mockReturnValue({
		url: 'https://example.test/timber/test-species',
		distribution: 'test distribution',
		detail: {
			nameEn: 'test species'
		}
	})
}));

import { getLayerFeaturePanelSummary } from './feature-panel-summary';

describe('getLayerFeaturePanelSummary', () => {
	it('モデル部材の関連属性から木材辞書を参照する', async () => {
		const summary = await getLayerFeaturePanelSummary(
			{
				layerId: 'test-model',
				featureId: 'test-feature',
				point: [0, 0],
				properties: {
					_prop_id: 'test-part',
					speciesName: 'test-species'
				},
				modelPart: {
					name: 'test component',
					description: 'test component description'
				}
			},
			[
				{
					id: 'test-model',
					type: 'model',
					metaData: { name: 'test model' },
					properties: {
						attributeView: {
							relations: {
								iNaturalistNameKey: 'speciesName'
							}
						}
					}
				}
			] as unknown as MorivisLayerEntry[]
		);

		expect(summary).toMatchObject({
			title: 'test component',
			subtitle: 'test model',
			description: {
				text: 'test component description',
				source: 'static'
			},
			timberSpecies: {
				url: 'https://example.test/timber/test-species',
				distribution: 'test distribution',
				nameEn: 'test species'
			}
		});
	});

	it('詳細定義がないモデル部材はオブジェクト名をタイトルにする', async () => {
		const summary = await getLayerFeaturePanelSummary(
			{
				layerId: 'test-model',
				featureId: 'test-feature',
				point: [0, 0],
				properties: {
					_prop_id: 'test-unlisted-part',
					オブジェクト名: 'test object'
				}
			},
			[
				{
					id: 'test-model',
					type: 'model',
					metaData: { name: 'test model' }
				}
			] as unknown as MorivisLayerEntry[]
		);

		expect(summary).toMatchObject({
			title: 'test object',
			subtitle: 'test model'
		});
	});
});
