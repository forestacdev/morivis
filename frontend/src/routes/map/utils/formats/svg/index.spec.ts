import { describe, expect, it } from 'vitest';

import { parseSvgDimensions } from './index';

describe('parseSvgDimensions', () => {
	it('width と height を優先して解釈する', () => {
		expect(parseSvgDimensions('<svg width="640" height="480"></svg>')).toEqual({
			width: 640,
			height: 480
		});
	});

	it('単位付き width と height を px に変換する', () => {
		expect(parseSvgDimensions('<svg width="2in" height="1in"></svg>')).toEqual({
			width: 192,
			height: 96
		});
	});

	it('width と height が無いときは viewBox を使う', () => {
		expect(parseSvgDimensions('<svg viewBox="0 0 512 256"></svg>')).toEqual({
			width: 512,
			height: 256
		});
	});

	it('寸法情報が無いときはエラーにする', () => {
		expect(() => parseSvgDimensions('<svg></svg>')).toThrow(
			'SVG の width / height または viewBox を解釈できませんでした'
		);
	});
});
