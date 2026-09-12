import type { MultiPolygon3DFeatureCollection } from '$routes/map/types/geojson';
import { readFileSync } from 'node:fs';
import { Box3, Color, Mesh, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseDxf } from '.';
import { createDxfMesh, createDxfModel, disposeDxfModel } from './mesh';

const fixture = readFileSync(new URL('./__fixtures__/test-polyface.dxf', import.meta.url), 'utf8');
const meshes: ReturnType<typeof createDxfMesh>[] = [];
const models: ReturnType<typeof createDxfModel>[] = [];
const createPartsData = () => {
	const data = parseDxf(fixture).geojson;
	const second = structuredClone(data.features[0]);
	second.properties.color = '#00ff00';
	if (second.geometry.type === 'MultiPolygon') {
		for (const polygon of second.geometry.coordinates) {
			for (const ring of polygon) for (const point of ring) point[0] += 10;
		}
	}
	data.features.push(second);
	return data;
};
const buildModel = (data: Parameters<typeof createDxfModel>[0]) => {
	const model = createDxfModel(data);
	models.push(model);
	return model;
};
const build = (data: Parameters<typeof createDxfMesh>[0]) => {
	const mesh = createDxfMesh(data);
	meshes.push(mesh);
	return mesh;
};
afterEach(() => {
	for (const model of models.splice(0)) disposeDxfModel(model);
	for (const mesh of meshes.splice(0)) {
		mesh.geometry.dispose();
		mesh.material.dispose();
	}
	vi.unstubAllGlobals();
});

