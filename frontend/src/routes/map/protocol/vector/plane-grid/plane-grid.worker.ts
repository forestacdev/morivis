import type { PlaneGridTile } from './request';
import { createPlaneGridTile } from './tile';

self.onmessage = (event: MessageEvent<PlaneGridTile & { id: number; }>) => {
	const { id } = event.data;
	try {
		const data = createPlaneGridTile(event.data);
		self.postMessage({ id, data }, { transfer: [data.buffer] });
	} catch (error) {
		self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
	}
};
