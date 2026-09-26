import type { AttributionKey } from '$routes/map/data/entries/_meta_data/_attribution';
import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { describe, expect, it, vi } from 'vitest';
import { createLayersItems } from '../layers';
import { createSourcesItems } from '../sources';
import { createMapStyle, type MapStyleInput, type PreparedMapStyle } from './map-style';

vi.mock('$routes/map/data/entries/_meta_data/_attribution', () => ({
	getAttribution: (key: string) => ({ name: key })
}));

const emptyData = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });
// 描画仕様が参照する最小構造。カタログや実データを読み込まない。
const rasterEntry = (id: string): MorivisLayerEntry => ({
	id,
	type: 'raster',
	format: { type: 'image', url: `https://example.test/${id}/{z}/{x}/{-y}.png` },
	metaData: {
		name: id,
		attribution: `${id}-attribution` as AttributionKey,
		minZoom: 0,
		maxZoom: 16,
		bounds: [0, 0, 1, 1],
		tileSize: 256
	},
	interaction: { clickable: true },
	style: {
		type: 'basemap',
		visible: true,
		opacity: 0.7,
		hueRotate: 0,
		brightnessMin: 0,
		brightnessMax: 1,
		saturation: 0,
		contrast: 0
	}
} as MorivisLayerEntry);
const input = (): MapStyleInput => ({
	entries: [rasterEntry('test-main')],
	mcaGridEntries: [],
	showDataEntry: null,
	baseMap: null,
	showHillshade: false,
	showStreetView: false,
	showLine: false,
	showLabel: false,
	isIsolatedPreview: false,
	isGeoRefRegistrationActive: false,
	geoRefPreviewData: null,
	previewOpacity: 0.5,
	isZoneRegistrationActive: false,
	selectedEpsgCode: '4326',
	showXYZTile: false,
	showRegionalMesh: false,
	showPlaneGrid: false,
	planeGridZone: 1,
	showH3: false,
	showContour: false,
	isGlobe: false,
	showModelView: false,
	isTerrain3d: false,
	streetViewPointData: emptyData(),
	streetViewLineData: emptyData(),
	drawGeojsonData: emptyData(),
	zoneBboxGeojsonData: emptyData(),
	searchGeojsonData: null
});
const resources = (): PreparedMapStyle => ({
	prepared: {},
	previewPrepared: {},
	referenceStyle: { sources: {}, layers: [] }
});

