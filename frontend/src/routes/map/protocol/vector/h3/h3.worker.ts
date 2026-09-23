import type { H3Tile } from './request';
import { createH3Tile } from './tile';

self.onmessage = (event: MessageEvent<H3Tile & { id: number; }>) => {
	const { id } = event.data;
	try {
		const data = createH3Tile(event.data);
		self.postMessage({ id, data }, { transfer: [data.buffer] });
	} catch (error) {
		self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
	}
};
