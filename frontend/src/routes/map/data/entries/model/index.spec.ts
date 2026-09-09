import { describe, expect, it } from 'vitest';

import { createGlbEntry } from './index';

const transform = { lng: 1, lat: 2, altitude: 3 };

describe('createGlbEntry', () => {
	it('アップロード用の指定で陰影を有効にする', () => {
		const entry = createGlbEntry(
			'test-mesh',
			'https://example.test/test-mesh.glb',
			transform,
			'gltf',
			undefined,
			undefined,
			{ initialShadingEnabled: true }
		);

		expect(entry.style.shading?.enabled).toBe(true);
	});

	it('カタログ用の既定値では陰影を無効にする', () => {
		const entry = createGlbEntry(
			'test-catalog-mesh',
			'https://example.test/catalog.glb',
			transform
		);

		expect(entry.style.shading?.enabled).toBe(false);
	});

	it('モデル固有の固定倍率と利用者が操作する倍率を分離する', () => {
		const entry = createGlbEntry('test-fixed-scale', 'blob:test-fixed-scale', {
			...transform,
			baseScale: 250,
			scale: 1.5
		});

		expect(entry.style.transform.baseScale).toBe(250);
		expect(entry.style.transform.scale).toBe(1.5);
	});

	it('STLをmesh entryへ正規化する', () => {
		const entry = createGlbEntry(
			'test-stl',
			'blob:test-stl',
			transform,
			'stl',
			undefined,
			undefined,
			{ normalizeToLocalOrigin: true, upAxis: 'z' }
		);

		expect(entry.format).toMatchObject({
			type: 'stl',
			normalizeToLocalOrigin: true,
			upAxis: 'z'
		});
		expect(entry.metaData.attribution).toBe('STL');
		expect(entry.style.transform.baseRotationX).toBe(90);
	});

	it('Y-upのSTL指定をentryと軸回転へ反映する', () => {
		const entry = createGlbEntry(
			'test-y-up-stl',
			'blob:test-y-up-stl',
			transform,
			'stl',
			undefined,
			undefined,
			{ normalizeToLocalOrigin: true, upAxis: 'y' }
		);

		expect(entry.format.upAxis).toBe('y');
		expect(entry.style.transform.baseRotationX).toBe(-180);
	});
});
