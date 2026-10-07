import type { FeatureCollection } from '$routes/map/types/geojson';
import { createSymbolLayer } from '$routes/map/utils/layers/vector/label';
import { createCircleLayer, createPointIconLayer } from '$routes/map/utils/layers/vector/point';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { buildDmStyle, buildDxfStyle, buildSxfStyle } from '.';
import { DEFAULT_VECTOR_POINT_STYLE } from './_style';

vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));

// 実際に描画するMapLibreと同じ式コンパイラーで、型と地物ごとの結果を検証する。
const require = createRequire(import.meta.url);
const { createPropertyExpression, latest } = createRequire(
	require.resolve('maplibre-gl/package.json')
)(
	'@maplibre/maplibre-gl-style-spec'
) as {
	createPropertyExpression: (input: unknown, rootKey: string, spec: unknown) =>
		| {
			result: 'success';
			value: {
				evaluate: (
					globals: { zoom: number; },
					feature: { type: number; properties: Record<string, unknown>; }
				) => unknown;
			};
		}
		| { result: 'error'; value: unknown; };
	latest: Record<string, Record<string, unknown>>;
};

const evaluate = (input: unknown, key: string, properties: Record<string, unknown>, zoom = 14) => {
	const group = key === 'text-field'
		? 'layout_symbol'
		: key.startsWith('icon-')
		? 'paint_symbol'
		: 'paint_circle';
	const compiled = createPropertyExpression(input, key, latest[group][key]);
	if (compiled.result === 'error') throw new Error(JSON.stringify(compiled.value));
	return compiled.value.evaluate({ zoom }, { type: 1, properties });
};

const mixed = (key: string, textType: string): FeatureCollection => ({
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [0, 0] },
			properties: {
				layer: 'test-layer',
				className: 'test-class',
				[key]: 'POINT',
				color: '#123456'
			}
		},
		{
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [1, 1] },
			properties: {
				layer: 'test-layer',
				className: 'test-class',
				[key]: textType,
				text: 'test-label',
				color: '#abcdef'
			}
		}
	]
});
const layer = { id: 'test-layer', source: 'test-source', minzoom: 0, maxzoom: 24 };

describe('CADの文字ポイント', () => {
	it.each(
		[
			['DXF・DWG・JWW', buildDxfStyle, 'type', 'TEXT'],
			['DXF・DWGの複数行文字', buildDxfStyle, 'type', 'MTEXT'],
			['DM', buildDmStyle, 'dataType', '注記'],
			['SFC', buildSxfStyle, 'type', 'text_string'],
			['P21', buildSxfStyle, 'type', 'text_literal']
		] as const
	)('%sの文字だけラベル表示し、記号と輪郭を透明にする', (_format, build, key, textType) => {
		const data = mixed(key, textType);
		// 先頭の通常ポイントにはtext属性がないケース。
		const style = build(data, 'Point', Object.keys(data.features[0].properties));
		if (style.type !== 'circle') throw new Error('test point required');
		expect(style.labels).toMatchObject({ show: true, key: 'text', hidePoint: true });
		const symbol = createSymbolLayer(layer, style, []);
		const paint = createCircleLayer(layer, style).paint!;
		const point = data.features[0].properties;
		const text = data.features[1].properties;
		expect(String(evaluate(symbol.layout?.['text-field'], 'text-field', text))).toBe(
			'test-label'
		);
		expect(
			String(
				evaluate(symbol.layout?.['text-field'], 'text-field', {
					...point,
					text: 'test-note'
				})
			)
		).toBe('');
		for (const property of ['circle-opacity', 'circle-stroke-opacity'] as const) {
			expect(evaluate(paint[property], property, text)).toBe(0);
			expect(evaluate(paint[property], property, point)).toBe(style.opacity);
			expect(evaluate(paint[property], property, { ...text, text: '' })).toBe(style.opacity);
		}
		expect(DEFAULT_VECTOR_POINT_STYLE.labels.hidePoint).toBeUndefined();
	});

	it('透明度・輪郭の最小ズーム・アイコンにも反映し、設定を戻せる', () => {
		const data = mixed('type', 'TEXT');
		const style = buildDxfStyle(data, 'Point', ['type', 'text']);
		if (style.type !== 'circle') throw new Error('test point required');
		style.opacity = 0.3;
		style.outline.minzoom = 10;
		const paint = createCircleLayer(layer, style).paint!;
		const point = data.features[0].properties;
		const text = data.features[1].properties;
		expect(evaluate(paint['circle-stroke-opacity'], 'circle-stroke-opacity', point, 8)).toBe(0);
		expect(evaluate(paint['circle-stroke-opacity'], 'circle-stroke-opacity', point, 12)).toBe(
			0.3
		);
		expect(evaluate(paint['circle-stroke-opacity'], 'circle-stroke-opacity', text, 12)).toBe(0);
		style.colors = {
			show: true,
			key: 'test-icon',
			expressions: [{
				type: 'single',
				key: 'test-icon',
				name: 'test-icon',
				mapping: { value: '#a6cee3', pattern: 'test-icon' }
			}]
		};
		const icon = createPointIconLayer(layer, style)!;
		expect(evaluate(icon.paint?.['icon-opacity'], 'icon-opacity', text)).toBe(0);
		expect(evaluate(icon.paint?.['icon-opacity'], 'icon-opacity', point)).toBe(0.3);
		style.labels.hidePoint = false;
		expect(createCircleLayer(layer, style).paint?.['circle-opacity']).toBe(0.3);
		style.labels.hidePoint = true;
		style.labels.show = false;
		expect(createCircleLayer(layer, style).paint?.['circle-opacity']).toBe(0.3);
	});

	it('文字のない図面では従来の初期表示を保つ', () => {
		const data = mixed('type', 'POINT');
		const style = buildDxfStyle(data, 'Point', ['type', 'text']);
		expect(style.labels.show).toBe(false);
		expect(style.labels.hidePoint).toBeUndefined();
	});
});
