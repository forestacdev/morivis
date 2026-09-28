import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatJwc = {
	id: 'jwc',
	extensions: ['.jwc'],
	limits: { maxFileBytes: 64 * MiB }
} as const satisfies FormatDefinition;
