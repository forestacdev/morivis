import { propData } from '$routes/map/data/prop_data';
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

const loadImage = async (src: string): Promise<ImageBitmap> => {
	const response = await fetch(src);
	if (!response.ok) {
		throw new Error('Failed to fetch image');
	}
	const blob = await response.blob();
	return await createImageBitmap(blob);
};

// TODO: 使用していない
export const handleStyleImageMissing = async (e: MapStyleImageMissingEvent, map: Map | null) => {
	if (!map) return;
	mapLibreMap = map;
	const id = e.id;

	// Skip images that have already been added
	if (mapLibreMap.hasImage(id)) return;

	try {
		const imageUrl = propData[id].image;

		if (!imageUrl) return;
		const image = await loadImage(imageUrl);

		iconWorker.postMessage({ id, image });
	} catch (error) {
		console.error(`Error processing image for id ${id}:`, error);
	}
};
