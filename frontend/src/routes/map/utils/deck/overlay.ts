import {
	sanitizeScenegraphGltfForDeck,
	type ScenegraphGltfLike
} from '$routes/map/utils/tiles3d/sanitize-scenegraph-gltf';
import { Tile3DLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer, PointCloudLayer } from '@deck.gl/layers';
import {
	GeoArrowPathLayer,
	GeoArrowPolygonLayer,
	GeoArrowScatterplotLayer
} from '@geoarrow/deck.gl-layers';

import type {
	AnyTiles3DEntry,
	DeckVectorEntry,
	GeoArrowEntry,
	GeoJson3DEntry,
	PointCloudEntry,
	Tiles3DMeshStyle
} from '$routes/map/data/types/model';

interface TileContent {
	cartographicOrigin?: number[];
	gltf?: ScenegraphGltfLike;
}

interface Tile3D {
	content?: TileContent;
}

type Tile3DLayerPatchedMethods = {
	_getSubLayer?: (tile: Tile3D, oldLayer?: unknown) => unknown;
};

type CloneableDeckLayer = {
	id?: string;
	constructor?: {
		layerName?: string;
	};
	clone: (props: Record<string, unknown>) => unknown;
};

type PointCloudDatum = {
	position: [number, number, number];
	color: [number, number, number, number];
};

const hexToRgba = (color: string, alpha = 255): [number, number, number, number] => {
	const normalized = color.replace('#', '');
	const hex = normalized.length === 3
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

const isCloneableDeckLayer = (layer: unknown): layer is CloneableDeckLayer =>
	typeof layer === 'object'
	&& layer !== null
	&& 'clone' in layer
	&& typeof (layer as { clone?: unknown; }).clone === 'function';

const getTiles3DMeshStyleSignature = (style: Tiles3DMeshStyle) =>
	[
		style.color,
		style.lighting,
		style.opacity,
		style.visible ?? true
	].join(':');

const getTiles3DMeshSubLayerProps = (style: Tiles3DMeshStyle) => ({
	getColor: hexToRgba(style.color)
});

export const createTiles3DLayer = (dataEntry: AnyTiles3DEntry) => {
	const altitudeOffset = dataEntry.metaData.altitude ?? 0;

	const layer = new Tile3DLayer({
		id: `3d-tiles-layer-${dataEntry.id}`,
		data: dataEntry.format.url,
		pickable: dataEntry.interaction.clickable,
		opacity: dataEntry.style.opacity,
		visible: dataEntry.style.visible ?? true,
		morivisStyleSignature: dataEntry.style.type === '3d-tiles-mesh'
			? getTiles3DMeshStyleSignature(dataEntry.style)
			: undefined,
		pointSize: dataEntry.style.type === 'point-cloud'
			? (dataEntry.style.pointSize ?? 1)
			: undefined,
		parameters: { depthTest: false },
		beforeId: 'deck-reference-layer',
		loadOptions: {
			'3d-tiles': { decodeQuantizedPositions: true }
		},
		onTileLoad: (tile: Tile3D) => {
			sanitizeScenegraphGltfForDeck(tile.content?.gltf);

			if (tile.content?.cartographicOrigin && altitudeOffset !== 0) {
				// 高さオフセットは既存動作に合わせて未適用のままにしている。
			}
		}
	});

	const patchedLayer = layer as unknown as Tile3DLayerPatchedMethods;
	const originalGetSubLayer = patchedLayer._getSubLayer?.bind(patchedLayer);

	if (originalGetSubLayer) {
		// FME 製 b3dm 向けの一時回避。
		// onTileLoad だけだと ScenegraphLayer 初期化タイミングに間に合わない場合があるため、
		// deck.gl の内部サブレイヤー生成直前にも同じ補正を入れている。
		// vis.gl 側の更新で不要になったら削除候補。
		patchedLayer._getSubLayer = (tile: Tile3D, oldLayer?: unknown) => {
			sanitizeScenegraphGltfForDeck(tile.content?.gltf);
			const subLayer = originalGetSubLayer(tile, oldLayer);

			if (dataEntry.style.type !== '3d-tiles-mesh' || !isCloneableDeckLayer(subLayer)) {
				return subLayer;
			}

			const subLayerName = [
				subLayer.constructor?.layerName ?? '',
				subLayer.id ?? ''
			]
				.join(' ')
				.toLowerCase();
			const sharedProps = getTiles3DMeshSubLayerProps(dataEntry.style);

			if (subLayerName.includes('scenegraph')) {
				return subLayer.clone({
					...sharedProps,
					getTransformMatrix: [],
					_lighting: dataEntry.style.lighting
				});
			}

			if (subLayerName.includes('mesh')) {
				return subLayer.clone(sharedProps);
			}

			return subLayer;
		};
	}

	return layer;
};

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
		beforeId: 'deck-reference-layer'
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
		getFillColor: hexToRgba(dataEntry.style.color, 180),
		getLineColor: hexToRgba(dataEntry.style.color, 220),
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
	tiles3dEntries: AnyTiles3DEntry[],
	pointCloudEntries: PointCloudEntry[] = [],
	deckVectorEntries: DeckVectorEntry[] = []
) => {
	const tiles3dLayers = tiles3dEntries.map((entry) => createTiles3DLayer(entry));
	const pointCloudLayers = pointCloudEntries
		.map((entry) => createPointCloudLayer(entry))
		.filter((layer) => layer !== null);
	const deckVectorLayers = deckVectorEntries.map((entry) => createDeckVectorLayer(entry));

	return [...tiles3dLayers, ...pointCloudLayers, ...deckVectorLayers];
};
