import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { ICONS } from './catalog';
import Icon from './Icon.svelte';
import { getIconComponent, ICON_COMPONENTS } from './registry';

// SSRでSVGそのものが出ることを確認する。ブラウザの取得待ちに依存しない。
describe('ローカルSVGアイコン', () => {
	it.each(Object.entries(ICON_COMPONENTS))(
		'%sをローカルのSVGとして描画する',
		(_name, component) => {
			const { body } = render(component);
			expect(body).toContain('<svg');
			expect(body).toMatch(/<(path|circle|rect|g|ellipse|polygon|line|polyline)\b/);
			expect(body).not.toContain('<img');
		}
	);
	it('動的な名前の選択と共通アイコンのコンポーネントを扱う', () => {
		expect(render(Icon, { props: { icon: 'mdi:github' } }).body).toContain('<path');
		expect(render(Icon, { props: { icon: ICONS.close } }).body).toContain('<path');
		expect(getIconComponent('unknown:icon')).toBeUndefined();
		expect(getIconComponent('constructor')).toBeUndefined();
		expect(render(Icon, { props: { icon: 'unknown:icon' } }).body).not.toContain('<svg');
	});
	it('幅・高さ・クラス・アクセシビリティ属性をSVGへ渡す', () => {
		const { body } = render(Icon, {
			props: { icon: ICONS.close, width: 20, class: 'text-accent', 'aria-label': '閉じる' }
		});
		expect(body).toContain('width="20"');
		expect(body).toContain('height="20"');
		expect(body).toContain('class="text-accent"');
		expect(body).toContain('aria-label="閉じる"');
		expect(body).not.toContain('aria-hidden="true"');
		const decorative = render(Icon, { props: { icon: ICONS.close, height: '2em' } }).body;
		expect(decorative).toContain('width="2em"');
		expect(decorative).toContain('aria-hidden="true"');
	});
});
