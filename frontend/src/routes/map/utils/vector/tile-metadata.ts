import type { FieldDef, Title } from '$routes/map/data/types/vector/properties';

export interface VectorTileStatAttribute {
	attribute: string;
	type?: string;
	values?: Array<string | number | boolean>;
	min?: number;
	max?: number;
}

export interface RawVectorTileLayerMetadata {
	id: string;
	fields?: Record<string, string>;
	geometry_type?: string;
	minzoom?: number;
	maxzoom?: number;
}

export interface RawVectorTileStatsLayerMetadata {
	layer: string;
	geometry?: string;
	attributes?: VectorTileStatAttribute[];
}

export interface VectorTileMetadataLayer {
	id: string;
	fields: Record<string, string>;
	geometryType?: string;
	minZoom?: number;
	maxZoom?: number;
	attributes?: VectorTileStatAttribute[];
}

const inferFieldType = (rawType?: string): FieldDef['type'] => {
	const type = rawType?.trim().toLowerCase();
	if (!type) return undefined;

	if (type.includes('bool') || type === 'boolean') {
		return 'boolean';
	}

	if (type === 'date' || type.includes('date')) {
		return type.includes('time') ? 'datetime' : 'date';
	}

	if (
		type.includes('int')
		|| type.includes('uint')
		|| type.includes('long')
		|| type.includes('short')
	) {
		return 'integer';
	}

	if (
		type.includes('number')
		|| type.includes('numeric')
		|| type.includes('decimal')
		|| type.includes('double')
		|| type.includes('float')
		|| type.includes('real')
	) {
		return 'number';
	}

	if (type.includes('string') || type.includes('text') || type.includes('char')) {
		return 'string';
	}

	return undefined;
};

const isStringLikeField = (field: FieldDef): boolean =>
	field.type == null
	|| field.type === 'string'
	|| field.type === 'date'
	|| field.type === 'datetime';

export const buildVectorTileFields = (fields: Record<string, string>): FieldDef[] =>
	Object.entries(fields).map(([key, rawType]) => {
		const type = inferFieldType(rawType);
		return type ? { key, type } : { key };
	});

export const buildVectorTilePopupKeys = (fields: FieldDef[]): string[] =>
	fields.map((field) => field.key);

export const buildVectorTileTitles = (fields: FieldDef[], fallbackName: string): Title[] => {
	const preferred = fields.find(isStringLikeField);
	if (!preferred) {
		return [{ conditions: [], template: fallbackName }];
	}

	return [{ conditions: [preferred.key], template: `{${preferred.key}}` }];
};

export const mergeVectorTileMetadataLayers = (
	vectorLayers: RawVectorTileLayerMetadata[] = [],
	tileStatsLayers: RawVectorTileStatsLayerMetadata[] = []
): VectorTileMetadataLayer[] => {
	const merged = new Map<string, VectorTileMetadataLayer>();

	for (const layer of vectorLayers) {
		const existing = merged.get(layer.id);
		merged.set(layer.id, {
			id: layer.id,
			fields: {
				...(existing?.fields ?? {}),
				...(layer.fields ?? {})
			},
			geometryType: layer.geometry_type ?? existing?.geometryType,
			minZoom: layer.minzoom ?? existing?.minZoom,
			maxZoom: layer.maxzoom ?? existing?.maxZoom,
			attributes: existing?.attributes
		});
	}

	for (const stat of tileStatsLayers) {
		const existing = merged.get(stat.layer);
		merged.set(stat.layer, {
			id: stat.layer,
			fields: existing?.fields ?? {},
			geometryType: existing?.geometryType ?? stat.geometry,
			minZoom: existing?.minZoom,
			maxZoom: existing?.maxZoom,
			attributes: Array.isArray(stat.attributes) ? stat.attributes : existing?.attributes
		});
	}

	return Array.from(merged.values());
};
