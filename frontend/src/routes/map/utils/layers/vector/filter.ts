import type { GeoDataEntry } from '$routes/map/data/types';
import type { ExpressionSpecification, FilterSpecification } from 'maplibre-gl';

export const combineFilters = (
	...filters: Array<FilterSpecification | undefined>
): FilterSpecification | undefined => {
	const validFilters = filters.filter((filter): filter is FilterSpecification => Boolean(filter));

	if (validFilters.length === 0) return undefined;
	if (validFilters.length === 1) return validFilters[0];

	return ['all', ...validFilters] as FilterSpecification;
};

export const getTemporalFilter = (entry: GeoDataEntry): FilterSpecification | undefined => {
	if (entry.type !== 'vector') return undefined;
	if (entry.format.type !== 'geojson') return undefined;

	const temporalFilterState = entry.state?.temporalFilter;
	if (!temporalFilterState?.enabled) return undefined;

	const temporalConfig =
		entry.properties.temporal ??
		(entry.properties.attributeView.timeKey
			? { key: entry.properties.attributeView.timeKey }
			: undefined);
	if (!temporalConfig) return undefined;

	const temporalKeys = [temporalConfig.key, ...(temporalConfig.alternateKeys ?? [])].filter(
		(key): key is string => Boolean(key)
	);
	if (temporalKeys.length === 0) return undefined;

	const temporalValues = (temporalConfig.items ?? []).map((item) => item.raw);
	if (temporalValues.length === 0) return undefined;

	const startIndex = Math.min(temporalFilterState.startIndex, temporalValues.length - 1);
	const endIndex = Math.min(temporalFilterState.endIndex, temporalValues.length - 1);
	const startValue = temporalValues[startIndex];
	const endValue = temporalValues[endIndex];
	if (!startValue || !endValue) return undefined;
	const isSingleStartMode = temporalFilterState.mode === 'single_start';

	const temporalExpression =
		temporalKeys.length === 1
			? (['get', temporalKeys[0]] as ExpressionSpecification)
			: ([
					'coalesce',
					...temporalKeys.map((key) => ['get', key]),
					''
				] as unknown as ExpressionSpecification);

	if (isSingleStartMode) {
		return ['==', temporalExpression, startValue] as unknown as FilterSpecification;
	}

	return [
		'all',
		['>=', temporalExpression, startValue],
		['<=', temporalExpression, endValue]
	] as unknown as FilterSpecification;
};
