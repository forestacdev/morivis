import type {
	DataDrivenPropertyValueSpecification,
	Map as MapLibreMapType,
	MapStyleImageMissingEvent,
	ResolvedImageSpecification,
	MapGeoJSONFeature,
	ExpressionSpecification
} from 'maplibre-gl';
import {
	ICON_IMAGE_BASE_PATH,
	ICON_NO_IMAGE_PATH,
	USE_WORKER_GENERATED_POI_ICONS
} from '$routes/constants';
import type { IconsStyle, ImageIconsStyle } from '$routes/map/data/types/vector/style';
import type {
	IconImageSource,
	ImageSource,
	VectorProperties
} from '$routes/map/data/types/vector/properties';
import { devProxyTransform } from '$routes/map/utils/platform/proxy';

let mapLibreMap: MapLibreMapType | null = null;
const imageBitmapCache = new Map<string, Promise<ImageBitmap>>();
const inflightGeneratedPoiIcons = new Map<string, Promise<void>>();
let renderedDummyIconPromise: Promise<ImageBitmap> | null = null;

const ICON_WORKER_POOL_MIN_SIZE = 1;
const ICON_WORKER_POOL_MAX_SIZE = 4;
const ICON_WORKER_IDLE_TIMEOUT_MS = 3000;

export const GENERATED_POI_ICON_PREFIX = 'prop_icon';
export const GENERATED_POI_ICON_SEPARATOR = ':::';

export const buildGeneratedPoiIconId = (propId: string, iconUrl?: string | null) => {
	const resolvedIconUrl = iconUrl || `${ICON_IMAGE_BASE_PATH}/${propId}.webp`;
	return [GENERATED_POI_ICON_PREFIX, propId, resolvedIconUrl].join(GENERATED_POI_ICON_SEPARATOR);
};

