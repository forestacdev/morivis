import { assertInputResourceLimits } from '../resource-limits';
import type { CzmlResult } from '.';
import { parseCzml } from '.';
import { formatCzml } from './definition';

export interface CzmlRequest {
	file: File;
	cesiumBaseUrl: string;
}
export type CzmlResponse = { result: CzmlResult; } | { error: string; };
self.onmessage = async ({ data }: MessageEvent<CzmlRequest>) => {
	try {
		// WorkerのURLではなく、呼び出し元が解決したアプリの配信先を使う。
		(globalThis as typeof globalThis & { CESIUM_BASE_URL: string; }).CESIUM_BASE_URL =
			data.cesiumBaseUrl;
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
