import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { GeoJsonLayer, PointCloudLayer } from '@deck.gl/layers';
import {
	GeoArrowPathLayer,
	GeoArrowPolygonLayer,
	GeoArrowScatterplotLayer
} from '@geoarrow/deck.gl-layers';
import { createGeoJsonColorAccessors, hexToRgba } from './geojson-color';

import type {
	DeckVectorEntry,
	GeoArrowEntry,
	GeoJson3DEntry,
	PointCloudEntry
} from '$routes/map/data/types/model';

type PointCloudDatum = {
	position: [number, number, number];
	color: [number, number, number, number];
};

const pointCloudDataCache = new Map<string, PointCloudDatum[]>();

const getPointCloudData = (dataEntry: PointCloudEntry) => {
	const { positions, colors, pointCount } = dataEntry.format;
	if (!positions || pointCount === 0) return null;

	const cached = pointCloudDataCache.get(dataEntry.id);
	if (cached) return cached;

	const colorChannels = colors ? Math.round(colors.length / pointCount) : 0;

	const data = new Array<PointCloudDatum>(pointCount);
	for (let i = 0; i < pointCount; i++) {
		const posIdx = i * 3;
		data[i] = {
			position: [positions[posIdx], positions[posIdx + 1], positions[posIdx + 2]] as [
				number,
				number,
				number
			],
			color: colors
				? colorChannels === 4
					? ([colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2], colors[i * 4 + 3]] as [
						number,
						number,
						number,
						number
					])
					: ([colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2], 255] as [
						number,
						number,
						number,
						number
					])
				: ([255, 255, 255, 255] as [number, number, number, number])
		};
	}

	pointCloudDataCache.set(dataEntry.id, data);
	return data;
};

export const clearPointCloudDataCache = (entryId?: string) => {
	if (entryId) {
		pointCloudDataCache.delete(entryId);
		return;
	}
	pointCloudDataCache.clear();
};

export const createPointCloudLayer = (dataEntry: PointCloudEntry) => {
	const data = getPointCloudData(dataEntry);
	if (!data) return null;
	const coordinateOrigin = dataEntry.format.coordinateOrigin;

	return new PointCloudLayer({
		id: `point-cloud-layer-${dataEntry.id}`,
		data,
		getPosition: (d: { position: [number, number, number]; }) => d.position,
		getColor: (d: { color: [number, number, number, number]; }) => d.color,
		getNormal: [0, 0, 1],
		opacity: dataEntry.style.opacity,
		visible: dataEntry.style.visible ?? true,
		pointSize: dataEntry.style.pointSize ?? 1,
		parameters: { depthTest: false },
		beforeId: 'deck-reference-layer',
		...(coordinateOrigin
			? {
				coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
				coordinateOrigin
			}
			: {})
	});
};

const isGeoArrowEntry = (dataEntry: DeckVectorEntry): dataEntry is GeoArrowEntry =>
	dataEntry.format.type === 'geoarrow';

const createGeoArrowLayer = (dataEntry: GeoArrowEntry) =>
	dataEntry.format.geometryType === 'Point'
		? new GeoArrowScatterplotLayer({
			id: `geoarrow-layer-${dataEntry.id}`,
			data: dataEntry.format.table,
			pickable: dataEntry.interaction.clickable,
			opacity: dataEntry.style.opacity,
			visible: dataEntry.style.visible ?? true,
			filled: true,
			stroked: true,
			radiusMinPixels: 4,
			lineWidthMinPixels: 1,
			getFillColor: hexToRgba(dataEntry.style.color, 180),
			getLineColor: hexToRgba(dataEntry.style.color, 220),
			parameters: { depthTest: false },
			beforeId: 'deck-reference-layer'
		})
		: dataEntry.format.geometryType === 'LineString'
		? new GeoArrowPathLayer({
			id: `geoarrow-layer-${dataEntry.id}`,
			data: dataEntry.format.table,
			pickable: dataEntry.interaction.clickable,
			opacity: dataEntry.style.opacity,
			visible: dataEntry.style.visible ?? true,
			widthMinPixels: 2,
			getColor: hexToRgba(dataEntry.style.color, 220),
			parameters: { depthTest: false },
			beforeId: 'deck-reference-layer'
		})
		: new GeoArrowPolygonLayer({
			id: `geoarrow-layer-${dataEntry.id}`,
			data: dataEntry.format.table,
			pickable: dataEntry.interaction.clickable,
			opacity: dataEntry.style.opacity,
			visible: dataEntry.style.visible ?? true,
			filled: true,
			stroked: true,
			lineWidthMinPixels: 2,
			getFillColor: hexToRgba(dataEntry.style.color, 96),
			getLineColor: hexToRgba(dataEntry.style.color, 220),
			parameters: { depthTest: false },
			beforeId: 'deck-reference-layer'
		});

const createGeoJson3DLayer = (dataEntry: GeoJson3DEntry) =>
	new GeoJsonLayer({
		id: `geojson-3d-layer-${dataEntry.id}`,
		data: dataEntry.format.data,
		pickable: dataEntry.interaction.clickable,
		opacity: dataEntry.style.opacity,
		visible: dataEntry.style.visible ?? true,
		pointType: 'circle',
		stroked: true,
		filled: true,
		extruded: false,
		_full3d: true,
		lineWidthMinPixels: dataEntry.format.geometryType === 'LineString' ? 2 : 1,
		pointRadiusMinPixels: 4,
		...createGeoJsonColorAccessors(dataEntry.style),
		parameters: { depthTest: dataEntry.format.geometryType === 'Polygon' },
		beforeId: 'deck-reference-layer'
	});

export const createDeckVectorLayer = (dataEntry: DeckVectorEntry) => {
	if (isGeoArrowEntry(dataEntry)) {
		return createGeoArrowLayer(dataEntry);
	}

	return createGeoJson3DLayer(dataEntry);
};

export const createDeckOverlay = async (
	pointCloudEntries: PointCloudEntry[] = [],
	deckVectorEntries: DeckVectorEntry[] = []
) => {
	const pointCloudLayers = pointCloudEntries
		.map((entry) => createPointCloudLayer(entry))
		.filter((layer) => layer !== null);
	const deckVectorLayers = deckVectorEntries.map((entry) => createDeckVectorLayer(entry));

	return [...pointCloudLayers, ...deckVectorLayers];
};
