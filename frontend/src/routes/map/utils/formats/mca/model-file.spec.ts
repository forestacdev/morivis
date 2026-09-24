import { createGlbEntry } from '$routes/map/data/entries/model';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { getModelUnitMeters, normalizeModelUnitMeters } from '$routes/map/utils/three/model-scale';
import { getUploadedModelSourceUnit } from '$routes/map/utils/three/model-source-unit';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { mcaToGlb } from '.';
import { regionFixture } from './__fixtures__/region';
import { createMcaModelFile } from './model-file';

describe('Minecraftモデルの単位継承', () => {
	it('MCAから変換したファイルを介してentryへブロック単位を保持する', async () => {
		const result = await mcaToGlb(regionFixture(), { region: { x: 0, z: 0 } });
		const file = createMcaModelFile(result.glb, 'r.0.0.MCA');
		expect(file.name).toBe('r.0.0.glb');
		expect(file.morivisMinecraftRegion).toEqual({ x: 0, z: 0 });
		expect('morivisModelPlacement' in file).toBe(false);
		expect(file.type).toBe('model/gltf-binary');
		expect(await file.arrayBuffer()).toEqual(result.glb);
		const entry = createGlbEntry(
			'test-region',
			'blob:test-region',
			{ lng: 0, lat: 0, altitude: 0 },
			'gltf',
			undefined,
			undefined,
			{
				sourceUnit: getUploadedModelSourceUnit(file)
			}
		);
		expect(entry.format.sourceUnit).toBe('minecraft-block');
		expect(getModelUnitMeters(entry.style.transform)).toBe(1);
		expect(JSON.parse(JSON.stringify(entry)).format.sourceUnit).toBe('minecraft-block');
	});

	it.each([0.1, 1, 10])('1ブロック=%smで10ブロックの地図上の長さが一致する', (meters) => {
		const entry = createGlbEntry('test-region', 'blob:test-region', {
			lng: 0,
			lat: 0,
			altitude: 0,
			baseScale: 5
		});
		Object.assign(
			entry.style.transform,
			normalizeModelUnitMeters(meters, entry.style.transform.baseScale)
		);
		const matrix = buildMercatorModelMatrix(entry.style.transform, false);
		const start = new Vector3(0, 0, 0).applyMatrix4(matrix);
		const end = new Vector3(10, 0, 0).applyMatrix4(matrix);
		const actualMeters = end.distanceTo(start) * 40075016.68557849;
		expect(actualMeters).toBeCloseTo(10 * meters, 6);
	});

	it('通常のGLBをファイル名だけでMinecraftとして扱わない', () => {
		const file = new File([], 'r.0.0.glb');
		expect(getUploadedModelSourceUnit(file)).toBeUndefined();
		const entry = createGlbEntry('test-model', 'blob:test-model', {
			lng: 0,
			lat: 0,
			altitude: 0
		});
		expect(entry.format.sourceUnit).toBeUndefined();
	});
});
