import { REGIONAL_MESH_BOUNDS, REGIONAL_MESH_LEVELS } from '$routes/map/utils/mesh/regional-mesh';
import { pointToTile } from '@mapbox/tilebelt';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import { describe, expect, it } from 'vitest';
import { parseRegionalMeshTileUrl } from './request';
import { createRegionalMeshTile } from './tile';

const [west, south, east, north] = REGIONAL_MESH_BOUNDS;
const center = [(west + east) / 2, (south + north) / 2];

describe('地域メッシュのベクタータイル', () => {
	it.each(REGIONAL_MESH_LEVELS)(
		'レベル$levelの枠線とコード付き中心点をMVTとして読める',
		({ level, minzoom: z }) => {
			const [x, y] = pointToTile(center[0], center[1], z);
			const request = parseRegionalMeshTileUrl(
				`regional_mesh://tile/${level}/${z}/${x}/${y}.pbf`
			);
			const tile = new VectorTile(new Pbf(createRegionalMeshTile(request)));
			const layer = tile.layers.regional_mesh;
			expect(layer.length).toBeGreaterThan(0);
			const features = Array.from(
				{ length: layer.length },
				(_, index) => layer.feature(index)
			);
			expect(
				new Set(features.map(feature => feature.type))
			).toEqual(new Set([1, 2]));
			for (const feature of features) {
				expect(feature.properties.level).toBe(level);
				expect(String(feature.properties.code)).toMatch(
					/^\d{4}(\d{2})?(\d{2})?[1-4]{0,3}$/
				);
			}
		}
	);

	it('対象範囲外のタイルは空になる', () => {
		const data = createRegionalMeshTile({ level: 1, z: 7, x: 0, y: 0 });
		expect(new VectorTile(new Pbf(data)).layers).toEqual({});
	});

	it('低ズームで細分メッシュの全世界生成を要求できない', () => {
		expect(() => parseRegionalMeshTileUrl('regional_mesh://tile/6/0/0/0.pbf')).toThrow();
		expect(() => parseRegionalMeshTileUrl('regional_mesh://tile/1/7/128/0.pbf')).toThrow();
		expect(() => parseRegionalMeshTileUrl('regional_mesh://tile/7/7/0/0.pbf')).toThrow();
	});
});
