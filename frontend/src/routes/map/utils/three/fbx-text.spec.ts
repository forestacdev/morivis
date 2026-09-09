import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { createFbxTextMeshes, getFbxTextDescriptors, setFbxTextStyle } from './fbx-text';

const createTextGroup = (id: number) => {
	const group = new THREE.Group() as THREE.Group & { ID?: number; };
	group.ID = id;
	return group;
};

describe('FBX text', () => {
	it('テキスト属性から配置情報を抽出する', () => {
		const root = new THREE.Group();
		const textGroup = createTextGroup(101);
		root.add(textGroup);

		const [descriptor] = getFbxTextDescriptors(root, {
			101: {
				'項目 - タイプ': 'テキスト',
				'Text - 内容': 'test-label',
				'Text - 高さ': 2,
				'Text - 幅係数': 0.75,
				'Text - 位置合わせ': '上中心(TC)',
				'Text - 回転角度': 15,
				GeometricTranslation: '10, 20, 30'
			}
		});

		expect(descriptor.text).toBe('test-label');
		expect(descriptor.height).toBe(2);
		expect(descriptor.widthFactor).toBe(0.75);
		expect(descriptor.alignment).toBe('top-center');
		expect(descriptor.rotation).toBe(15);
		expect(new THREE.Vector3().applyMatrix4(descriptor.geometricTransform!))
			.toEqual(new THREE.Vector3(10, 20, 30));
	});

	it('テキスト属性を平面メッシュに変換して表示状態を更新する', () => {
		const root = new THREE.Group();
		const textGroup = createTextGroup(202);
		const regularMesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshBasicMaterial()
		);
		root.add(textGroup, regularMesh);

		const createdCount = createFbxTextMeshes(
			root,
			{
				202: {
					'項目 - タイプ': 'テキスト',
					'テキスト - テキスト': 'fixture-text',
					'Text - 高さ': 1
				}
			},
			() => ({
				texture: new THREE.Texture(),
				widthInTextHeights: 3,
				heightInTextHeights: 1
			})
		);
		const textMesh = textGroup.children[0] as THREE.Mesh;

		expect(createdCount).toBe(1);
		expect(textMesh.userData.morivisFbxText).toBe(true);
		setFbxTextStyle(root, false, 0.4);
		expect(textMesh.visible).toBe(false);
		expect((textMesh.material as THREE.MeshBasicMaterial).opacity).toBe(0.4);
		expect(regularMesh.visible).toBe(true);
	});

	it('通常グループと空文字は描画対象にしない', () => {
		const root = new THREE.Group();
		root.add(createTextGroup(303), createTextGroup(404));

		expect(getFbxTextDescriptors(root, {
			303: { '項目 - タイプ': 'メッシュ', 'Text - 内容': 'not-text' },
			404: { '項目 - タイプ': 'テキスト', 'Text - 内容': '   ' }
		})).toEqual([]);
	});
});
