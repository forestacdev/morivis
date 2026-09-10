import type { GaussianSplatStyle } from '$routes/map/data/types/model';
import {
	applyGaussianSplatStyle,
	createGaussianSplatObject
} from '$routes/map/utils/three/gaussian-splat-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

const createStyle = (splatScale: number): GaussianSplatStyle => ({
	type: 'gaussian-splat',
	opacity: 1,
	splatScale,
	transform: {
		lng: 0,
		lat: 0,
		altitude: 0,
		scale: 1,
		rotationX: 0,
		rotationY: 0,
		rotationZ: 0
	}
});

describe('applyGaussianSplatStyle', () => {
	it('スプラットサイズをシェーダーのuniformへ同期する', () => {
		const object = createGaussianSplatObject(
			{
				positions: new Float32Array([0, 0, 0]),
				colors: new Uint8Array([255, 255, 255]),
				opacities: new Float32Array([1]),
				scales: new Float32Array([1]),
				bounds: [0, 0, 0, 0, 0, 0]
			},
			createStyle(1)
		);

		applyGaussianSplatStyle(object, createStyle(2.5), 720);

		const material = object.material as THREE.ShaderMaterial;
		expect(material.uniforms.uSplatScale.value).toBe(2.5);
	});
});
