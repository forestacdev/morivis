import type { RegionalMeshTile } from './request';
import { createRegionalMeshTile } from './tile';

self.onmessage = (event: MessageEvent<RegionalMeshTile & { id: number; }>) => {
	const { id } = event.data;
	try {
		const data = createRegionalMeshTile(event.data);
		self.postMessage({ id, data }, { transfer: [data.buffer] });
	} catch (error) {
		self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
	}
};
