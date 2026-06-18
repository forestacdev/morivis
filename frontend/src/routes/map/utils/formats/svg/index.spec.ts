import { describe, expect, it } from 'vitest';

import { parseSvgDimensions, svgTextToFeatureCollection } from './index';

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

	it('line と rect を FeatureCollection に変換できる', async () => {
		const geojson = await svgTextToFeatureCollection(`
			<svg viewBox="0 0 100 50">
				<line x1="0" y1="0" x2="100" y2="50" stroke="#000" />
				<rect x="10" y="10" width="20" height="10" fill="#f00" />
			</svg>
		`);

		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[0]?.geometry.type).toBe('LineString');
		expect(geojson.features[1]?.geometry.type).toBe('Polygon');
	});

	it('閉じた path を Polygon に変換できる', async () => {
		const geojson = await svgTextToFeatureCollection(`
			<svg viewBox="0 0 100 100">
				<path d="M 10 10 L 90 10 L 90 90 L 10 90 Z" />
			</svg>
		`);

		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.geometry.type).toBe('Polygon');
	});

	it('cubic curve を含む path を LineString に近似できる', async () => {
		const geojson = await svgTextToFeatureCollection(`
			<svg viewBox="0 0 100 100">
				<path d="M 10 50 C 30 10 70 10 90 50" />
			</svg>
		`);

		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.geometry.type).toBe('LineString');
		expect((geojson.features[0]?.geometry.coordinates as [number, number][]).length).toBeGreaterThan(2);
	});

	it('group transform を累積して反映できる', async () => {
		const geojson = await svgTextToFeatureCollection(`
			<svg viewBox="0 0 100 100">
				<g transform="translate(10 20)">
					<rect x="0" y="0" width="10" height="10" />
				</g>
			</svg>
		`);

		const polygon = geojson.features[0]?.geometry.coordinates as [number, number][][];
		expect(geojson.features).toHaveLength(1);
		expect(polygon[0]?.[0]).toEqual([10, 80]);
	});

	it('transform は SVG の記述順どおりに適用する', async () => {
		const geojson = await svgTextToFeatureCollection(`
			<svg viewBox="0 0 100 100">
				<rect x="1" y="10" width="5" height="10" transform="translate(10 0) scale(2 1)" />
			</svg>
		`);

		const polygon = geojson.features[0]?.geometry.coordinates as [number, number][][];
		expect(geojson.features).toHaveLength(1);
		expect(polygon[0]?.[0]).toEqual([22, 90]);
	});

	it('marker 内の図形は実レイヤーとして取り込まない', async () => {
		const geojson = await svgTextToFeatureCollection(`
			<svg viewBox="0 0 100 100">
				<marker id="arrow" viewBox="0 0 10 10">
					<path d="M 0 0 L 10 5 L 0 10 z" />
				</marker>
				<path d="M 10 50 L 90 50" marker-end="url(#arrow)" />
			</svg>
		`);

		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.geometry.type).toBe('LineString');
	});
});
