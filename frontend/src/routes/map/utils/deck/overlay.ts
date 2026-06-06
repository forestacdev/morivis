import { Tile3DLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer, PointCloudLayer } from '@deck.gl/layers';
import {
	GeoArrowPathLayer,
	GeoArrowPolygonLayer,
	GeoArrowScatterplotLayer
} from '@geoarrow/deck.gl-layers';

import type {
	AnyModelTiles3DEntry,
	ModelDeckVectorEntry,
	ModelGeoArrowEntry,
	ModelGeoJson3DEntry,
	ModelPointCloudEntry
} from '$routes/map/data/types/model';

interface TileContent {
	cartographicOrigin?: number[];
}

interface Tile3D {
	content?: TileContent;
}

type PointCloudDatum = {
	position: [number, number, number];
	color: [number, number, number, number];
};

const hexToRgba = (color: string, alpha = 255): [number, number, number, number] => {
	const normalized = color.replace('#', '');
	const hex =
		normalized.length === 3
			? normalized
					.split('')
					.map((char) => char + char)
					.join('')
			: normalized;

	if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
		return [64, 140, 255, alpha];
	}

	return [
		parseInt(hex.slice(0, 2), 16),
		parseInt(hex.slice(2, 4), 16),
		parseInt(hex.slice(4, 6), 16),
		alpha
	];
};

const pointCloudDataCache = new Map<string, PointCloudDatum[]>();

export const createTiles3DLayer = (dataEntry: AnyModelTiles3DEntry) => {
	const altitudeOffset = dataEntry.metaData.altitude ?? 0;

	return new Tile3DLayer({
		id: `3d-tiles-layer-${dataEntry.id}`,
		data: dataEntry.format.url,
		pickable: dataEntry.interaction.clickable,
		opacity: dataEntry.style.opacity,
		visible: dataEntry.style.visible ?? true,
		pointSize:
			dataEntry.style.type === 'point-cloud' ? (dataEntry.style.pointSize ?? 1) : undefined,
		parameters: { depthTest: false },
		beforeId: 'deck-reference-layer',
		loadOptions: {
			'3d-tiles': { decodeQuantizedPositions: true }
		},
		onTileLoad: (tile: Tile3D) => {
			if (tile.content?.cartographicOrigin && altitudeOffset !== 0) {
				// 高さオフセットは既存動作に合わせて未適用のままにしている。
			}
		}
	});
};

const getPointCloudData = (dataEntry: ModelPointCloudEntry) => {
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

export const createPointCloudLayer = (dataEntry: ModelPointCloudEntry) => {
	const data = getPointCloudData(dataEntry);
	if (!data) return null;

	return new PointCloudLayer({
		id: `point-cloud-layer-${dataEntry.id}`,
		data,
		getPosition: (d: { position: [number, number, number] }) => d.position,
		getColor: (d: { color: [number, number, number, number] }) => d.color,
		getNormal: [0, 0, 1],
		opacity: dataEntry.style.opacity,
		visible: dataEntry.style.visible ?? true,
		pointSize: dataEntry.style.pointSize ?? 1,
		parameters: { depthTest: false },
		beforeId: 'deck-reference-layer'
	});
};

const isGeoArrowEntry = (dataEntry: ModelDeckVectorEntry): dataEntry is ModelGeoArrowEntry =>
	dataEntry.format.type === 'geoarrow';

const createGeoArrowLayer = (dataEntry: ModelGeoArrowEntry) =>
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

const createGeoJson3DLayer = (dataEntry: ModelGeoJson3DEntry) =>
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
		getFillColor: hexToRgba(dataEntry.style.color, 180),
		getLineColor: hexToRgba(dataEntry.style.color, 220),
		parameters: { depthTest: dataEntry.format.geometryType === 'Polygon' },
		beforeId: 'deck-reference-layer'
	});

export const createDeckVectorLayer = (dataEntry: ModelDeckVectorEntry) => {
	if (isGeoArrowEntry(dataEntry)) {
		return createGeoArrowLayer(dataEntry);
	}

	return createGeoJson3DLayer(dataEntry);
};

export const createDeckOverlay = async (
	tiles3dEntries: AnyModelTiles3DEntry[],
	pointCloudEntries: ModelPointCloudEntry[] = [],
	deckVectorEntries: ModelDeckVectorEntry[] = []
) => {
	const tiles3dLayers = tiles3dEntries.map((entry) => createTiles3DLayer(entry));
	const pointCloudLayers = pointCloudEntries
		.map((entry) => createPointCloudLayer(entry))
		.filter((layer) => layer !== null);
	const deckVectorLayers = deckVectorEntries.map((entry) => createDeckVectorLayer(entry));

	return [...tiles3dLayers, ...pointCloudLayers, ...deckVectorLayers];
};
