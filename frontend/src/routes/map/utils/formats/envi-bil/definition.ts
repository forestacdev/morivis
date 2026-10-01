import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatEnviBil = {
	id: 'envi-bil',
	extensions: ['.hdr', '.bil', '.bip', '.bsq', '.dat', '.img', '.raw'],
	limits: { maxFileBytes: 512 * MiB, maxHeaderBytes: MiB, maxSamples: 16 * MiB },
	files: {
		headerExtensions: ['.hdr'],
		mainExtensions: ['.bil', '.bip', '.bsq'],
		dataExtensions: ['.bil', '.bip', '.bsq', '.dat', '.img', '.raw', '.bin'],
		optionalExtensions: ['.prj', '.blw', '.bpw', '.bqw', '.bilw', '.bipw', '.bsqw', '.wld'],
		grouping: 'same-path-stem'
	}
} as const satisfies FormatDefinition;
