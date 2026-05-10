export const replaceDimensionPlaceholder = (value: string, dimensionValue?: string) => {
	if (!dimensionValue || !value.includes('{morivis:dimension}')) return value;
	return value.replaceAll('{morivis:dimension}', dimensionValue);
};

export const resolveDimensionPlaceholders = <T>(value: T, dimensionValue?: string): T => {
	if (!dimensionValue) return value;

	if (typeof value === 'string') {
		return replaceDimensionPlaceholder(value, dimensionValue) as T;
	}

	if (Array.isArray(value)) {
		return value.map((item) => resolveDimensionPlaceholders(item, dimensionValue)) as T;
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				resolveDimensionPlaceholders(item, dimensionValue)
			])
		) as T;
	}

	return value;
};
