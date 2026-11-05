import type { S2Tile } from './request';
import { createS2Tile } from './tile';

self.onmessage = (event: MessageEvent<S2Tile & { id: number; }>) => {
	const { id } = event.data;
	try {
		const data = createS2Tile(event.data);
		self.postMessage({ id, data }, { transfer: [data.buffer] });
	} catch (error) {
		self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
	}
};
