import { assertInputResourceLimits } from '../resource-limits';
import type { AisResult } from '.';
import { parseAis } from '.';
import { formatAis } from './definition';

export interface AisRequest {
	file: File;
}
export type AisResponse = { result: AisResult; } | { error: string; };
self.onmessage = async ({ data }: MessageEvent<AisRequest>) => {
	try {
		assertInputResourceLimits(
			[{ name: data.file.name, files: [data.file] }],
			formatAis.limits
		);
		const result = parseAis(await data.file.text());
		postMessage({ result } satisfies AisResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies AisResponse
		);
	}
};
