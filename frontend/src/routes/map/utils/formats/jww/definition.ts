import type { FormatDefinition } from '../format-definition';
import { formatJwc } from '../jwc/definition';

export const formatJww = {
	id: 'jww',
	extensions: ['.jww', ...formatJwc.extensions],
	variants: [formatJwc]
} as const satisfies FormatDefinition;
