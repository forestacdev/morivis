import type { ProjectedModelGeoreference } from '$routes/map/data/types/model';
import {
	applyProjectedModelGeoreference,
	getModelUnitScaleMeters,
	resolveFbxUnitScaleMeters,
	resolveProjectedModelPlacementFromBox
} from '$routes/map/utils/three/model-georeference';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

const meterBox = new THREE.Box3(
	new THREE.Vector3(-20627.787109375, -55016.84765625, -29.329999923706055),
	new THREE.Vector3(-20524.57421875, -54894.38671875, 15.200652122497559)
);

const misleadingMeterBox = new THREE.Box3(
	new THREE.Vector3(-72288.453125, -103312.71875, 13.753643035888672),
	new THREE.Vector3(-71244.703125, -102845.96875, 92.70465850830078)
);

describe('model-georeference', () => {
	it('FBX unitScaleFactor から meter scale を解決する', () => {
		expect(getModelUnitScaleMeters(100)).toBeCloseTo(1);
		expect(getModelUnitScaleMeters(1)).toBeCloseTo(0.01);
		expect(getModelUnitScaleMeters(undefined)).toBe(1);
	});

	it('world座標を持つFBXは unitScaleFactor=1 でも meter 扱いに補正する', () => {
		expect(resolveFbxUnitScaleMeters(misleadingMeterBox, 1)).toBe(1);
		expect(resolveFbxUnitScaleMeters(meterBox, 100)).toBe(1);
		expect(
			resolveFbxUnitScaleMeters(
				new THREE.Box3(
					new THREE.Vector3(-5000, -5000, 0),
					new THREE.Vector3(5000, 5000, 1000)
				),
				1
			)
		).toBeCloseTo(0.01);
	});

	it('meter FBX の bbox から地理配置を解決する', async () => {
		const placement = await resolveProjectedModelPlacementFromBox(meterBox, '6674', 1);

		expect(placement.lng).toBeCloseTo(135.7731787617, 6);
		expect(placement.lat).toBeCloseTo(35.5044382086, 6);
		expect(placement.altitude).toBeCloseTo(-29.3299999237, 6);
		expect(placement.georeference.projectedOrigin[0]).toBeCloseTo(-20576.1806640625, 6);
		expect(placement.georeference.projectedOrigin[1]).toBeCloseTo(-54955.6171875, 6);
		expect(placement.georeference.projectedOrigin[2]).toBeCloseTo(-29.3299999237, 6);
	});

	it('centimeter FBX でも同じ場所へ正規化できる', async () => {
		const centimeterBox = new THREE.Box3(
			meterBox.min.clone().multiplyScalar(100),
			meterBox.max.clone().multiplyScalar(100)
		);
		const placement = await resolveProjectedModelPlacementFromBox(
			centimeterBox,
			'EPSG:6674',
			0.01
		);

		expect(placement.lng).toBeCloseTo(135.7731787617, 6);
		expect(placement.lat).toBeCloseTo(35.5044382086, 6);
		expect(placement.altitude).toBeCloseTo(-29.3299999237, 6);
	});

	it('projected georeference を object に反映する', () => {
		const object = new THREE.Group();
		const georeference: ProjectedModelGeoreference = {
			type: 'projected',
			epsg: '6674',
			projectedOrigin: [10, 20, 30],
			unitScaleMeters: 0.01
		};

		applyProjectedModelGeoreference(object, georeference);

		expect(object.position.toArray()).toEqual([-10, -20, -30]);
		expect(object.scale.toArray()).toEqual([0.01, 0.01, 0.01]);
	});
});