export const buildGeneratedPoiIconExpression = (
	image: IconImageSource,
	fallbackUrlExpression?: ImageIconsStyle['fallbackUrlExpression']
): DataDrivenPropertyValueSpecification<ResolvedImageSpecification> => {
	const { imageIdKey } = image;
	const fallbackUrl = fallbackUrlExpression ?? [
		'concat',
		ICON_IMAGE_BASE_PATH,
		'/',
		['get', imageIdKey],
		'.webp'
	];
	const imageUrlExpression = (() => {
		if (image.type === 'relative') {
			return [
				'coalesce',
				['concat', image.baseUrl, ['to-string', ['get', image.urlKey]], image.suffix ?? ''],
				fallbackUrl
			] as ExpressionSpecification;
		}
		return ['coalesce', ['get', image.urlKey], fallbackUrl] as ExpressionSpecification;
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

export const resolveImageUrl = (
	properties: MapGeoJSONFeature['properties'] | Record<string, unknown> | null | undefined,
	image: ImageSource | undefined
) => {
	if (!properties || !image) return null;

	const rawImageUrl = properties[image.urlKey];
	if (rawImageUrl == null || String(rawImageUrl) === '') return null;

	if (image.type === 'relative') {
		return `${image.baseUrl}${String(rawImageUrl)}${image.suffix ?? ''}`;
	}

	return String(rawImageUrl);
};

export const getPopupImageFieldKey = (vectorProperties: VectorProperties | undefined) => {
	return (
		vectorProperties?.images?.popup?.urlKey ?? vectorProperties?.attributeView.imageKey ?? null
	);
};

export const resolvePopupImageUrl = (
	properties: MapGeoJSONFeature['properties'] | Record<string, unknown> | null | undefined,
	vectorProperties: VectorProperties | undefined
) => {
	const popupImage = vectorProperties?.images?.popup;
	if (popupImage) {
		return resolveImageUrl(properties, popupImage);
	}

	const legacyImageKey = vectorProperties?.attributeView.imageKey;
	if (!properties || !legacyImageKey) return null;
	const rawImageUrl = properties[legacyImageKey];
	return rawImageUrl != null && String(rawImageUrl) !== '' ? String(rawImageUrl) : null;
};

export const resolveGeneratedPoiIconUrl = (
	properties: MapGeoJSONFeature['properties'] | Record<string, unknown> | null | undefined,
	icons: IconsStyle | undefined,
	image: IconImageSource | undefined
) => {
	if (!properties || !icons || icons.kind !== 'image' || !image) return null;

	const rawImageId = properties[image.imageIdKey];
	const imageId = rawImageId != null ? String(rawImageId) : '';
	if (!imageId) return null;

	const resolvedImageUrl = resolveImageUrl(properties, image);
	const imageUrl = resolvedImageUrl ?? `${ICON_IMAGE_BASE_PATH}/${imageId}.webp`;

	return imageUrl;
};

type RenderTask = {
	id: string;
	image: ImageBitmap;
	resolve: (imageBitmap: ImageBitmap) => void;
	reject: (error: Error) => void;
};

class IconWorkerSlot {
	private worker: Worker;
	private warmupPromise: Promise<void> | null = null;
	private resolveWarmup: (() => void) | null = null;
	private rejectWarmup: ((error: Error) => void) | null = null;
	private currentTask: RenderTask | null = null;
	private idleTimer: ReturnType<typeof setTimeout> | null = null;
	private terminated = false;
	isBusy = false;

	constructor(
		private persistent: boolean,
		private onAvailable: () => void,
		private onIdleTimeout: () => void
	) {
		this.worker = new Worker(new URL('./generation_icon.worker.ts', import.meta.url), {
			type: 'module'
		});

		this.worker.onmessage = (e) => {
			const { type } = e.data;

			if (type === 'warmup-complete') {
				this.resolveWarmup?.();
				this.resolveWarmup = null;
				this.rejectWarmup = null;
				return;
			}

			if (type === 'warmup-error') {
				this.rejectWarmup?.(new Error(e.data.error));
				this.warmupPromise = null;
				this.resolveWarmup = null;
				this.rejectWarmup = null;
				return;
			}

			if (type === 'render-complete') {
				const task = this.currentTask;
				if (!task) return;

				this.currentTask = null;
				this.isBusy = false;
				task.resolve(e.data.imageBitmap);
				this.onAvailable();
				return;
			}

			if (type === 'render-error') {
				const task = this.currentTask;
				if (!task) return;

				this.currentTask = null;
				this.isBusy = false;
				task.reject(new Error(e.data.error));
				this.onAvailable();
			}
		};

		this.worker.onerror = (error) => {
			console.error('Worker error:', error);
			const failure = new Error('Generated POI icon worker failed');

			if (this.rejectWarmup) {
				this.rejectWarmup(failure);
				this.warmupPromise = null;
				this.resolveWarmup = null;
				this.rejectWarmup = null;
			}

			if (this.currentTask) {
				const task = this.currentTask;
				this.currentTask = null;
				this.isBusy = false;
				task.reject(failure);
			}

			this.terminate();
			this.onAvailable();
		};
	}

	get isTerminated() {
		return this.terminated;
	}

	ensureWarmup = async () => {
		if (this.terminated) {
			throw new Error('Generated POI icon worker is terminated');
		}

		if (!this.warmupPromise) {
			this.warmupPromise = new Promise<void>((resolve, reject) => {
				this.resolveWarmup = resolve;
				this.rejectWarmup = reject;
				this.worker.postMessage({ type: 'warmup' });
			}).catch((error) => {
				this.warmupPromise = null;
				throw error;
			});
		}

		await this.warmupPromise;
	};

	render = async (task: RenderTask) => {
		if (this.terminated) {
			throw new Error('Generated POI icon worker is terminated');
		}

		this.clearIdleTimer();
		this.isBusy = true;
		this.currentTask = task;

		try {
			await this.ensureWarmup();
			this.worker.postMessage(
				{
					type: 'render',
					id: task.id,
					image: task.image
				},
				{ transfer: [task.image] }
			);
		} catch (error) {
			this.currentTask = null;
			this.isBusy = false;
			task.reject(error instanceof Error ? error : new Error(String(error)));
			this.terminate();
			this.onAvailable();
		}
	};

	scheduleIdleCleanup = () => {
		if (this.persistent || this.isBusy || this.terminated) return;

		this.clearIdleTimer();
		this.idleTimer = setTimeout(() => {
			this.onIdleTimeout();
		}, ICON_WORKER_IDLE_TIMEOUT_MS);
	};

	terminate = () => {
		if (this.terminated) return;

		this.terminated = true;
		this.clearIdleTimer();
		this.worker.terminate();
	};

	private clearIdleTimer = () => {
		if (!this.idleTimer) return;
		clearTimeout(this.idleTimer);
		this.idleTimer = null;
	};
}

class GeneratedPoiIconWorkerPool {
	private workers: IconWorkerSlot[] = [];
	private queue: RenderTask[] = [];

	warmup = async () => {
		await this.getOrCreateWorker(true).ensureWarmup();
	};

	render = async (id: string, image: ImageBitmap) => {
		return await new Promise<ImageBitmap>((resolve, reject) => {
			this.queue.push({ id, image, resolve, reject });
			this.dispatch();
		});
	};

	private dispatch = () => {
		while (this.queue.length > 0) {
			const idleWorker = this.workers.find((worker) => !worker.isBusy);
			if (idleWorker) {
				const task = this.queue.shift();
				if (!task) return;
				void idleWorker.render(task);
				continue;
			}

			if (this.workers.length >= ICON_WORKER_POOL_MAX_SIZE) {
				return;
			}

			const worker = this.getOrCreateWorker(false);
			const task = this.queue.shift();
			if (!task) return;
			void worker.render(task);
		}
	};

	private getOrCreateWorker = (persistent: boolean) => {
		if (persistent) {
			const existingPersistentWorker = this.workers[0];
			if (existingPersistentWorker) {
				return existingPersistentWorker;
			}
		}

		const worker = new IconWorkerSlot(
			persistent,
			() => {
				this.handleWorkerAvailable(worker);
			},
			() => {
				this.handleWorkerIdle(worker);
			}
		);
		this.workers.push(worker);
		return worker;
	};

	private handleWorkerAvailable = (worker: IconWorkerSlot) => {
		if (worker.isTerminated) {
			this.removeWorker(worker);
			this.dispatch();
			return;
		}

		if (this.queue.length > 0) {
			this.dispatch();
			return;
		}

		worker.scheduleIdleCleanup();
	};

	private handleWorkerIdle = (worker: IconWorkerSlot) => {
		if (worker.isBusy) return;
		if (worker.isTerminated) {
			this.removeWorker(worker);
			return;
		}

		if (this.queue.length > 0) {
			this.dispatch();
			return;
		}

		if (this.workers.length <= ICON_WORKER_POOL_MIN_SIZE) {
			return;
		}

		this.removeWorker(worker);
	};

	private removeWorker = (worker: IconWorkerSlot) => {
		const workerIndex = this.workers.indexOf(worker);
		if (workerIndex === -1) return;

		this.workers.splice(workerIndex, 1);
		worker.terminate();
	};
}

const iconWorkerPool = new GeneratedPoiIconWorkerPool();

export const warmupGeneratedPoiIconWorker = async () => {
	if (!USE_WORKER_GENERATED_POI_ICONS) return;
	await iconWorkerPool.warmup();
};

const addImageToMap = (id: string, imageBitmap: ImageBitmap) => {
	if (!mapLibreMap || mapLibreMap.hasImage(id)) return;

	mapLibreMap.addImage(id, imageBitmap, {
		pixelRatio: 1
	});
};

const renderImageWithWorker = async (id: string, image: ImageBitmap) => {
	return await iconWorkerPool.render(id, image);
};

const loadImage = async (src: string): Promise<ImageBitmap> => {
	const cachedImage = imageBitmapCache.get(src);
	if (cachedImage) {
		return await cachedImage;
	}

	const imagePromise = (async () => {
		const requestUrl = import.meta.env.PROD ? src : devProxyTransform(src).url;
		const response = await fetch(requestUrl);
		if (!response.ok) {
			throw new Error('Failed to fetch image');
		}
		const blob = await response.blob();
		return await createImageBitmap(blob);
	})().catch((error) => {
		imageBitmapCache.delete(src);
		throw error;
	});

	imageBitmapCache.set(src, imagePromise);
	return await imagePromise;
};

const getRenderedDummyIcon = async () => {
	if (!renderedDummyIconPromise) {
		renderedDummyIconPromise = (async () => {
			const image = await loadImage(ICON_NO_IMAGE_PATH);
			if (!USE_WORKER_GENERATED_POI_ICONS) {
				return image;
			}

			return await renderImageWithWorker('__dummy__', image);
		})().catch((error) => {
			renderedDummyIconPromise = null;
			throw error;
		});
	}

	return await renderedDummyIconPromise;
};

const addDummyPhotoIcon = async (id: string) => {
	if (!mapLibreMap || mapLibreMap.hasImage(id)) return;

	if (USE_WORKER_GENERATED_POI_ICONS) {
		const renderedDummyIcon = await getRenderedDummyIcon();
		const clonedDummyIcon = await createImageBitmap(renderedDummyIcon);
		addImageToMap(id, clonedDummyIcon);
		return;
	}

	const image = await loadImage(ICON_NO_IMAGE_PATH);
	addImageToMap(id, image);
};

export const handleStyleImageMissing = async (
	e: MapStyleImageMissingEvent,
	map: MapLibreMapType | null
) => {
	if (!map) return;
	mapLibreMap = map;
	const id = e.id;

	const parsed = parseGeneratedPoiIconId(id);
	if (!parsed) return;

	// Skip images that have already been added
	if (mapLibreMap.hasImage(id)) return;

	const inflightTask = inflightGeneratedPoiIcons.get(id);
	if (inflightTask) {
		await inflightTask;
		return;
	}

	const task = (async () => {
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

			if (USE_WORKER_GENERATED_POI_ICONS) {
				const renderedImage = await renderImageWithWorker(id, image);
				addImageToMap(id, renderedImage);
				return;
			}

		addImageToMap(id, image);
	})().catch(async (error) => {
		await addDummyPhotoIcon(id);
		console.error(`Error processing image for id ${id}:`, error);
	}).finally(() => {
		inflightGeneratedPoiIcons.delete(id);
	});

	inflightGeneratedPoiIcons.set(id, task);
	await task;
};
