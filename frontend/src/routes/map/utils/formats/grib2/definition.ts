import type { FormatDefinition } from '../format-definition';

export const formatGrib2 = {
	id: 'grib2',
	extensions: ['.grib2', '.grb2', '.grb', '.bin']
} as const satisfies FormatDefinition;
