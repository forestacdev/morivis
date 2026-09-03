import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { getIfcAttributes, getModelObjectAttributes } from './model-attributes';

describe('getModelObjectAttributes', () => {
	it('ユーザー属性とジオメトリ・マテリアルの識別子を返す', () => {
		const geometry = new THREE.BufferGeometry();
		const material = new THREE.MeshBasicMaterial({ name: 'concrete' });
		const mesh = new THREE.Mesh(geometry, material);
		mesh.userData = { category: 'gate', levels: [1, 2], entryId: 'layer-1' };

		const attributes = getModelObjectAttributes(mesh);

		expect(attributes).toMatchObject({ category: 'gate', levels: '1, 2' });
		expect(attributes['ノードID']).toBe(mesh.uuid);
		expect(attributes['ジオメトリID']).toBe(geometry.uuid);
		expect(attributes['マテリアルID']).toBe(material.uuid);
		expect(attributes['マテリアル名']).toBe('concrete');
		expect(attributes.entryId).toBeUndefined();
	});
});

describe('getIfcAttributes', () => {
	it('IFC.jsの要素・プロパティセット形式を属性パネル向けに平坦化する', () => {
		const attributes = getIfcAttributes(
			42,
			{
				expressID: 42,
				type: 'IFCBUILDINGELEMENTPROXY',
				GlobalId: { value: 'test-global-id' },
				Name: { value: 'test-element' },
				ObjectPlacement: { value: 99 },
				Representation: { expressID: 100 }
			},
			[
				{
					Name: { value: 'Pset_Test' },
					HasProperties: [
						{
							Name: { value: 'Status' },
							NominalValue: { value: 'active' }
						},
						{
							Name: { value: 'Unconfigured' }
						}
					]
				}
			]
		);

		expect(attributes).toMatchObject({
			'IFC Express ID': 42,
			'IFC クラス': 'IFCBUILDINGELEMENTPROXY',
			GlobalId: 'test-global-id',
			Name: 'test-element',
			ObjectPlacement: 99,
			'Pset_Test.Status': 'active'
		});
		expect(attributes.Representation).toBeUndefined();
		expect(attributes['Pset_Test.Unconfigured']).toBeUndefined();
	});

	it('quantity set の数値を属性値として扱う', () => {
		const attributes = getIfcAttributes(7, {}, [
			{
				Name: { value: 'Qto_ElementBaseQuantities' },
				Quantities: [
					{
						Name: { value: 'NetVolume' },
						VolumeValue: { value: 1.25 }
					}
				]
			}
		]);

		expect(attributes['Qto_ElementBaseQuantities.NetVolume']).toBe(1.25);
	});
});
