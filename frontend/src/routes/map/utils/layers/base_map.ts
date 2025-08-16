import { ENTRY_PMTILES_RASTER_PATH } from '$routes/constants';
import { selectedBaseMap } from '$routes/stores/layers';
import satelliteStyleJson from '$routes/map/utils/layers/satellite_style.json';
import hillshadStyleJson from '$routes/map/utils/layers/hillshad_style.json';
import { get } from 'svelte/store';

import type {
	LineLayerSpecification,
	RasterLayerSpecification,
	RasterSourceSpecification
} from 'maplibre-gl';

export const getBaseMapSources = (): Record<string, RasterSourceSpecification | undefined> => {
	if (get(selectedBaseMap) === 'satellite') {
		return {
			// オブジェクトのプロパティを展開（スプレッド演算子を外側で使用）
			base_seamlessphoto: satelliteStyleJson.sources.base_seamlessphoto,
			base_usgs_imagery_only: satelliteStyleJson.sources.base_usgs_imagery_only,
			base_gsi_rinya_m: {
				type: 'raster',
				tiles: [
					'https://raw.githubusercontent.com/forestacdev/tiles-ensyurin-photo/main/tiles/{z}/{x}/{y}.webp'
				],
				tileSize: 256,
				maxzoom: 18,
				minzoom: 14,
				attribution: ''
			}
		};
	}

	if (get(selectedBaseMap) === 'hillshade') {
		return {
			// オブジェクトのプロパティを展開（スプレッド演算子を外側で使用）
			earthhillshade: hillshadStyleJson.sources.earthhillshade,
			hillshademap: hillshadStyleJson.sources.hillshademap
		};
	}

	return {};
};

export const getBaseMapLayers = (): RasterLayerSpecification[] => {
	if (get(selectedBaseMap) === 'satellite') {
		return [
			{
				id: 'background',
				type: 'background',
				paint: {
					'background-color': '#000000'
				}
			},
			...(satelliteStyleJson.layers.filter(
				(layer) => layer.type === 'raster'
			) as RasterLayerSpecification[]),
			{
				id: 'base_gsi_rinya_m',
				source: 'base_gsi_rinya_m',
				type: 'raster',
				maxzoom: 24,
				minzoom: 12,
				paint: {
					'raster-opacity': 0.9,
					'raster-brightness-min': 0,
					'raster-brightness-max': 0.8
				}
			} as RasterLayerSpecification
		];
	}

	if (get(selectedBaseMap) === 'hillshade') {
		return [
			{
				id: 'background',
				type: 'background',
				paint: {
					'background-color': '#FFFFEE'
				}
			},
			...(hillshadStyleJson.layers.filter(
				(layer) => layer.type === 'raster'
			) as RasterLayerSpecification[])
		];
	}
};
