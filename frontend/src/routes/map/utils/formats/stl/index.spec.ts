import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { parseStlArrayBuffer } from './index';

const createAsciiStlBuffer = () => {
	const bytes = new TextEncoder().encode(`solid test-shape
facet normal 0 0 1
	outer loop
		vertex 0 0 0
		vertex 2 0 0
		vertex 0 3 0
	endloop
endfacet
endsolid test-shape`);
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

const createBinaryStlBuffer = () => {
	const buffer = new ArrayBuffer(84 + 50);
	const view = new DataView(buffer);
	view.setUint32(80, 1, true);
	const values = [
		0,
		0,
		1,
		0,
		0,
		0,
		2,
		0,
		0,
		0,
		3,
		0
	];
	values.forEach((value, index) => view.setFloat32(84 + index * 4, value, true));
	view.setUint16(84 + 48, 0, true);
	return buffer;
};

describe('parseStlArrayBuffer', () => {
	it.each([
		['ASCII', createAsciiStlBuffer],
		['binary', createBinaryStlBuffer]
	])('%s STLをmeshへ変換する', (_encoding, createBuffer) => {
		const mesh = parseStlArrayBuffer(createBuffer());
		const box = new THREE.Box3().setFromObject(mesh);

		expect(mesh.isMesh).toBe(true);
		expect(mesh.geometry.getAttribute('position').count).toBe(3);
		expect(mesh.geometry.getAttribute('normal')).toBeDefined();
		expect(box.min.toArray()).toEqual([0, 0, 0]);
		expect(box.max.toArray()).toEqual([2, 3, 0]);
	});

	it('空のSTLを拒否する', () => {
		expect(() => parseStlArrayBuffer(new ArrayBuffer(0))).toThrow('STLファイルが空です');
	});
});
