import { createGeojsonTile, type GeojsonTileRequest } from './tile';

self.onmessage = (event: MessageEvent<GeojsonTileRequest>) => {
	const { id } = event.data;
	try {
		const buffer = createGeojsonTile(event.data);
		self.postMessage({ id, buffer }, { transfer: [buffer.buffer] });
	} catch (error) {
		self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
	}
};
