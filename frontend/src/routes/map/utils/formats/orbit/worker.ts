import { assertInputResourceLimits } from '../resource-limits';
import { inspectOrbit, propagateOrbit } from '.';
import { formatOrbit } from './definition';
import type { OrbitOptions, OrbitResult, OrbitSummary } from './types';

export type OrbitRequest = { file: File; mode: 'inspect'; } | {
	file: File;
	mode: 'propagate';
	options: OrbitOptions;
};
export type OrbitResponse = { summary: OrbitSummary; } | { result: OrbitResult; } | {
	error: string;
};
self.onmessage = async ({ data }: MessageEvent<OrbitRequest>) => {
	try {
		assertInputResourceLimits(
			[{ name: data.file.name, files: [data.file] }],
			formatOrbit.limits
		);
		const text = await data.file.text();
		postMessage(
			data.mode === 'inspect'
				? { summary: inspectOrbit(text) }
				: { result: propagateOrbit(text, data.options) }
		);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies OrbitResponse
		);
	}
};