describe('DXFのthree.jsメッシュ変換', () => {
	it('同じレイヤーでもPOLYLINEを個別オブジェクトとして保持する', () => {
		const data = createPartsData();
		const model = buildModel(data);
		expect(model.children).toHaveLength(2);
		expect(new Set(model.children.map((child) => child.name)).size).toBe(2);
		expect(model.children.map((child) => child.userData.sourceEntityIndex)).toEqual([0, 1]);
		expect(model.children.map((child) => child.userData.layer)).toEqual([
			'test-mesh',
			'test-mesh'
		]);
		expect(model.children.map((child) => child.position.toArray())).toEqual([[-5, 0, -0], [
			5,
			0,
			-0
		]]);
		const combined = build(data);
		const bounds = new Box3().setFromObject(model);
		expect(bounds.min.distanceTo(combined.geometry.boundingBox!.min)).toBeCloseTo(0, 8);
		expect(bounds.max.distanceTo(combined.geometry.boundingBox!.max)).toBeCloseTo(0, 8);
	});

	it('3DFACEはレイヤー別にまとめ、全ての面を独立オブジェクトにはしない', () => {
		const data = createPartsData();
		data.features.push(structuredClone(data.features[0]));
		data.features.forEach((feature) => {
			feature.properties.type = '3DFACE';
			if (feature.geometry.type === 'MultiPolygon') {
				feature.geometry = {
					type: 'Polygon',
					coordinates: feature.geometry.coordinates[0]
				};
			}
		});
		data.features[2].properties.layer = 'test-other';
		const model = buildModel(data);
		expect(model.children.map((child) => child.name)).toEqual(['test-mesh', 'test-other']);
		expect(model.children.map((child) => child.userData.sourceEntityCount)).toEqual([2, 1]);
	});

	it('mm換算後の垂直面を三角形にし、Y-upで同じ寸法を保つ', () => {
		const mesh = build(parseDxf(fixture, 'mm').geojson);
		expect(mesh.geometry.getAttribute('position').count).toBe(9);
		const bounds = mesh.geometry.boundingBox!;
		const size = bounds.getSize(new Vector3());
		expect(size.x).toBeCloseTo(0.003, 8);
		expect(size.y).toBeCloseTo(0.003, 8);
		expect(size.z).toBe(0);
		expect(bounds.min.y).toBe(0);
		const normals = mesh.geometry.getAttribute('normal');
		for (let i = 0; i < normals.count; i++) {
			expect(new Vector3().fromBufferAttribute(normals, i).length()).toBeCloseTo(1);
		}
	});

	it('複数の元色をLinear-sRGBの頂点色として保持する', () => {
		const data = parseDxf(fixture).geojson;
		data.features.push({ ...data.features[0], properties: { color: '#808080' } });
		const mesh = build(data);
		const colors = mesh.geometry.getAttribute('color');
		expect(new Color().fromBufferAttribute(colors, 0).getHexString()).toBe('ff0000');
		expect(new Color().fromBufferAttribute(colors, colors.count - 1).getHexString()).toBe(
			'808080'
		);
		expect(mesh.material.vertexColors).toBe(true);
	});

	it('壁面の穴を埋めずに三角形分割する', () => {
		const data: MultiPolygon3DFeatureCollection = {
			type: 'FeatureCollection',
			features: [{
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'MultiPolygon',
					coordinates: [[
						[[0, 0, 0], [6, 0, 0], [6, 0, 6], [0, 0, 6], [0, 0, 0]],
						[[2, 0, 2], [2, 0, 4], [4, 0, 4], [4, 0, 2], [2, 0, 2]]
					]]
				}
			}]
		};
		const mesh = build(data);
		const positions = mesh.geometry.getAttribute('position');
		let area = 0;
		for (let i = 0; i < positions.count; i += 3) {
			const a = new Vector3().fromBufferAttribute(positions, i);
			const b = new Vector3().fromBufferAttribute(positions, i + 1);
			const c = new Vector3().fromBufferAttribute(positions, i + 2);
			area += b.sub(a).cross(c.sub(a)).length() / 2;
		}
		expect(area).toBe(32);
	});

	it('大きな座標値はFloat32化する前に原点を移して精度を保つ', () => {
		const data = parseDxf(fixture).geojson;
		for (const feature of data.features) {
			if (feature.geometry.type !== 'MultiPolygon') continue;
			feature.geometry.coordinates = feature.geometry.coordinates.map((polygon) =>
				polygon.map((ring) =>
					ring.map(([x, y, z]: number[]) =>
						[100_000_000 + x / 1000, 100_000_000 + y / 1000, z / 1000] as unknown as [
							number,
							number
						]
					)
				)
			);
		}
		const mesh = build(data);
		expect(mesh.geometry.boundingBox!.getSize(new Vector3()).x).toBeCloseTo(0.003, 6);
	});

	it('GLBへ書き出してGLTFLoaderで再読込しても寸法と頂点色が残る', async () => {
		vi.stubGlobal(
			'FileReader',
			class {
				result: ArrayBuffer | null = null;
				onloadend: (() => void) | null = null;
				readAsArrayBuffer = (blob: Blob) => {
					void blob.arrayBuffer().then((buffer) => {
						this.result = buffer;
						this.onloadend?.();
					});
				};
			}
		);
		const model = buildModel(createPartsData());
		const glb = await new GLTFExporter().parseAsync(model, { binary: true });
		expect(glb).toBeInstanceOf(ArrayBuffer);
		const loaded = await new GLTFLoader().parseAsync(glb as ArrayBuffer, '');
		const size = new Box3().setFromObject(loaded.scene).getSize(new Vector3());
		expect(size.x).toBeCloseTo(13, 8);
		expect(size.y).toBeCloseTo(3, 8);
		const restored: Mesh[] = [];
		loaded.scene.traverse((object) => {
			if (object instanceof Mesh) restored.push(object);
		});
		expect(restored).toHaveLength(2);
		expect(restored.map((mesh) => mesh.userData.sourceEntityIndex)).toEqual([0, 1]);
		expect(restored.map((mesh) => mesh.userData.layer)).toEqual(['test-mesh', 'test-mesh']);
		expect(
			restored.map((mesh) =>
				new Color().fromBufferAttribute(mesh.geometry.getAttribute('color'), 0)
					.getHexString()
			)
		).toEqual(['ff0000', '00ff00']);
		expect(restored[0].material).toBe(restored[1].material);
		disposeDxfModel(loaded.scene);
	});
});
