import type { MorivisLayerEntry } from '$routes/map/data/types';
import { describe, expect, it } from 'vitest';
import { createLayersItems } from '../layers';
import { createSourcesItems } from '../sources';
import { createVoxelSpec, type GeoZarrVoxelEntry, isGeoZarrVoxelEntry } from './spec';
const entry = (): GeoZarrVoxelEntry => ({
	id: 'test-voxels',
	type: 'raster',
	format: { type: 'geozarr', url: 'https://example.test/test.zarr', arrayPath: 'detail' },
	metaData: {
		name: 'test-voxels',
		bounds: [-40, 40, 40, 60],
		minZoom: 0,
		maxZoom: 24,
		tileSize: 256,
		attribution: 'GeoZarr'
	},
	interaction: { clickable: false },
	style: {
		type: 'tiff',
		visible: true,
		opacity: 1,
		volume: { type: 'voxel', threshold: 0.5, heightScale: 2 },
		visualization: {
			mode: 'single',
			uniformsData: {
				single: { index: 0, min: 0, max: 8, colorMap: 'jet' },
				multi: { r: { index: 0 }, g: { index: 0 }, b: { index: 0 } }
			}
		}
	}
} as GeoZarrVoxelEntry);

describe('Zarrボクセルの描画仕様', () => {
	it('entryの表示設定を独立した仕様へ変換する', () => {
		const value = entry(), spec = createVoxelSpec(value);
		expect(isGeoZarrVoxelEntry(value)).toBe(true);
		expect(spec).toMatchObject({
			threshold: 0.5,
			heightScale: 2,
			colorMap: 'jet',
			min: 0,
			max: 8
		});
		value.style.volume!.threshold = 2;
		expect(spec.threshold).toBe(0.5);
	});
	it('ボクセル用entryには2Dラスターを重ねず、通常のZarrは従来通り生成する', () => {
		const value = entry();
		const sources = () =>
			createSourcesItems({ entries: [value], prepared: {}, mode: 'main', baseMap: null });
		const layers = () =>
			createLayersItems({
				entries: [value as MorivisLayerEntry],
				mode: 'main',
				baseMap: null,
				showHillshade: false,
				showStreetView: false
			});
		expect(sources()['test-voxels_source']).toBeUndefined();
		expect(layers().layers.some(l => l.id === 'test-voxels')).toBe(false);
		delete value.style.volume;
		expect(isGeoZarrVoxelEntry(value)).toBe(false);
		expect(sources()['test-voxels_source']).toBeDefined();
		expect(layers().layers.some(l => l.id === 'test-voxels')).toBe(true);
	});
});
