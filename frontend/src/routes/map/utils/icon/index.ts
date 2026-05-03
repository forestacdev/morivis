import type {
	DataDrivenPropertyValueSpecification,
	Map,
	MapStyleImageMissingEvent,
	ResolvedImageSpecification,
	MapGeoJSONFeature,
	ExpressionSpecification
} from 'maplibre-gl';
import { ICON_IMAGE_BASE_PATH, ICON_NO_IMAGE_PATH } from '$routes/constants';
import type { IconsStyle, ImageIconsStyle } from '$routes/map/data/types/vector/style';
import { devProxyTransform } from '$routes/map/utils/platform/proxy';

let mapLibreMap: Map | null = null;

export const GENERATED_POI_ICON_PREFIX = 'prop_icon';
export const GENERATED_POI_ICON_SEPARATOR = ':::';

export const buildGeneratedPoiIconId = (propId: string, iconUrl?: string | null) => {
	const resolvedIconUrl = iconUrl || `${ICON_IMAGE_BASE_PATH}/${propId}.webp`;
	return [GENERATED_POI_ICON_PREFIX, propId, resolvedIconUrl].join(GENERATED_POI_ICON_SEPARATOR);
};

export const buildGeneratedPoiIconExpression = (
	icons: ImageIconsStyle
): DataDrivenPropertyValueSpecification<ResolvedImageSpecification> => {
	const { imageIdKey, imageOption, fallbackUrlExpression } = icons;
	const fallbackUrl =
		fallbackUrlExpression ?? ['concat', ICON_IMAGE_BASE_PATH, '/', ['get', imageIdKey], '.webp'];
	const imageUrlExpression = (() => {
		if (!imageOption) return fallbackUrl;
		if (imageOption.type === 'relative') {
			return [
				'coalesce',
				[
					'concat',
					imageOption.baseUrl,
					['to-string', ['get', imageOption.urlKey]],
					imageOption.suffix ?? ''
				],
				fallbackUrl
			] as ExpressionSpecification;
		}
		return ['coalesce', ['get', imageOption.urlKey], fallbackUrl] as ExpressionSpecification;
	})();

	return [
		'case',
		['all', ['has', imageIdKey], ['!=', ['to-string', ['get', imageIdKey]], '']],
		[
			'concat',
			GENERATED_POI_ICON_PREFIX,
			GENERATED_POI_ICON_SEPARATOR,
			['to-string', ['get', imageIdKey]],
			GENERATED_POI_ICON_SEPARATOR,
			imageUrlExpression
		],
		''
	] as DataDrivenPropertyValueSpecification<ResolvedImageSpecification>;
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

export const resolveGeneratedPoiIconUrl = (
	properties: MapGeoJSONFeature['properties'] | Record<string, unknown> | null | undefined,
	icons: IconsStyle | undefined
) => {
	if (!properties || !icons || icons.kind !== 'image') return null;

	const rawImageId = properties[icons.imageIdKey];
	const imageId = rawImageId != null ? String(rawImageId) : '';
	if (!imageId) return null;

	const rawImageUrl = icons.imageOption ? properties[icons.imageOption.urlKey] : null;
	const resolvedImageUrl =
		rawImageUrl != null && String(rawImageUrl) !== ''
			? icons.imageOption?.type === 'relative'
				? `${icons.imageOption.baseUrl}${String(rawImageUrl)}${icons.imageOption.suffix ?? ''}`
				: String(rawImageUrl)
			: null;
	const imageUrl =
		resolvedImageUrl ?? `${ICON_IMAGE_BASE_PATH}/${imageId}.webp`;

	return imageUrl;
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

const addDummyPhotoIcon = async (id: string) => {
	if (!mapLibreMap || mapLibreMap.hasImage(id)) return;

	const image = await loadImage(ICON_NO_IMAGE_PATH);
	iconWorker.postMessage({ id, image });
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
			await addDummyPhotoIcon(id);
			return;
		}

		const imageUrl = parsed.iconUrl;

		if (!imageUrl) {
			console.error(`No image URL found for id ${id}`);
			await addDummyPhotoIcon(id);
			return;
		}
		const image = await loadImage(imageUrl);

		iconWorker.postMessage({ id, image });
	} catch (error) {
		await addDummyPhotoIcon(id);
		console.error(`Error processing image for id ${id}:`, error);
	}
};
