import { propData } from '$routes/data/propData';
import type { Map, MapStyleImageMissingEvent } from 'maplibre-gl';

let mapLibreMap: Map | null = null;

const iconWorker = new Worker(new URL('./worker.ts', import.meta.url), {
	type: 'module'
});

// Define message handler once
iconWorker.onmessage = async (e) => {
	const { imageBitmap, id } = e.data;

	if (mapLibreMap && !mapLibreMap.hasImage(id)) {
		mapLibreMap.addImage(id, imageBitmap, {
			pixelRatio: 2
		});
	}
};

// Added error handling
iconWorker.onerror = (error) => {
	console.error('Worker error:', error);
};

export const handleStyleImageMissing = (e: MapStyleImageMissingEvent, map: Map | null) => {
	if (!map) return;
	mapLibreMap = map;
	const id = e.id;

	// Skip images that have already been added
	if (mapLibreMap.hasImage(id)) return;

	try {
		const imageUrl = propData[id].image;
		if (!imageUrl) return;

		iconWorker.postMessage({ id, url: imageUrl });
	} catch (error) {
		console.error(`Error processing image for id ${id}:`, error);
	}
};
