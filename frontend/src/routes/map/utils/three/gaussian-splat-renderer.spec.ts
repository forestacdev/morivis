import { createGaussianSplatEntry } from '$routes/map/data/entries/model';
import type { GaussianSplatStyle } from '$routes/map/data/types/model';
import {
	applyGaussianSplatStyle,
	createGaussianSplatObject
} from '$routes/map/utils/three/gaussian-splat-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildMercatorModelMatrix } from './mercator-model-matrix';

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

describe('SPZの表示方向', () => {
	it('モデルビューと地図の両方で上向きを保ち、底面を配置高さへ揃える', () => {
		const entry = createGaussianSplatEntry(
			'test-up-axis',
			'blob:test-up-axis',
			{ lng: 0, lat: 0, altitude: 0 },
			{ gaussianSplat: { splatCount: 2, shDegree: 0 } },
			'spz'
		);
		const object = createGaussianSplatObject({
			positions: new Float32Array([0, -2, 0, 0, 3, 0]),
			colors: new Uint8Array([255, 0, 0, 0, 0, 255]),
			opacities: new Float32Array([1, 1]),
			scales: new Float32Array([1, 1]),
			bounds: [0, -2, 0, 0, 3, 0]
		}, entry.style);
		object.updateMatrixWorld(true);
		const bottom = new THREE.Vector3(0, -2, 0).applyMatrix4(object.matrixWorld);
		const top = new THREE.Vector3(0, 3, 0).applyMatrix4(object.matrixWorld);
		// 単体ビューはローカルYが上、地図はMercatorのZが上。
		expect(bottom.y).toBe(0);
		expect(top.y).toBeGreaterThan(bottom.y);
		const mapMatrix = buildMercatorModelMatrix(entry.style.transform, false);
		bottom.applyMatrix4(mapMatrix);
		top.applyMatrix4(mapMatrix);
		expect(bottom.z).toBeCloseTo(0, 12);
		expect(top.z).toBeGreaterThan(bottom.z);
		object.geometry.dispose();
		(object.material as THREE.ShaderMaterial).dispose();
	});

	it('PLYは従来の地図用の軸補正を保つ', () => {
		const entry = createGaussianSplatEntry(
			'test-ply-axis',
			'blob:test-ply-axis',
			{ lng: 0, lat: 0, altitude: 0 },
			{ gaussianSplat: { splatCount: 2, shDegree: 0 } }
		);
		expect(entry.style.transform.baseRotationX).toBe(0);
	});
});
