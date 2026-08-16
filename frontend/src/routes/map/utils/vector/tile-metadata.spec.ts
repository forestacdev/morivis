import { describe, expect, it } from 'vitest';

import {
	buildVectorTileFields,
	buildVectorTileTitles,
	mergeVectorTileMetadataLayers
} from './tile-metadata';
import { buildVectorTileColorExpressions } from './tile-style';

describe('mergeVectorTileMetadataLayers', () => {
	it('vector_layers と tilestats を同じレイヤー定義へ統合する', () => {
		const layers = mergeVectorTileMetadataLayers(
			[
				{
					id: 'buildings',
					fields: {
						class: 'String',
						height: 'Number'
					},
					geometry_type: 'Polygon',
					minzoom: 10,
					maxzoom: 16
				}
			],
			[
				{
					layer: 'buildings',
					geometry: 'Polygon',
					attributes: [
						{ attribute: 'class', values: ['residential', 'office'] },
						{ attribute: 'height', type: 'Number', min: 5, max: 80 }
					]
				}
			]
		);

		expect(layers).toHaveLength(1);
		expect(layers[0]).toMatchObject({
			id: 'buildings',
			geometryType: 'Polygon',
			minZoom: 10,
			maxZoom: 16
		});
		expect(layers[0].attributes).toHaveLength(2);
	});
});

describe('vector tile metadata helpers', () => {
	it('fields と titles を自動生成する', () => {
		const fields = buildVectorTileFields({
			name: 'String',
			height: 'Number',
			updated_at: 'DateTime'
		});
		const titles = buildVectorTileTitles(fields, 'fallback');

		expect(fields).toEqual([
			{ key: 'name', type: 'string' },
			{ key: 'height', type: 'number' },
			{ key: 'updated_at', type: 'datetime' }
		]);
		expect(titles).toEqual([{ conditions: ['name'], template: '{name}' }]);
	});

	it('tilestats から match と step の色分け候補を作る', () => {
		const expressions = buildVectorTileColorExpressions({
			id: 'buildings',
			fields: {
				class: 'String',
				height: 'Number'
			},
			attributes: [
				{ attribute: 'class', values: ['residential', 'office', 'school'] },
				{ attribute: 'height', type: 'Number', min: 5, max: 80 }
			]
		});

		expect(expressions).toHaveLength(2);
		expect(expressions[0]).toMatchObject({
			type: 'match',
			key: 'class'
		});
		expect(expressions[1]).toMatchObject({
			type: 'step',
			key: 'height',
			mapping: {
				scheme: 'YlOrRd',
				divisions: 5
			}
		});
	});
});
