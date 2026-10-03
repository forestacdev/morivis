import { assertInputResourceLimits } from '../resource-limits';
import type { CzmlResult } from '.';
import { parseCzml } from '.';
import { formatCzml } from './definition';

export interface CzmlRequest {
	file: File;
}
export type CzmlResponse = { result: CzmlResult; } | { error: string; };
self.onmessage = async ({ data }: MessageEvent<CzmlRequest>) => {
	try {
		assertInputResourceLimits(
			[{ name: data.file.name, files: [data.file] }],
			formatCzml.limits
		);
		const result = await parseCzml(await data.file.text());
		postMessage({ result } satisfies CzmlResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies CzmlResponse
		);
	}
};
