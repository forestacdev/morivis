import { parseFit } from '.';

self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
	try {
		postMessage({ result: await parseFit(event.data) });
	} catch (error) {
		postMessage({ error: error instanceof Error ? error.message : 'FITの解析に失敗しました' });
	}
};
