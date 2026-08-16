import { createMatchColorMapping } from '$routes/map/data/entries/vector/_style';
import { createAdjustableRange } from '$routes/map/data/types';
import type {
	ColorMatchExpression,
	ColorStepExpression
} from '$routes/map/data/types/vector/style';
import type { VectorTileMetadataLayer } from './tile-metadata';

const MIN_CATEGORIES = 2;
const SMALL_CATEGORY_LIMIT = 12;
const MAX_CATEGORIES = 30;
const MAX_AUTO_COLOR_EXPRESSIONS = 8;

const isNumericAttributeType = (rawType?: string): boolean => {
	const type = rawType?.trim().toLowerCase();
	if (!type) return false;

	return (
		type.includes('number')
		|| type.includes('numeric')
		|| type.includes('decimal')
		|| type.includes('double')
		|| type.includes('float')
		|| type.includes('real')
		|| type.includes('int')
		|| type.includes('uint')
		|| type.includes('long')
		|| type.includes('short')
	);
};

const toFiniteNumber = (value: unknown): number | undefined => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : undefined;
	}

	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	return undefined;
};

const getUniqueCategories = (
	values: Array<string | number | boolean> | undefined
): Array<string | number> => {
	if (!values?.length) return [];

	const categories: Array<string | number> = [];
	const seen = new Set<string>();

	for (const value of values) {
		if (value == null || value === '') continue;

		const normalized = typeof value === 'number' ? value : String(value);
		const key = `${typeof normalized}:${normalized}`;
		if (seen.has(key)) continue;

		seen.add(key);
		categories.push(normalized);

		if (categories.length > MAX_CATEGORIES) {
			return [];
		}
	}

	return categories;
};

const createMatchExpression = (
	key: string,
	categories: Array<string | number>
): ColorMatchExpression => {
	const isNumericOnly = categories.every((value) => typeof value === 'number');

	return {
		type: 'match',
		key,
		name: key,
		mapping: createMatchColorMapping(
			isNumericOnly ? (categories as number[]) : categories.map((value) => String(value))
		)
	};
};

export const buildVectorTileColorExpressions = (
	layer: VectorTileMetadataLayer
): (ColorMatchExpression | ColorStepExpression)[] => {
	const expressions: (ColorMatchExpression | ColorStepExpression)[] = [];

	for (const attribute of layer.attributes ?? []) {
		if (expressions.length >= MAX_AUTO_COLOR_EXPRESSIONS) break;

		const key = attribute.attribute?.trim();
		if (!key) continue;

		const categories = getUniqueCategories(attribute.values);
		if (categories.length >= MIN_CATEGORIES && categories.length <= SMALL_CATEGORY_LIMIT) {
			expressions.push(createMatchExpression(key, categories));
			continue;
		}

		const min = toFiniteNumber(attribute.min);
		const max = toFiniteNumber(attribute.max);
		const isNumericOnly = categories.length > 0
			&& categories.every((value) => typeof value === 'number');
		if (
			(isNumericAttributeType(attribute.type) || isNumericOnly) && min != null && max != null
			&& min < max
		) {
			expressions.push({
				type: 'step',
				key,
				name: key,
				mapping: {
					scheme: 'YlOrRd',
					range: createAdjustableRange(min, max),
					divisions: 5
				}
			});
			continue;
		}

		if (categories.length >= MIN_CATEGORIES && categories.length <= MAX_CATEGORIES) {
			expressions.push(createMatchExpression(key, categories));
		}
	}

	return expressions;
};
