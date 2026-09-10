import { describe, expect, it } from 'vitest';

import { getHighDetailLodZoom, isLowerDetailLodUrl, resolveModelLodUrl } from './model-lod';

describe('resolveModelLodUrl', () => {
	const lods = [
		{ maxZoom: 18, url: 'test-medium.glb' },
		{ maxZoom: 16, url: 'test-low.glb' }
	];

	it('現在ズーム以上で最も詳細な下位 LOD を選ぶ', () => {
		expect(resolveModelLodUrl('test-default.glb', lods, 8)).toBe('test-low.glb');
		expect(resolveModelLodUrl('test-default.glb', lods, 16)).toBe('test-low.glb');
		expect(resolveModelLodUrl('test-default.glb', lods, 17)).toBe('test-medium.glb');
		expect(resolveModelLodUrl('test-default.glb', lods, 18)).toBe('test-medium.glb');
	});

	it('該当LODがない場合は既定URLを返す', () => {
		expect(resolveModelLodUrl('test-default.glb', lods, 19)).toBe('test-default.glb');
		expect(resolveModelLodUrl('test-default.glb', undefined, 8)).toBe('test-default.glb');
	});

	it('最高詳細モデルが選ばれるズームを返す', () => {
		expect(getHighDetailLodZoom(lods)).toBe(18.01);
		expect(getHighDetailLodZoom(undefined)).toBeUndefined();
	});

	it('最高詳細URLと異なる場合だけ下位LODと判定する', () => {
		expect(isLowerDetailLodUrl('test-low.glb', 'test-high.glb')).toBe(true);
		expect(isLowerDetailLodUrl('test-high.glb', 'test-high.glb')).toBe(false);
		expect(isLowerDetailLodUrl(undefined, 'test-high.glb')).toBe(false);
	});
});
