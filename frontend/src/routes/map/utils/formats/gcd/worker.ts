import { type GcdParseResult, parseGcd } from '.';

export type GcdWorkerResponse = { result: GcdParseResult; } | { error: string; };

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
	try {
		postMessage({ result: parseGcd(event.data) } satisfies GcdWorkerResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : 'GCDの読み込みに失敗しました'
			} satisfies GcdWorkerResponse
		);
	}
};
