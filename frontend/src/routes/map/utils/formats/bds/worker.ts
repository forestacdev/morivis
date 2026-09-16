import { type BdsParseResult, parseBds } from '.';
export type BdsWorkerResponse = { result: BdsParseResult; } | { error: string; };
self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
	try {
		self.postMessage({ result: parseBds(event.data) } satisfies BdsWorkerResponse);
	} catch (error) {
		self.postMessage(
			{
				error: error instanceof Error ? error.message : 'BDSの解析に失敗しました'
			} satisfies BdsWorkerResponse
		);
	}
};
