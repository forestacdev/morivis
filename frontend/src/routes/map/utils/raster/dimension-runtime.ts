import type { SourceSpecification } from 'maplibre-gl';

import type { GeoDataEntry } from '$routes/map/data/types';
import type { RasterDiscreteDimension } from '$routes/map/data/types/raster';
import {
	replaceDimensionPlaceholder,
	resolveDimensionPlaceholders
} from '$routes/map/utils/dimension';

type RuntimeDimensionUpdate =
	| {
			type: 'tiles';
			sourceId: string;
			tiles: string[];
	  }
	| {
			type: 'geojson-data';
			sourceId: string;
			data: string;
	  };

const getDimensionValue = (dimension?: RasterDiscreteDimension) => {
	if (!dimension) return undefined;
	return dimension.values[dimension.currentIndex];
};

const convertTmsToXyz = (url: string) => {
	return url.replace('{-y}', '{y}');
};

const hasDimensionPlaceholder = (value: unknown): boolean => {
	if (typeof value === 'string') {
		return value.includes('{morivis:dimension}');
	}

	if (Array.isArray(value)) {
		return value.some((item) => hasDimensionPlaceholder(item));
	}

	if (value && typeof value === 'object') {
		return Object.values(value).some((item) => hasDimensionPlaceholder(item));
	}

	return false;
};

export const canApplyRasterDimensionRuntimeUpdate = (entry: GeoDataEntry) => {
	if (entry.type !== 'raster') return false;

	const dimensionValue = getDimensionValue(entry.style.dimension);
	if (!dimensionValue) return false;

	// 単純な URL 置換で済むラスタだけを runtime update 対象にする。
	// TIFF / DEM はソース再生成が必要なので setStyle 側に残す。
	const canUpdateMainSource =
		entry.format.type === 'image' &&
		entry.style.type !== 'tiff' &&
		entry.style.type !== 'dem' &&
		'url' in entry.format &&
		entry.format.url.includes('{morivis:dimension}');

	const canUpdateAuxiliarySource = Object.values(entry.auxiliaryLayers?.sources ?? {}).some(
		(source) => hasDimensionPlaceholder(source)
	);

	return canUpdateMainSource || canUpdateAuxiliarySource;
};

export const getRasterDimensionRuntimeUpdates = (entry: GeoDataEntry): RuntimeDimensionUpdate[] => {
	if (entry.type !== 'raster') return [];

	const dimensionValue = getDimensionValue(entry.style.dimension);
	if (!dimensionValue) return [];

	const updates: RuntimeDimensionUpdate[] = [];

	if (
		entry.format.type === 'image' &&
		entry.style.type !== 'tiff' &&
		entry.style.type !== 'dem' &&
		'url' in entry.format &&
		entry.format.url.includes('{morivis:dimension}')
	) {
		updates.push({
			type: 'tiles',
			sourceId: `${entry.id}_source`,
			tiles: [replaceDimensionPlaceholder(convertTmsToXyz(entry.format.url), dimensionValue)]
		});
	}

	Object.entries(entry.auxiliaryLayers?.sources ?? {}).forEach(([sourceId, source]) => {
		if (!hasDimensionPlaceholder(source)) return;

		// 補助ソースも同じ dimension 値で置換して、必要な source だけ差し替える。
		const resolvedSource = resolveDimensionPlaceholders(
			source,
			dimensionValue
		) as SourceSpecification;

		if (resolvedSource.type === 'geojson' && typeof resolvedSource.data === 'string') {
			updates.push({
				type: 'geojson-data',
				sourceId,
				data: resolvedSource.data
			});
		}

		if (
			resolvedSource.type === 'raster' &&
			'tiles' in resolvedSource &&
			Array.isArray(resolvedSource.tiles)
		) {
			updates.push({
				type: 'tiles',
				sourceId,
				tiles: resolvedSource.tiles
			});
		}
	});

	return updates;
};

export const getLayerWatchStyleTarget = (entry: GeoDataEntry) => {
	if (entry.type !== 'raster') {
		return entry.style;
	}

	if (!canApplyRasterDimensionRuntimeUpdate(entry) || !entry.style.dimension) {
		return entry.style;
	}

	// runtime update できるラスタは currentIndex を監視対象から外して、
	// Map.svelte の setStyleDebounce を発火させない。
	return {
		...entry.style,
		dimension: {
			...entry.style.dimension,
			currentIndex: -1
		}
	};
};
