import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { createEdgeUvGeometry } from './model-edge-uv';

describe('createEdgeUvGeometry', () => {
	it('UVがないジオメトリに法線に応じたUVを付与する', () => {
		const source = new THREE.BufferGeometry();
		source.setAttribute(
			'position',
			new THREE.Float32BufferAttribute([2, 5, 10, 6, 5, 10, 2, 9, 10], 3)
		);
		source.setAttribute(
			'normal',
			new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)
		);

		const result = createEdgeUvGeometry(source);

		expect(result?.generated).toBe(true);
		expect(result?.geometry).not.toBe(source);
		expect(Array.from(result?.geometry.getAttribute('uv')?.array ?? [])).toEqual([
			0,
			0,
			1,
			0,
			0,
			1
		]);
		expect(source.getAttribute('uv')).toBeUndefined();
	});

	it('既存UVはそのまま使用する', () => {
		const source = new THREE.BufferGeometry();
		source.setAttribute(
			'position',
			new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
		);
		source.setAttribute(
			'uv',
			new THREE.Float32BufferAttribute([0.2, 0.3, 0.4, 0.5, 0.6, 0.7], 2)
		);

		const result = createEdgeUvGeometry(source);

		expect(result).toEqual({ geometry: source, generated: false });
	});
});
