import { getPrimaryImageMedia, propData } from '$routes/map/data/entries/_prop_data';
import type { Map, MapStyleImageMissingEvent } from 'maplibre-gl';
import { ICON_IMAGE_BASE_PATH } from '$routes/constants';

let mapLibreMap: Map | null = null;

const iconWorker = new Worker(new URL('./generation_icon.worker.ts', import.meta.url), {
	type: 'module'
});

// Define message handler once
iconWorker.onmessage = async (e) => {
	const { imageBitmap, id } = e.data;

		if (mapLibreMap && !mapLibreMap.hasImage(id)) {
			mapLibreMap.addImage(id, imageBitmap, {
				pixelRatio: 1
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
	console.log('Handling style image missing for id:', e.id);

	if (!map) return;
	mapLibreMap = map;
	const id = e.id;

	// Skip images that have already been added
	if (mapLibreMap.hasImage(id)) return;

	try {
		const imageUrl = `${ICON_IMAGE_BASE_PATH}/${id}.webp`;
		console.log(`Attempting to load image for id ${id} from URL: ${imageUrl}`);

		if (!imageUrl) return;
		const image = await loadImage(imageUrl);

		iconWorker.postMessage({ id, image });
	} catch (error) {
		console.error(`Error processing image for id ${id}:`, error);
	}
};