describe('明示的入力による地図style生成', () => {
	it('同じ入力で同じ結果を返し、入力entryを変更しない', () => {
		const state = input();
		const before = structuredClone(state);
		const first = createMapStyle(state, resources());
		expect(createMapStyle(state, resources())).toEqual(first);
		expect(state).toEqual(before);
		expect(first.metadata.clickableRasterIds).toEqual(['test-main']);
		expect(first.metadata.attributions).toEqual(['test-main-attribution']);
		expect(first.style.sources['test-main_source']).toMatchObject({
			scheme: 'tms',
			tiles: ['https://example.test/test-main/{z}/{x}/{y}.png']
		});
	});

	it('プレビューの生成はmainのクリック対象を上書きせず、表示中の帰属を合算する', () => {
		const state = { ...input(), showDataEntry: rasterEntry('test-preview') };
		const result = createMapStyle(state, resources());
		expect(result.metadata.clickableRasterIds).toEqual(['test-main']);
		expect(result.metadata.attributions).toEqual([
			'test-main-attribution',
			'test-preview-attribution'
		]);
		expect(result.style.layers.findIndex((layer) => layer.id === 'test-main')).toBeLessThan(
			result.style.layers.findIndex((layer) => layer.id === 'test-preview')
		);
	});

	it('独立プレビューではmainのソース・クリック対象・帰属を除く', () => {
		const result = createMapStyle({
			...input(),
			isIsolatedPreview: true,
			showDataEntry: rasterEntry('test-preview'),
			showStreetView: true
		}, resources());
		expect(result.style.sources['test-main_source']).toBeUndefined();
		expect(result.metadata.clickableRasterIds).toEqual([]);
		expect(result.metadata.clickableVectorIds).toEqual([]);
		expect(result.metadata.attributions).toEqual(['test-preview-attribution']);
	});

	it('派生グリッドはpreviewより上に置き、クリック対象に混ぜない', () => {
		const grid = rasterEntry('test-grid');
		const result = createMapStyle({
			...input(),
			mcaGridEntries: [grid],
			showDataEntry: rasterEntry('test-preview')
		}, resources());
		const ids = result.style.layers.map((layer) => layer.id);
		expect(ids.indexOf('test-grid')).toBeGreaterThan(ids.indexOf('test-preview'));
		expect(result.metadata.clickableRasterIds).toEqual(['test-main']);
	});

	it('地形・等高線・投影は準備済み値と表示設定だけで決まる', () => {
		const result = createMapStyle({ ...input(), isGlobe: true, isTerrain3d: true }, {
			...resources(),
			contourDem: {
				contourTiles: 'test-contour://{z}/{x}/{y}',
				sharedDemTiles: 'test-dem://{z}/{x}/{y}'
			}
		});
		expect(result.style.projection).toEqual({ type: 'globe' });
		expect(result.style.terrain).toEqual({ source: 'terrain', exaggeration: 1 });
		expect(result.style.sources.terrain).toMatchObject({ tiles: ['test-dem://{z}/{x}/{y}'] });
		expect(result.style.sources['aux-contours']).toMatchObject({
			tiles: ['test-contour://{z}/{x}/{y}']
		});
	});

	it('非表示entryの帰属・クリック対象を除き、street viewはmainのみ有効にする', () => {
		const hidden = rasterEntry('test-hidden');
		hidden.style.visible = false;
		const options = {
			entries: [hidden],
			baseMap: null,
			showStreetView: true,
			showHillshade: false
		};
		const main = createLayersItems({ ...options, mode: 'main' });
		const preview = createLayersItems({ ...options, mode: 'preview' });
		expect(main.attributions).toEqual([]);
		expect(main.clickableRasterIds).toEqual([]);
		expect(main.clickableVectorIds).toEqual([
			'@street_view_line_layer',
			'@street_view_circle_layer'
		]);
		expect(preview.layers).toEqual([]);
		expect(preview.clickableVectorIds).toEqual([]);
	});

	it('GeoJSONは取得済み入力だけを使い、後続の別の入力に影響されない', () => {
		const entry = {
			...rasterEntry('test-vector'),
			type: 'vector',
			format: { type: 'geojson', url: 'https://example.test/test.geojson' }
		} as MorivisLayerEntry;
		const data = emptyData();
		const options = { entries: [entry], baseMap: null, mode: 'preview' as const };
		const first = createSourcesItems({
			...options,
			prepared: { 'test-vector': { geojson: data } }
		});
		createSourcesItems({
			...options,
			prepared: {
				'test-vector': {
					geojson: {
						type: 'FeatureCollection',
						features: [{
							type: 'Feature',
							properties: {},
							geometry: { type: 'Point', coordinates: [1, 2] }
						}]
					}
				}
			}
		});
		expect(first['test-vector_source']).toMatchObject({
			data: { type: 'FeatureCollection', features: [] }
		});
	});
	it('WCSとviewport COGは同じ空画像から始まり、COG metadata未取得時はentryへfallbackする', () => {
		const wcs = {
			...rasterEntry('test-wcs'),
			format: { type: 'wcs', url: 'https://example.test/test-wcs' }
		} as MorivisLayerEntry;
		const cog = {
			...rasterEntry('test-cog'),
			format: { type: 'cog', url: 'https://example.test/test-cog.tif', mode: 'viewport' },
			style: {
				type: 'tiff',
				visualization: {
					mode: 'single',
					uniformsData: { single: { index: 0, min: 0, max: 1, colorMap: 'hsv' } }
				}
			}
		} as MorivisLayerEntry;
		const options = {
			entries: [wcs, cog],
			prepared: {},
			mode: 'preview' as const,
			baseMap: null
		};
		const sources = createSourcesItems(options);
		expect(sources['test-wcs_source']).toMatchObject({
			type: 'image',
			coordinates: [[0, 1], [1, 1], [1, 0], [0, 0]]
		});
		expect(sources['test-cog_source']).toEqual(sources['test-wcs_source']);
		const tileCog = { ...cog, format: { ...cog.format, mode: 'tile' } } as MorivisLayerEntry;
		expect(createSourcesItems({ ...options, entries: [tileCog] })['test-cog_source'])
			.toMatchObject({ type: 'raster', tileSize: 256, minzoom: 0, maxzoom: 16 });
	});

	it('独立previewの全レイヤーが解決可能なsourceを持つ', () => {
		const result = createMapStyle({
			...input(),
			baseMap: 'satellite',
			isIsolatedPreview: true,
			showDataEntry: rasterEntry('test-preview')
		}, resources());
		for (const layer of result.style.layers) {
			if ('source' in layer) expect(result.style.sources[layer.source]).toBeDefined();
		}
		expect(
			createSourcesItems({
				entries: [rasterEntry('test-preview')],
				prepared: {},
				mode: 'preview',
				baseMap: null
			})
		).toHaveProperty('test-preview_source');
	});
});
