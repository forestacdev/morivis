import type { Map, MapStyleImageMissingEvent } from 'maplibre-gl';
import { ICON_IMAGE_BASE_PATH } from '$routes/constants';
import { devProxyTransform } from '$routes/map/utils/platform/proxy';

let mapLibreMap: Map | null = null;

export const GENERATED_POI_ICON_PREFIX = 'prop_icon';
export const GENERATED_POI_ICON_SEPARATOR = ':::';

export const buildGeneratedPoiIconId = (propId: string, iconUrl?: string | null) => {
	const resolvedIconUrl = iconUrl || `${ICON_IMAGE_BASE_PATH}/${propId}.webp`;
	return [GENERATED_POI_ICON_PREFIX, propId, resolvedIconUrl].join(GENERATED_POI_ICON_SEPARATOR);
};

export const isGeneratedPoiIconId = (id: string) => {
	return id.startsWith(`${GENERATED_POI_ICON_PREFIX}${GENERATED_POI_ICON_SEPARATOR}`);
};

export const isGeneratedPoiIconLayout = (iconImage: unknown): boolean => {
	if (typeof iconImage === 'string') {
		return isGeneratedPoiIconId(iconImage) || iconImage.includes(GENERATED_POI_ICON_PREFIX);
	}

	if (Array.isArray(iconImage)) {
		return iconImage.some((item) => isGeneratedPoiIconLayout(item));
	}

	return false;
};

export const parseGeneratedPoiIconId = (id: string) => {
	// icon-image は URL ではなく画像 ID しか持てないため、
	// `prop_icon:::<propId>:::<iconUrl>` という自前フォーマットで
	// propId と画像 URL を 1 本の文字列に詰めて styleimagemissing 側で復元する。
	// URL には `_` や `/` が普通に含まれるので、衝突しやすい記号ではなく `:::` を区切りに使う。
	const prefix = `${GENERATED_POI_ICON_PREFIX}${GENERATED_POI_ICON_SEPARATOR}`;
	if (!isGeneratedPoiIconId(id)) return null;

	const payload = id.slice(prefix.length);
	const separatorIndex = payload.indexOf(GENERATED_POI_ICON_SEPARATOR);
	if (separatorIndex === -1) return null;

	const propId = payload.slice(0, separatorIndex);
	const iconUrl = payload.slice(separatorIndex + GENERATED_POI_ICON_SEPARATOR.length);

	return {
		propId,
		iconUrl
	};
};

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
	const requestUrl = import.meta.env.PROD ? src : devProxyTransform(src).url;
	const response = await fetch(requestUrl);
	if (!response.ok) {
		throw new Error('Failed to fetch image');
	}
	const blob = await response.blob();
	return await createImageBitmap(blob);
};

const addTransparentPlaceholder = (id: string) => {
	if (!mapLibreMap || mapLibreMap.hasImage(id)) return;

	const image = new ImageData(new Uint8ClampedArray([0, 0, 0, 0]), 1, 1);
	mapLibreMap.addImage(id, image);
};

export const handleStyleImageMissing = async (e: MapStyleImageMissingEvent, map: Map | null) => {
	if (!map) return;
	mapLibreMap = map;
	const id = e.id;

	const parsed = parseGeneratedPoiIconId(id);
	if (!parsed) return;

	// Skip images that have already been added
	if (mapLibreMap.hasImage(id)) return;

	try {
		if (!parsed.propId) {
			console.warn(`Skip generated poi icon without propId: ${id}`);
			addTransparentPlaceholder(id);
			return;
		}

		const imageUrl = parsed.iconUrl;

		if (!imageUrl) {
			console.error(`No image URL found for id ${id}`);
			addTransparentPlaceholder(id);
			return;
		}
		const image = await loadImage(imageUrl);

		iconWorker.postMessage({ id, image });
	} catch (error) {
		addTransparentPlaceholder(id);
		console.error(`Error processing image for id ${id}:`, error);
	}
};
