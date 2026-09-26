import {
	DEFAULT_SYMBOL_TEXT_FONT,
	MAP_FONT_DATA_PATH,
	MAP_SPRITE_DATA_PATH
} from '$routes/constants';
import type { GeoRefPreviewData } from '$routes/map/components/upload/form/transform/georef-types';
import type { MorivisLayerEntry } from '$routes/map/data/types';
import { MAPTERHORN_DEM_SOURCE } from '$routes/map/utils/contours/config';
import { createLayersItems } from '$routes/map/utils/layers';
import { createContourStyle } from '$routes/map/utils/layers/contours';
import { createH3Style } from '$routes/map/utils/layers/h3';
import { ZONE_BBOX_FILL_PATTERN_ID } from '$routes/map/utils/layers/highlight';
import { createPlaneGridStyle } from '$routes/map/utils/layers/plane-grid';
import { previewBaseLayers } from '$routes/map/utils/layers/preview';
import type { ReferenceStyle } from '$routes/map/utils/layers/reference-style';
import { createRegionalMeshStyle } from '$routes/map/utils/layers/regional-mesh';
import type {
	LayerSpecification,
	SourceSpecification,
	StyleSpecification
} from '$routes/map/utils/maplibre';
import type { EpsgCode } from '$routes/map/utils/proj/dict';
import { createSourcesItems, type PreparedSourceData } from '$routes/map/utils/sources';
import { MODEL_OVERLAY_METADATA_KEY } from '$routes/map/utils/three/model-overlay-order';
import type { BaseMapType } from '$routes/stores/layers';
import type { FeatureCollection } from 'geojson';

export interface MapStyleInput {
	entries: MorivisLayerEntry[];
	mcaGridEntries: MorivisLayerEntry[];
	showDataEntry: MorivisLayerEntry | null;
	baseMap: BaseMapType | null;
	showHillshade: boolean;
	showStreetView: boolean;
	showLine: boolean;
	showLabel: boolean;
	isIsolatedPreview: boolean;
	isGeoRefRegistrationActive: boolean;
	geoRefPreviewData: GeoRefPreviewData | null;
	previewOpacity: number;
	isZoneRegistrationActive: boolean;
	selectedEpsgCode: EpsgCode;
	showXYZTile: boolean;
	showRegionalMesh: boolean;
	showPlaneGrid: boolean;
	planeGridZone: number;
	showH3: boolean;
	showContour: boolean;
	isGlobe: boolean;
	showModelView: boolean;
	isTerrain3d: boolean;
	streetViewPointData: FeatureCollection;
	streetViewLineData: FeatureCollection;
	drawGeojsonData: FeatureCollection;
	zoneBboxGeojsonData: FeatureCollection;
	searchGeojsonData: FeatureCollection | null;
}
export interface PreparedMapStyle {
	prepared: PreparedSourceData;
	previewPrepared: PreparedSourceData;
	referenceStyle: ReferenceStyle;
	contourDem?: { contourTiles: string; sharedDemTiles: string; };
}

