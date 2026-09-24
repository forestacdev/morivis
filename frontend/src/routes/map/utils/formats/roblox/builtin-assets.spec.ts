import { describe, expect, it, vi } from 'vitest';
import { getRobloxBuiltinAssetId } from './builtin-assets';

// 配信先の実在IDやインストール済みStudioをテスト入力に使わない。
vi.mock('./builtin-asset-catalog.json', () => ({
	default: {
		'builtin/textures/test-image.png': '101',
		'builtin/icons/test-icon.png': '102',
		'builtin/sky/test-sky.jpg': '103'
	}
}));

describe('Roblox標準画像の対応表', () => {
	it.each([
		['builtin/textures/test-image.png', '101'],
		['BUILTIN/Textures/Test-Image.PNG', '101'],
		['builtin\\textures\\test-image.png', '101'],
		['builtin/icons/test-icon.png', '102'],
		['builtin/sky/test-sky.jpg', '103']
	])('%sを画像IDへ解決する', (path, id) => {
		expect(getRobloxBuiltinAssetId(path)).toBe(id);
	});
	it.each(['builtin/textures/test-unknown.png', 'toString', '__proto__'])(
		'登録されていない%sを推測しない',
		path => {
			expect(getRobloxBuiltinAssetId(path)).toBeUndefined();
		}
	);
});
