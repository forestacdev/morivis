import type { FilterSpecification } from 'maplibre-gl';

export const combineFilters = (
	...filters: Array<FilterSpecification | undefined>
): FilterSpecification | undefined => {
	const validFilters = filters.filter((filter): filter is FilterSpecification => Boolean(filter));

	if (validFilters.length === 0) return undefined;
	if (validFilters.length === 1) return validFilters[0];

	return ['all', ...validFilters] as FilterSpecification;
};
