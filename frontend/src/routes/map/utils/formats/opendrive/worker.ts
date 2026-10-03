import { assertInputResourceLimits } from '../resource-limits';
import type { OpenDriveResult } from '.';
import { convertOpenDrive } from './convert';
import { formatOpenDrive } from './definition';

export interface OpenDriveRequest {
	file: File;
	sourceCrs?: string;
}
export type OpenDriveResponse = { result: OpenDriveResult; } | { error: string; };
self.onmessage = async ({ data }: MessageEvent<OpenDriveRequest>) => {
	try {
		assertInputResourceLimits(
			[{ name: data.file.name, files: [data.file] }],
			formatOpenDrive.limits
		);
		const result = await convertOpenDrive(await data.file.text(), data.sourceCrs);
		postMessage({ result } satisfies OpenDriveResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies OpenDriveResponse
		);
	}
};
