import type { FormatDefinition } from '../format-definition';

export const formatCityjson = {
	id: 'cityjson',
	extensions: ['.city.json', '.cityjson', '.json']
} as const satisfies FormatDefinition;
