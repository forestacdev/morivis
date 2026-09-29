import { MercatorCoordinate } from '$routes/map/utils/maplibre';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { getModelViewAxisRotationX } from '$routes/map/utils/three/model-axis';
import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testTerrain } from './__fixtures__/test-terrain';

const captured = vi.hoisted(() => ({ geometry: null as THREE.BufferGeometry | null }));
// ブラウザのFileReaderを使うシリアライズのみ置き換え、実際の頂点・法線を検証する。
vi.mock('three/addons/exporters/GLTFExporter.js', () => ({
	GLTFExporter: class {
		parse = (mesh: THREE.Mesh, resolve: (result: ArrayBuffer) => void) => {
			captured.geometry = mesh.geometry.clone();
			resolve(new ArrayBuffer(0));
		};
	}
}));
vi.mock('./mesh.worker?worker', () => ({ default: class {} }));
vi.mock('$routes/map/utils/worker/run-single-shot', () => ({
	runSingleShotWorker: async (
		_worker: unknown,
		params: Parameters<typeof buildRasterMeshGeometry>[0]
	) => buildRasterMeshGeometry(params)
}));

import { buildRasterMeshGeometry, createRasterMeshEntry } from './mesh';
import { createRasterMeshEntryInWorker } from './mesh-parallel';

beforeEach(() => {
	captured.geometry = null;
});

describe.each(
	[
		['直接生成', createRasterMeshEntry],
		['Worker経由', createRasterMeshEntryInWorker]
	] as const
)('地形メッシュの向き（%s）', (_name, createEntry) => {
	it('モデルビューで山頂が上を向き、地図では同じ位置・標高に置かれる', async () => {
		const entry = await createEntry({
			...testTerrain,
			id: 'test-terrain',
			name: 'test-terrain'
		});
		try {
			const geometry = captured.geometry!;
			const positions = geometry.getAttribute('position');
			const normals = geometry.getAttribute('normal');
			const viewMatrix = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(
				getModelViewAxisRotationX(entry.format.type, entry.style.transform.baseRotationX)
			));
			const mapMatrix = buildMercatorModelMatrix(entry.style.transform, false);
			const previousMapMatrix = buildMercatorModelMatrix({
				...entry.style.transform,
				baseRotationX: 0
			}, false);
			const center = MercatorCoordinate.fromLngLat([0.001, 0.001]);
			const meter = center.meterInMercatorCoordinateUnits();
			for (let index = 0; index < testTerrain.band.length; index++) {
				const position = new THREE.Vector3().fromBufferAttribute(positions, index);
				const modelViewPoint = position.clone().applyMatrix4(viewMatrix);
				expect(modelViewPoint.y).toBeCloseTo(testTerrain.band[index], 6);
				expect(normals.getY(index)).toBeGreaterThan(0);
				const mapPoint = position.clone().applyMatrix4(mapMatrix);
				const expected = MercatorCoordinate.fromLngLat([
					(index % 3) * 0.001,
					0.002 - Math.floor(index / 3) * 0.001
				]);
				// 修正前のGLBはY・Zが反転していた。地図上の配置が同じことを確認する。
				const previousMapPoint = new THREE.Vector3(
					(expected.x - center.x) / meter,
					-testTerrain.band[index],
					-(expected.y - center.y) / meter
				).applyMatrix4(previousMapMatrix);
				expect(mapPoint.x).toBeCloseTo(previousMapPoint.x, 10);
				expect(mapPoint.y).toBeCloseTo(previousMapPoint.y, 10);
				expect(mapPoint.z).toBeCloseTo(previousMapPoint.z, 12);
				expect(mapPoint.z).toBeGreaterThan(0);
				// 色分けも正の高さを使い、山頂と低地の色を逆転させない。
				expect(position.y * entry.style.heightColorRamp!.sourceSign!)
					.toBeCloseTo(testTerrain.band[index], 6);
			}
			expect(positions.getY(4)).toBeGreaterThan(positions.getY(0));
			expect(entry.style.heightColorRamp).toMatchObject({ min: 1, max: 12 });
		} finally {
			URL.revokeObjectURL(entry.format.url);
			captured.geometry?.dispose();
		}
	});
});
