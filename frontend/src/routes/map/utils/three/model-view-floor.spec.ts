import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { resolveModelViewFloorY } from './model-view-floor';

const bounds = new THREE.Box3(new THREE.Vector3(-2, -3, -4), new THREE.Vector3(5, 6, 7));

describe('resolveModelViewFloorY', () => {
	it('指定がなければ形状の最下端を使う', () => {
		expect(resolveModelViewFloorY(bounds, [])).toBe(-3);
	});

	it('指定した床高さを形状の最下端より優先する', () => {
		expect(resolveModelViewFloorY(bounds, [0])).toBe(0);
	});

	it('複数モデルでは最も低い明示床高さを使う', () => {
		expect(resolveModelViewFloorY(bounds, [2, undefined, -1])).toBe(-1);
	});
});
