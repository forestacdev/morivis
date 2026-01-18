import type { Region } from '$routes/map/data/types/location';
import type { Tag } from '$routes/map/data/types/tags';
import type { AttributionKey } from '$routes/map/data/entries/_meta_data/_attribution';
import type {
	RasterImageEntry,
	RasterPMTilesEntry,
	RasterBaseMapStyle,
	RasterDemStyle,
	RasterCategoricalStyle,
	RasterCadStyle,
	TileSize,
	CategoryLegend,
	GradientLegend,
	ImageLegend,
	DemDataTypeKey,
	ColorMapType,
	TileXYZ
} from '$routes/map/data/types/raster';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { resolveBounds, type Bounds } from '$routes/map/data/entries/_meta_data/_bounds_map';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';

// ヘルパー関数: xyzImageTileの解決
function resolveXyzImageTile(input: keyof typeof IMAGE_TILE_XYZ_SETS): TileXYZ {
	return IMAGE_TILE_XYZ_SETS[input];
}

type XYZPresetKey = keyof typeof IMAGE_TILE_XYZ_SETS;

// ========================================
// ベースマップ用ファクトリー
// ========================================
export interface BasemapEntryConfig {
	id: string;
	name: string;
	url: string;
	attribution: AttributionKey;
	location?: Region;
	bounds?: Region | Bounds;
	tags?: Tag[];
	downloadUrl?: string;
	zoom?: { min: number; max: number };
	tileSize?: TileSize;
	xyzImageTile?: XYZPresetKey;
}

export function createBasemapEntry(
	config: BasemapEntryConfig
): RasterImageEntry<RasterBaseMapStyle> {
	const {
		id,
		name,
		url,
		attribution,
		location = '全国',
		bounds = location,
		tags = ['基本図', '背景地図'],
		downloadUrl,
		zoom = { min: 0, max: 18 },
		tileSize = 256,
		xyzImageTile = 'zoom_15'
	} = config;

	return {
		id,
		type: 'raster',
		format: {
			type: 'image',
			url
		},
		metaData: {
			name,
			attribution,
			downloadUrl,
			location,
			tags,
			minZoom: zoom.min,
			maxZoom: zoom.max,
			tileSize,
			bounds: resolveBounds(bounds),
			xyzImageTile: IMAGE_TILE_XYZ_SETS[xyzImageTile]
		},
		interaction: {
			...DEFAULT_RASTER_BASEMAP_INTERACTION
		},
		style: {
			...DEFAULT_RASTER_BASEMAP_STYLE
		}
	};
}

// ========================================
// DEM用ファクトリー
// ========================================
export interface DemEntryConfig {
	id: string;
	name: string;
	url: string;
	attribution: AttributionKey;
	location: Region;
	bounds?: Region | Bounds;
	tags?: Tag[];
	downloadUrl?: string;
	sourceDataName?: string;
	zoom?: { min: number; max: number };
	tileSize?: TileSize;
	xyzImageTile?: XYZPresetKey;
	demType?: DemDataTypeKey;
	reliefRange?: { min: number; max: number };
	colorMap?: ColorMapType;
	format?: 'image' | 'pmtiles';
}

export function createDemEntry(config: DemEntryConfig): RasterImageEntry<RasterDemStyle>;
export function createDemEntry(
	config: DemEntryConfig & { format: 'pmtiles' }
): RasterPMTilesEntry<RasterDemStyle>;
export function createDemEntry(
	config: DemEntryConfig
): RasterImageEntry<RasterDemStyle> | RasterPMTilesEntry<RasterDemStyle> {
	const {
		id,
		name,
		url,
		attribution,
		location,
		bounds = location,
		tags = ['DEM', '地形'] as Tag[],
		downloadUrl,
		sourceDataName,
		zoom = { min: 0, max: 18 },
		tileSize = 256,
		xyzImageTile = 'zoom_15',
		demType = 'gsi',
		reliefRange = { min: 0, max: 4000 },
		colorMap = 'jet',
		format = 'image'
	} = config;

	const metaData: RasterImageEntry<RasterDemStyle>['metaData'] = {
		name,
		sourceDataName,
		attribution,
		downloadUrl,
		location,
		tags,
		minZoom: zoom.min,
		maxZoom: zoom.max,
		tileSize,
		bounds: resolveBounds(bounds),
		xyzImageTile: IMAGE_TILE_XYZ_SETS[xyzImageTile]
	};

	const style: RasterDemStyle = {
		type: 'dem',
		opacity: 1.0,
		visualization: {
			demType,
			mode: 'relief',
			uniformsData: {
				relief: {
					max: reliefRange.max,
					min: reliefRange.min,
					colorMap
				},
				slope: {
					max: 90,
					min: 0,
					colorMap: 'salinity'
				},
				aspect: {
					colorMap: 'rainbow-soft'
				}
			}
		}
	};

	if (format === 'pmtiles') {
		return {
			id,
			type: 'raster',
			format: { type: 'pmtiles', url },
			metaData,
			interaction: { clickable: false },
			style
		};
	}

	return {
		id,
		type: 'raster',
		format: { type: 'image', url },
		metaData,
		interaction: { clickable: false },
		style
	};
}

