import type { SourceSpecification } from 'maplibre-gl';

import type { MorivisLayerEntry } from '$routes/map/data/types';
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

export const getRasterDimensionCurrentIndex = (entry: MorivisLayerEntry) => {
	if (entry.type !== 'raster') return undefined;
	return entry.state?.dimension?.currentIndex;
};

export const getRasterDimension = (entry: MorivisLayerEntry) => {
	if (entry.type !== 'raster') return undefined;
	return entry.properties?.temporal?.dimension;
};

export const getRasterDimensionValue = (entry: MorivisLayerEntry) => {
	const dimension = getRasterDimension(entry);
	const currentIndex = getRasterDimensionCurrentIndex(entry);

	if (!dimension || currentIndex == null) return undefined;
	return dimension.values[currentIndex];
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

export const canApplyRasterDimensionRuntimeUpdate = (entry: MorivisLayerEntry) => {
	if (entry.type !== 'raster') return false;

	const dimensionValue = getRasterDimensionValue(entry);
	if (!dimensionValue) return false;

	// 単純な URL 置換で済むラスタだけを runtime update 対象にする。
	// TIFF / DEM はソース再生成が必要なので setStyle 側に残す。
	const canUpdateMainSource = entry.format.type === 'image'
		&& entry.style.type !== 'tiff'
		&& entry.style.type !== 'dem'
		&& 'url' in entry.format
		&& entry.format.url.includes('{morivis:dimension}');

	const canUpdateAuxiliarySource = Object.values(entry.auxiliaryLayers?.sources ?? {}).some(
		(source) => hasDimensionPlaceholder(source)
	);

	return canUpdateMainSource || canUpdateAuxiliarySource;
};

export const getRasterDimensionRuntimeUpdates = (
	entry: MorivisLayerEntry
): RuntimeDimensionUpdate[] => {
	if (entry.type !== 'raster') return [];

	const dimensionValue = getRasterDimensionValue(entry);
	if (!dimensionValue) return [];

	const updates: RuntimeDimensionUpdate[] = [];

	if (
		entry.format.type === 'image'
		&& entry.style.type !== 'tiff'
		&& entry.style.type !== 'dem'
		&& 'url' in entry.format
		&& entry.format.url.includes('{morivis:dimension}')
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
			resolvedSource.type === 'raster'
			&& 'tiles' in resolvedSource
			&& Array.isArray(resolvedSource.tiles)
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

export const getLayerWatchStyleTarget = (entry: MorivisLayerEntry) => {
	return {
		...entry.style
	};
};
