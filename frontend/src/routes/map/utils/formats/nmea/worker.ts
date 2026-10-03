import { assertInputResourceLimits } from '../resource-limits';
import type { NmeaResult } from '.';
import { parseNmea } from '.';
import { formatNmea } from './definition';

export interface NmeaRequest {
	file: File;
}
export type NmeaResponse = { result: NmeaResult; } | { error: string; };
self.onmessage = async ({ data }: MessageEvent<NmeaRequest>) => {
	try {
		assertInputResourceLimits(
			[{ name: data.file.name, files: [data.file] }],
			formatNmea.limits
		);
		const result = parseNmea(await data.file.text());
		postMessage({ result } satisfies NmeaResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies NmeaResponse
		);
	}
};
