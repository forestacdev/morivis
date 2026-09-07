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

	it('STLをmesh entryへ正規化する', () => {
		const entry = createGlbEntry(
			'test-stl',
			'blob:test-stl',
			transform,
			'stl',
			undefined,
			undefined,
			{ normalizeToLocalOrigin: true }
		);

		expect(entry.format).toMatchObject({
			type: 'stl',
			normalizeToLocalOrigin: true
		});
		expect(entry.metaData.attribution).toBe('STL');
		expect(entry.style.transform.baseRotationX).toBe(90);
	});
});
