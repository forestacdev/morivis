import { describe, expect, it } from 'vitest';
import { extractDefaultStates } from './prepare-minecraft-defaults.mjs';

describe('Minecraft default state summary', () => {
	it('候補の並び順と異なる初期値を取得する', () => {
		expect(extractDefaultStates({
			test_panel: [{ facing: ['east', 'west'] }, { facing: 'west' }],
			test_solid: [{}, {}]
		})).toEqual({ 'minecraft:test_panel': { facing: 'west' }, 'minecraft:test_solid': {} });
	});
	it.each([{ test_block: [] }, { test_block: [{}, { powered: false }] }])(
		'不正な初期値を拒否する',
		(value) => {
			expect(() => extractDefaultStates(value)).toThrow('初期状態');
		}
	);
});
