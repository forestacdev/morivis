import { createTiles3DEntry } from '$routes/map/data/entries/model';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { describe, expect, it, vi } from 'vitest';
import { createTiles3DLayer } from './overlay';

vi.mock('@geoarrow/deck.gl-layers', () => ({
	GeoArrowPathLayer: vi.fn(),
	GeoArrowPolygonLayer: vi.fn(),
	GeoArrowScatterplotLayer: vi.fn()
}));

const createEntry = () => {
	const entry = createTiles3DEntry('test-model', 'https://example.invalid/tileset.json');
	if (entry.style.type !== '3d-tiles-mesh') throw new Error('test mesh required');
	return { ...entry, style: entry.style };
};

const createTile = () => ({
	id: 'test-tile',
	type: 'scenegraph',
	selected: true,
	content: { cartographicOrigin: [10, 20, 80], gltf: undefined }
});

type TestLayer = {
	props: {
		coordinateOrigin: number[];
		coordinateSystem: number;
		morivisStyleSignature?: string;
	};
	_getSubLayer: (tile: ReturnType<typeof createTile>, oldLayer?: TestLayer) => TestLayer;
};

describe('3D Tilesの高さ補正', () => {
	it.each([0, -25, 12.5])('元の高さに %s m を反映する', (offset) => {
		const entry = createEntry();
		entry.style.heightOffset = offset;
		const layer = createTiles3DLayer(entry) as unknown as TestLayer;
		const tile = createTile();
		const sub = layer._getSubLayer(tile);
		expect(sub.props.coordinateSystem).toBe(COORDINATE_SYSTEM.METER_OFFSETS);
		expect(sub.props.coordinateOrigin).toEqual([10, 20, 80 + offset]);
		expect(tile.content.cartographicOrigin).toEqual([10, 20, 80]);
	});

	it('表示中のタイルと後から読むタイルに同じ補正を使い、再調整で累積しない', () => {
		const entry = createEntry();
		entry.style.heightOffset = -25;
		const before = createTiles3DLayer(entry) as unknown as TestLayer;
		const tile = createTile();
		const cached = before._getSubLayer(tile);
		entry.style.heightOffset = -10;
		const after = createTiles3DLayer(entry) as unknown as TestLayer;
		expect(after.props.morivisStyleSignature).not.toBe(before.props.morivisStyleSignature);
		expect(after._getSubLayer(tile, cached).props.coordinateOrigin).toEqual([10, 20, 70]);
		expect(after._getSubLayer(createTile()).props.coordinateOrigin).toEqual([10, 20, 70]);
		entry.style.heightOffset = 0;
		const reset = createTiles3DLayer(entry) as unknown as TestLayer;
		expect(reset._getSubLayer(tile, cached).props.coordinateOrigin).toEqual([10, 20, 80]);
	});

	it('既存のaltitudeを補正値として引き継ぎ、明示した0と不正値を扱う', () => {
		const entry = createEntry();
		entry.metaData.altitude = -15;
		const renderHeight = () =>
			(createTiles3DLayer(entry) as unknown as TestLayer)
				._getSubLayer(createTile()).props.coordinateOrigin[2];
		expect(renderHeight()).toBe(65);
		entry.style.heightOffset = 0;
		expect(renderHeight()).toBe(80);
		entry.style.heightOffset = NaN;
		expect(renderHeight()).toBe(80);
	});
});
