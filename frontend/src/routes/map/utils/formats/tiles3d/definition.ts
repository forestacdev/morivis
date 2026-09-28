import type { FormatDefinition } from '../format-definition';

export const format3dtiles = {
	id: '3dtiles',
	extensions: ['.json', '.b3dm', '.i3dm', '.pnts', '.cmpt', '.subtree'],
	limits: { skipBatchWarning: true }
} as const satisfies FormatDefinition;
