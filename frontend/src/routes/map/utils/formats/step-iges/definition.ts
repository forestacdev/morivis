import type { FormatDefinition } from '../format-definition';

export const formatStepIges = {
	id: 'step-iges',
	extensions: ['.step', '.stp', '.iges', '.igs']
} as const satisfies FormatDefinition;
