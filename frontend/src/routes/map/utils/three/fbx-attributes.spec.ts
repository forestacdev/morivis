import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
	applyFbxCurveGeometricTransform,
	parseFbxModelAttributes,
	resolveFbxModelAttributes,
	setFbxCurveVisibility
} from './fbx-attributes';

describe('parseFbxModelAttributes', () => {
	const encodeString = (value: string) => {
		const bytes = new TextEncoder().encode(value);
		const output = new Uint8Array(5 + bytes.length);
		output[0] = 'S'.charCodeAt(0);
		new DataView(output.buffer).setUint32(1, bytes.length, true);
		output.set(bytes, 5);
		return output;
	};

	const encodeId = (value: number) => {
		const output = new Uint8Array(9);
		output[0] = 'L'.charCodeAt(0);
		new DataView(output.buffer).setBigInt64(1, BigInt(value), true);
		return output;
	};

	const joinBytes = (parts: Uint8Array[]) => {
		const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
		let offset = 0;
		parts.forEach((part) => {
			output.set(part, offset);
			offset += part.length;
		});
		return output;
	};

	const createNode = (
		name: string,
		properties: Uint8Array[],
		children: ((offset: number) => Uint8Array)[],
		offset: number
	) => {
		const encodedName = new TextEncoder().encode(name);
		const encodedProperties = joinBytes(properties);
		let childOffset = offset + 25 + encodedName.length + encodedProperties.length;
		const encodedChildren = children.map((child) => {
			const result = child(childOffset);
			childOffset += result.length;
			return result;
		});
		const output = new Uint8Array(childOffset + 25 - offset);
		const view = new DataView(output.buffer);
		view.setBigUint64(0, BigInt(offset + output.length), true);
		view.setBigUint64(8, BigInt(properties.length), true);
		view.setBigUint64(16, BigInt(encodedProperties.length), true);
		view.setUint8(24, encodedName.length);
		output.set(encodedName, 25);
		output.set(encodedProperties, 25 + encodedName.length);
		let targetOffset = 25 + encodedName.length + encodedProperties.length;
		encodedChildren.forEach((child) => {
			output.set(child, targetOffset);
			targetOffset += child.length;
		});
		return output;
	};

	it('最小FBX fixtureからモデル属性を抽出できる', () => {
		const header = new Uint8Array(27);
		header.set(new TextEncoder().encode('Kaydara FBX Binary  '));
		header.set([0, 0x1a, 0], 20);
		new DataView(header.buffer).setUint32(23, 7700, true);
		const modelId = 1001;
		const model = createNode(
			'Model',
			[encodeId(modelId), encodeString('PLANESURFACE'), encodeString('Mesh')],
			[(propertiesOffset) =>
				createNode('Properties70', [], [
					(propertyOffset) =>
						createNode(
							'P',
							[
								encodeString('項目 - GUID'),
								encodeString('KString'),
								encodeString(''),
								encodeString('U'),
								encodeString('fixture-guid')
							],
							[],
							propertyOffset
						)
				], propertiesOffset)],
			27
		);
		const attributes = parseFbxModelAttributes(
			joinBytes([header, model, new Uint8Array(25)]).buffer
		);

		expect(attributes[String(modelId)]?.['項目 - GUID']).toBe('fixture-guid');
	});

	it('途中で切れたFBX属性を安全に無視する', () => {
		const header = new Uint8Array(27);
		header.set(new TextEncoder().encode('Kaydara FBX Binary  '));
		header.set([0, 0x1a, 0], 20);
		new DataView(header.buffer).setUint32(23, 7700, true);
		const truncated = joinBytes([header, new Uint8Array(8)]).buffer;

		expect(parseFbxModelAttributes(truncated)).toEqual({});
	});

	it('NurbsCurveのGeometricScalingをラインの頂点座標へ適用する', () => {
		const geometry = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(2_000, 0, 0)
		]);
		const line = new THREE.Line(geometry, new THREE.LineBasicMaterial());
		(line as THREE.Object3D & { ID?: number; }).ID = 42;
		const root = new THREE.Group();
		root.add(line);

		const appliedCount = applyFbxCurveGeometricTransform(root, {
			42: { GeometricScaling: '0.0005, 0.0005, 0.0005' }
		});

		expect(appliedCount).toBe(1);
		expect((line.geometry.getAttribute('position') as THREE.BufferAttribute).getX(1)).toBe(1);
		expect(applyFbxCurveGeometricTransform(root, {})).toBe(0);
	});

	it('NurbsCurveの移動・回転・縮尺をFBXと同じ順序で頂点座標へ適用する', () => {
		const geometry = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(1, 0, 0)
		]);
		const line = new THREE.Line(geometry, new THREE.LineBasicMaterial());
		(line as THREE.Object3D & { ID?: number; }).ID = 84;
		const root = new THREE.Group();
		root.add(line);

		expect(applyFbxCurveGeometricTransform(root, {
			84: {
				GeometricTranslation: '10, 20, 30',
				GeometricRotation: '0, 0, 90',
				GeometricScaling: '2, 3, 4'
			}
		})).toBe(1);

		const position = line.geometry.getAttribute('position') as THREE.BufferAttribute;
		expect(position.getX(0)).toBeCloseTo(10);
		expect(position.getY(0)).toBeCloseTo(22);
		expect(position.getZ(0)).toBeCloseTo(30);
	});

	it('FBX曲線だけを表示切替し、後から追加されたエッジ線は変更しない', () => {
		const sourceCurve = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(),
				new THREE.Vector3(1, 0, 0)
			]),
			new THREE.LineBasicMaterial()
		);
		(sourceCurve as THREE.Object3D & { ID?: number; }).ID = 126;
		const generatedEdge = new THREE.LineSegments(
			new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(),
				new THREE.Vector3(0, 1, 0)
			]),
			new THREE.LineBasicMaterial()
		);
		const root = new THREE.Group();
		root.add(sourceCurve);

		applyFbxCurveGeometricTransform(root, {});
		root.add(generatedEdge);
		setFbxCurveVisibility(root, false);

		expect(sourceCurve.visible).toBe(false);
		expect(generatedEdge.visible).toBe(true);
	});

	it('曲線ノードの属性へ親AlignmentのCivil3D属性を継承する', () => {
		const root = new THREE.Group();
		const alignment = new THREE.Group();
		alignment.userData.morivisFbxAttributes = {
			'項目 - タイプ': 'Alignment',
			'General - 画層': 'test-alignment-layer',
			'Civil3D - Geometry:Start Station': 100,
			'Civil3D - Geometry:End Station': 900,
			'Civil3D - Segment 1 Data - Line:Segment Length': 800,
			'Civil3D - Sub-entity 1 Data - Line:Start Station': 100,
			shared: 'parent'
		};
		const curve = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(),
				new THREE.Vector3(1, 0, 0)
			]),
			new THREE.LineBasicMaterial()
		);
		curve.userData.morivisFbxAttributes = {
			ScalingMax: 1,
			DefaultAttributeIndex: 0,
			shared: 'child'
		};
		root.add(alignment);
		alignment.add(curve);

		const resolved = resolveFbxModelAttributes(curve, root);

		expect(resolved.object).toBe(curve);
		expect(resolved.attributes).toMatchObject({
			'項目 - タイプ': 'Alignment',
			'General - 画層': 'test-alignment-layer',
			'Civil3D - Geometry:Start Station': 100,
			'Civil3D - Geometry:End Station': 900,
			'Civil3D - Sub-entity 1 Data - Line:Start Station': 100,
			'Civil3D - Segment Data:省略属性数': 1,
			ScalingMax: 1,
			DefaultAttributeIndex: 0,
			shared: 'child'
		});
		expect(resolved.attributes)
			.not.toHaveProperty('Civil3D - Segment 1 Data - Line:Segment Length');
	});
});