/** ストア・通信・キャッシュに触れず、確定済み入力から描画仕様とUI用metadataを計算する。 */
export const createMapStyle = (input: MapStyleInput, resources: PreparedMapStyle) => {
	const {
		entries,
		mcaGridEntries,
		showDataEntry,
		baseMap,
		showHillshade,
		showStreetView,
		isIsolatedPreview,
		isGeoRefRegistrationActive,
		geoRefPreviewData,
		previewOpacity,
		isZoneRegistrationActive,
		selectedEpsgCode,
		showXYZTile,
		showRegionalMesh,
		showPlaneGrid,
		planeGridZone,
		showH3,
		isGlobe,
		showModelView,
		isTerrain3d,
		streetViewPointData,
		streetViewLineData,
		drawGeojsonData,
		zoneBboxGeojsonData,
		searchGeojsonData
	} = input;
	const { prepared, previewPrepared, referenceStyle, contourDem } = resources;
	const previewOptions = {
		mode: 'preview',
		baseMap: null,
		showHillshade: false,
		showStreetView: false
	} as const;
	const sources = !isIsolatedPreview || mcaGridEntries.length
		? createSourcesItems({
			entries: [...(!isIsolatedPreview ? entries : []), ...mcaGridEntries],
			prepared,
			mode: 'main',
			baseMap,
			referenceSources: referenceStyle.sources
		})
		: {};
	const mainResult = createLayersItems({
		entries: isIsolatedPreview ? [] : entries,
		mode: 'main',
		baseMap: isIsolatedPreview ? null : baseMap,
		showHillshade: !isIsolatedPreview && showHillshade,
		showStreetView: !isIsolatedPreview && showStreetView,
		referenceLayers: referenceStyle.layers
	});
	const layers = isIsolatedPreview ? [] : mainResult.layers;
	const mcaGridLayers = createLayersItems({ entries: mcaGridEntries, ...previewOptions }).layers
		.map((layer) => ({
			...layer,
			metadata: {
				...(typeof layer.metadata === 'object' && layer.metadata !== null
					? layer.metadata
					: {}),
				[MODEL_OVERLAY_METADATA_KEY]: true
			}
		}));

	let previewSources = showDataEntry
		? createSourcesItems({
			entries: [showDataEntry],
			prepared: previewPrepared,
			...previewOptions
		})
		: {};
	if (isIsolatedPreview) {
		previewSources = {
			...previewSources,
			openmaptiles: {
				type: 'vector',
				url: 'pmtiles://https://tile.openstreetmap.jp/static/planet.pmtiles'
			},
			v: {
				type: 'vector',
				minzoom: 4,
				maxzoom: 16,
				url: 'pmtiles://https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/optimal_bvmap-v1.pmtiles',
				attribution: '国土地理院最適化ベクトルタイル'
			}
		};
	}
	if (isGeoRefRegistrationActive && geoRefPreviewData) {
		previewSources = {
			...previewSources,
			georef_image_preview: {
				type: 'image',
				url: geoRefPreviewData.url,
				coordinates: geoRefPreviewData.coordinates
			} satisfies SourceSpecification
		};
	}
	const previewResult = createLayersItems({
		entries: showDataEntry ? [showDataEntry] : [],
		...previewOptions
	});
	let previewLayers = previewResult.layers;
	if (isIsolatedPreview) {
		previewLayers = [...previewBaseLayers, ...previewLayers];
	}
	if (isGeoRefRegistrationActive && geoRefPreviewData) {
		previewLayers = [
			...previewLayers,
			{
				id: '@georef_image_preview',
				type: 'raster',
				source: 'georef_image_preview',
				paint: {
					'raster-opacity': previewOpacity
				}
			}
		];
	}
	const zoneLayers: LayerSpecification[] = isZoneRegistrationActive
		? [
			{
				id: '@zone_bbox_select',
				type: 'fill',
				source: 'zone_bbox',
				filter: ['all', ['==', '$type', 'Polygon'], ['==', 'code', selectedEpsgCode]],
				paint: {
					'fill-pattern': ZONE_BBOX_FILL_PATTERN_ID,
					'fill-opacity': 1
				}
			},
			{
				id: '@zone_bbox',
				type: 'line',
				source: 'zone_bbox',
				filter: ['==', '$type', 'Polygon'],
				paint: {
					'line-color': 'white',
					'line-width': 1
				}
			}
		]
		: [];

	const xyzTileSources: Record<string, SourceSpecification> = showXYZTile
		? {
			tile_index: {
				type: 'vector',
				maxzoom: 22,
				tiles: ['tile_index://http://{z}/{x}/{y}.png?x={x}&y={y}&z={z}']
			}
		}
		: {};
	const xyzTileLayer: LayerSpecification[] = showXYZTile
		? [
			{
				id: '@tile_index_layer',
				type: 'fill',
				source: 'tile_index',
				'source-layer': 'geojsonLayer',
				maxzoom: 22,
				paint: {
					'fill-color': '#000000',
					'fill-opacity': 0
				}
			},
			{
				id: '@tile_index_line_layer',
				type: 'line',
				source: 'tile_index',
				'source-layer': 'geojsonLayer',
				paint: {
					'line-color': 'red',
					'line-width': 2
				}
			},
			{
				id: 'tile_index_line_label',
				type: 'symbol',
				source: 'tile_index',
				'source-layer': 'geojsonLayer',
				paint: {
					'text-color': 'red',
					'text-halo-color': '#FFFFFF',

					'text-halo-width': 3,
					'text-opacity': 1
				},
				layout: {
					'text-field': ['to-string', ['get', 'index']],
					'text-font': DEFAULT_SYMBOL_TEXT_FONT,
					'text-max-width': 12,
					'text-size': 24,
					'text-justify': 'auto'
				}
			}
		]
		: [];

	const terrain = {
		source: 'terrain',
		exaggeration: 1
	};

	const streetViewSources: Record<string, SourceSpecification> = showStreetView
		? {
			street_view_node_sources: {
				type: 'geojson',
				data: streetViewPointData
			},
			street_view_link_sources: {
				type: 'geojson',
				data: streetViewLineData
			}
		}
		: {};

	const regionalMeshStyle = createRegionalMeshStyle(
		showRegionalMesh,
		DEFAULT_SYMBOL_TEXT_FONT
	);
	const planeGridStyle = createPlaneGridStyle(
		showPlaneGrid,
		planeGridZone,
		DEFAULT_SYMBOL_TEXT_FONT
	);
	const h3Style = createH3Style(showH3, DEFAULT_SYMBOL_TEXT_FONT);
	const contourStyle = createContourStyle(contourDem?.contourTiles, DEFAULT_SYMBOL_TEXT_FONT);
	const mapStyle: StyleSpecification = {
		version: 8,
		sprite: MAP_SPRITE_DATA_PATH,
		glyphs: MAP_FONT_DATA_PATH,
		projection: {
			type: isGlobe ? 'globe' : 'mercator'
		},
		sources: {
			terrain: {
				...MAPTERHORN_DEM_SOURCE,
				tiles: contourDem ? [contourDem.sharedDemTiles] : MAPTERHORN_DEM_SOURCE.tiles
			},
			...streetViewSources,
			...xyzTileSources,
			...regionalMeshStyle.sources,
			...h3Style.sources,
			...planeGridStyle.sources,
			...contourStyle.sources,
			...sources,
			draw_source: {
				type: 'geojson',
				data: drawGeojsonData as FeatureCollection,
				promoteId: 'id'
			} as SourceSpecification,

			...previewSources,
			zone_bbox: {
				type: 'geojson',
				data: zoneBboxGeojsonData as FeatureCollection
			},
			search_result: {
				type: 'geojson',
				data: searchGeojsonData || {
					type: 'FeatureCollection',
					features: []
				}
			}
		},
		layers: [
			{
				id: '@background_layer',
				type: 'background' as const,
				paint: {
					'background-opacity': 1,
					'background-color': '#000'
				}
			},
			...layers,
			...contourStyle.layers,
			...xyzTileLayer,
			...regionalMeshStyle.layers,
			...h3Style.layers,
			...planeGridStyle.layers,
			...previewLayers,
			...mcaGridLayers,
			{
				id: 'deck-reference-layer',
				type: 'background' as const,
				paint: {
					'background-opacity': 0
				}
			},

			...zoneLayers,

			{
				id: '@search_result',
				type: 'symbol',
				source: 'search_result',
				layout: {
					'text-allow-overlap': true, // テキストの重複を許可
					'text-ignore-placement': true, // 他の要素への配置影響を無視
					'icon-allow-overlap': true, // アイコンの重複を許可
					'icon-ignore-placement': true,
					'icon-image': 'marker_png',
					'icon-anchor': 'bottom'
				}
			},
			{
				id: '@search_result_label',
				type: 'symbol',
				source: 'search_result',
				paint: {
					'text-color': '#000000',
					'text-halo-color': '#e8e8e8',
					'text-halo-width': 2
				},

				layout: {
					'text-field': '{name}',
					'text-size': 11,
					'text-max-width': 10,
					'text-font': DEFAULT_SYMBOL_TEXT_FONT,
					'text-variable-anchor': ['bottom-left', 'bottom-right'],
					'text-radial-offset': 2,
					'text-justify': 'auto'
				}
			}
		],
		sky: showModelView
			? undefined
			: {
				'sky-color': '#2baeff',
				'sky-horizon-blend': 0.5,
				'horizon-color': '#ffffff',
				'horizon-fog-blend': 0.5,
				'fog-color': '#2222ff',
				'fog-ground-blend': 0.5,
				'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0]
			},
		transition: { duration: 0, delay: 0 },
		terrain: isTerrain3d ? terrain : undefined
	};
	return {
		style: mapStyle,
		metadata: {
			clickableVectorIds: mainResult.clickableVectorIds,
			clickableRasterIds: mainResult.clickableRasterIds,
			attributions: [...new Set([...mainResult.attributions, ...previewResult.attributions])]
		}
	};
};