// ========================================
// カテゴリカルラスター用ファクトリー
// ========================================
export interface CategoricalRasterEntryConfig {
	id: string;
	name: string;
	url: string;
	attribution: AttributionKey;
	location: Region;
	bounds?: Region | Bounds;
	tags?: Tag[];
	downloadUrl?: string;
	sourceDataName?: string;
	zoom?: { min: number; max: number };
	tileSize?: TileSize;
	xyzImageTile?: XYZPresetKey;
	legend: CategoryLegend | GradientLegend | ImageLegend;
	opacity?: 0.3 | 0.5 | 0.7 | 1;
	resampling?: 'nearest' | 'linear';
	format?: 'image' | 'pmtiles';
}

export function createCategoricalRasterEntry(
	config: CategoricalRasterEntryConfig
): RasterImageEntry<RasterCategoricalStyle>;
export function createCategoricalRasterEntry(
	config: CategoricalRasterEntryConfig & { format: 'pmtiles' }
): RasterPMTilesEntry<RasterCategoricalStyle>;
export function createCategoricalRasterEntry(
	config: CategoricalRasterEntryConfig
): RasterImageEntry<RasterCategoricalStyle> | RasterPMTilesEntry<RasterCategoricalStyle> {
	const {
		id,
		name,
		url,
		attribution,
		location,
		bounds = location,
		tags = [] as Tag[],
		downloadUrl,
		sourceDataName,
		zoom = { min: 0, max: 18 },
		tileSize = 256,
		xyzImageTile = 'zoom_15',
		legend,
		opacity = 0.7,
		resampling,
		format = 'image'
	} = config;

	const metaData: RasterImageEntry<RasterCategoricalStyle>['metaData'] = {
		name,
		sourceDataName,
		attribution,
		downloadUrl,
		location,
		tags,
		minZoom: zoom.min,
		maxZoom: zoom.max,
		tileSize,
		bounds: resolveBounds(bounds),
		xyzImageTile: IMAGE_TILE_XYZ_SETS[xyzImageTile]
	};

	const style: RasterCategoricalStyle = {
		type: 'categorical',
		opacity,
		visible: true,
		legend,
		...(resampling && { resampling })
	};

	if (format === 'pmtiles') {
		return {
			id,
			type: 'raster',
			format: { type: 'pmtiles', url },
			metaData,
			interaction: { clickable: false },
			style
		};
	}

	return {
		id,
		type: 'raster',
		format: { type: 'image', url },
		metaData,
		interaction: { clickable: false },
		style
	};
}

// ========================================
// CAD用ファクトリー
// ========================================
export interface CadRasterEntryConfig {
	id: string;
	name: string;
	url: string;
	attribution: AttributionKey;
	location: Region;
	bounds?: Region | Bounds;
	tags?: Tag[];
	downloadUrl?: string;
	zoom?: { min: number; max: number };
	tileSize?: TileSize;
	xyzImageTile?: XYZPresetKey;
	color?: string;
	opacity?: 0.3 | 0.5 | 0.7 | 1;
}

export function createCadRasterEntry(
	config: CadRasterEntryConfig
): RasterPMTilesEntry<RasterCadStyle> {
	const {
		id,
		name,
		url,
		attribution,
		location,
		bounds = location,
		tags = ['CAD', '施設平面図'] as Tag[],
		downloadUrl,
		zoom = { min: 0, max: 24 },
		tileSize = 256,
		xyzImageTile = 'zoom_15',
		color = '#000000',
		opacity = 0.7
	} = config;

	const metaData: RasterPMTilesEntry<RasterCadStyle>['metaData'] = {
		name,
		attribution,
		downloadUrl,
		location,
		tags,
		minZoom: zoom.min,
		maxZoom: zoom.max,
		tileSize,
		bounds: resolveBounds(bounds),
		xyzImageTile: IMAGE_TILE_XYZ_SETS[xyzImageTile]
	};

	return {
		id,
		type: 'raster',
		format: { type: 'pmtiles', url },
		metaData,
		interaction: { clickable: false },
		style: {
			type: 'cad',
			opacity,
			color
		}
	};
}
