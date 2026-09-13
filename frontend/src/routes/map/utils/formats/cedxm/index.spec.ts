import { readFileSync } from 'node:fs';
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { disposeDxfModel } from '../dxf/mesh';
import { decodeCedxm, parseCedxm } from '.';
import { createCedxmModel } from './mesh';
const text = readFileSync(new URL('./__fixtures__/test-building.xml', import.meta.url), 'utf8');

describe('CEDXM', () => {
	it('階・IDを保ち、2D図形と3D部材を別々に生成する', () => {
		const result = parseCedxm(text);
		expect(result.geojson.features).toHaveLength(9);
		expect(result.model.features).toHaveLength(7);
		const column = result.geojson.features.find(f => f.properties.source_id === 'test-column')!;
		expect(column.geometry).toEqual({
			type: 'Polygon',
			coordinates: [[[-0.1, -0.2], [0.1, -0.2], [0.1, 0.2], [-0.1, 0.2], [-0.1, -0.2]]]
		});
		expect(column.properties.layer).toBe('1階 / 柱材');
		expect(result.model.features.find(f => f.properties.type === '階段')).toBeUndefined();
		expect(result.warnings.join('')).toContain('階段');
	});
	it('部材ごとにメッシュを分け、GLB向けにY-up・底面原点へ変換する', () => {
		const result = parseCedxm(text), model = createCedxmModel(result.model);
		try {
			expect(model.children).toHaveLength(7);
			expect(new Set(model.children.map(c => c.userData.source_id)).size).toBe(7);
			const bounds = new Box3().setFromObject(model);
			expect(bounds.min.y).toBeCloseTo(0);
			const column = model.children.find(c => c.userData.source_id === 'test-column')!;
			const size = new Box3().setFromObject(column).getSize(new Vector3());
			expect(size.x).toBeCloseTo(0.2);
			expect(size.y).toBeCloseTo(2.4);
			expect(size.z).toBeCloseTo(0.4);
			expect(model.userData.coordinateUnit).toBe('m');
		} finally {
			disposeDxfModel(model);
		}
	});
	it('屋根の基準線・勾配を簡易面へ反映する', () => {
		const roof =
			parseCedxm(text).model.features.find(f => f.properties.type === '屋根')!.geometry;
		if (roof.type !== 'MultiPolygon') throw new Error('test roof');
		const points = roof.coordinates[0][0] as unknown as number[][];
		expect(points[0][2]).toBe(3);
		expect(points[2][2]).toBe(4);
	});
	it('UTF-8とShift-JISを判別する', () => {
		expect(parseCedxm(decodeCedxm(new TextEncoder().encode(text).buffer)).model.features)
			.toHaveLength(7);
		const prefix = new TextEncoder().encode(
			'<?xml version="1.0" encoding="Shift-JIS"?><CADIF><'
		);
		const suffix = new TextEncoder().encode('/></CADIF>');
		const bytes = new Uint8Array(prefix.length + 2 + suffix.length);
		bytes.set(prefix);
		bytes.set([0x95, 0xc7], prefix.length);
		bytes.set(suffix, prefix.length + 2);
		expect(decodeCedxm(bytes.buffer)).toContain('<壁/>');
	});
	it('破損XML・外部実体・欠落寸法・点数不一致を拒否する', () => {
		expect(() => parseCedxm('<CADIF>')).toThrow(/XML/);
		expect(() => parseCedxm('<!DOCTYPE CADIF><CADIF/>')).toThrow(/DOCTYPE/);
		expect(() => parseCedxm('<other/>')).toThrow(/CADIF/);
		expect(() => parseCedxm(text.replace('<寸法1>200</寸法1>', '<寸法1/>'))).toThrow(/寸法1/);
		expect(() => parseCedxm(text.replace('点数="4"', '点数="5"'))).toThrow(/点数/);
		expect(() => parseCedxm(text.replace('<上端高>2400</上端高>', '<上端高>-1</上端高>')))
			.toThrow(/壁寸法/);
	});
});
