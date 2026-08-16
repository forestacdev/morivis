import { describe, expect, it } from 'vitest';

import { buildGlbExportFilename } from './model';

describe('buildGlbExportFilename', () => {
	it('不正な文字を置換して glb 拡張子を付与する', () => {
		expect(buildGlbExportFilename('scene:test/01')).toBe('scene_test_01.glb');
	});

	it('空文字のときは fallback を使う', () => {
		expect(buildGlbExportFilename('   ', 'mesh-export')).toBe('mesh-export.glb');
	});

	it('既に glb 拡張子があれば重ねて付けない', () => {
		expect(buildGlbExportFilename('sample.glb')).toBe('sample.glb');
	});
});
