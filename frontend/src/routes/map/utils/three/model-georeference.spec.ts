import type { ProjectedModelGeoreference } from '$routes/map/data/types/model';
import {
	applyProjectedModelGeoreference,
	getModelUnitScaleMeters,
	resolveFbxUnitScaleMeters,
	resolveProjectedModelPlacementFromBox
} from '$routes/map/utils/three/model-georeference';
import proj4 from 'proj4';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

const meterBox = new THREE.Box3(
	new THREE.Vector3(-20_100, -50_200, -30),
	new THREE.Vector3(-20_000, -50_000, 15)
);

const misleadingMeterBox = new THREE.Box3(
	new THREE.Vector3(-72_000, -103_000, 10),
	new THREE.Vector3(-71_000, -102_500, 90)
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
		const expected = proj4('EPSG:6674', 'EPSG:4326', [-20_050, -50_100]) as [number, number];

		expect(placement.lng).toBeCloseTo(expected[0], 10);
		expect(placement.lat).toBeCloseTo(expected[1], 10);
		expect(placement.altitude).toBe(-30);
		expect(placement.georeference.projectedOrigin).toEqual([-20_050, -50_100, -30]);
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

		expect(placement.lng).toBeCloseTo(
			(await resolveProjectedModelPlacementFromBox(meterBox, '6674', 1)).lng,
			10
		);
		expect(placement.lat).toBeCloseTo(
			(await resolveProjectedModelPlacementFromBox(meterBox, '6674', 1)).lat,
			10
		);
		expect(placement.altitude).toBe(-30);
	});

	it('GLBの平面直角座標をEPSG:6673で地理配置する', async () => {
		const placement = await resolveProjectedModelPlacementFromBox(
			new THREE.Box3(
				new THREE.Vector3(12_000, -34_000, 2),
				new THREE.Vector3(12_100, -33_900, 20)
			),
			'6673'
		);
		const expected = proj4('EPSG:6673', 'EPSG:4326', [12_050, -33_950]) as [number, number];

		expect(placement.lng).toBeCloseTo(expected[0], 10);
		expect(placement.lat).toBeCloseTo(expected[1], 10);
		expect(placement.altitude).toBe(2);
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

	it('ルート軸変換を持つGLBは子ノードのローカル座標で原点を引く', () => {
		const scene = new THREE.Group();
		const root = new THREE.Group();
		root.rotation.x = -Math.PI / 2;
		scene.add(root);

		applyProjectedModelGeoreference(scene, {
			type: 'projected',
			epsg: '6673',
			projectedOrigin: [100, 200, 10],
			coordinateSpace: 'root-children'
		});

		expect(root.position.x).toBeCloseTo(-100, 9);
		expect(root.position.y).toBeCloseTo(-10, 9);
		expect(root.position.z).toBeCloseTo(200, 9);
	});

	it('IFCのZ-up座標系で原点を引く', () => {
		const object = new THREE.Group();
		applyProjectedModelGeoreference(object, {
			type: 'projected',
			epsg: '6673',
			projectedOrigin: [100, 200, 10],
			coordinateSpace: 'ifc-z-up'
		});

		expect(object.position.toArray()).toEqual([-100, -10, 200]);
	});
});
