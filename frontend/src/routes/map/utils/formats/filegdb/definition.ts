import type { FormatDefinition } from '../format-definition';

export const formatFilegdb = {
	id: 'filegdb',
	extensions: [
		'.gdbtable',
		'.gdbtablx',
		'.gdbindexes',
		'.gdbindex',
		'.atx',
		'.spx',
		'.cdf',
		'.freelist'
	]
} as const satisfies FormatDefinition;
