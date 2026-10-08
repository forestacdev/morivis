import type { FeatureCollection } from '$routes/map/types/geojson';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import type { CzmlResult } from '.';
import { czmlBillboardLayout, renderCzmlBillboard } from './billboard-image';
import { czmlBillboardLimits } from './definition';
import { createCzmlEntry } from './entry';
import { createCzmlAssetResolver } from './model-assets';

export const createCzmlBillboardEntry = async (
	result: CzmlResult,
	document: File,
	files: File[],
	name: string,
	signal: AbortSignal
) => {
	const resolver = createCzmlAssetResolver(document, files, signal, czmlBillboardLimits.maxBytes);
	const bitmaps = new Map<string, ImageBitmap>();
	const variants = new Map<string, string>();
	const embeddedImages: Record<string, string> = {};
	const geojson: FeatureCollection = { type: 'FeatureCollection', features: [] };
	let pixels = 0;
	let sourcePixels = 0;
	let outputBytes = 0;
	try {
		for (const feature of result.billboards.features) {
			signal.throwIfAborted();
			const properties = feature.properties;
			const uri = resolver.resolve(String(properties.billboard_image));
			let image = bitmaps.get(uri);
			if (!image) {
				if (bitmaps.size >= czmlBillboardLimits.maxAssets) {
					throw new Error('CZML画像マーカーの参照画像は128枚以下にしてください');
				}
				const data = await resolver.read(uri);
				signal.throwIfAborted();
				try {
					image = await createImageBitmap(new Blob([data]));
				} catch {
					throw new Error(
						'CZML画像マーカーを読み込めません。PNG・JPEG・WebPの画像を指定してください'
					);
				}
				bitmaps.set(uri, image);
				sourcePixels += image.width * image.height;
				if (sourcePixels > czmlBillboardLimits.maxSourcePixels) {
					throw new Error('CZML画像マーカーの元画像が合計1600万ピクセルを超えています');
				}
			}
			const appearance = Object.fromEntries(
				Object.entries(properties).filter(([key]) => key.startsWith('billboard_'))
			);
			const key = JSON.stringify(appearance);
			let id = variants.get(key);
			if (!id) {
				if (variants.size >= czmlBillboardLimits.maxVariants) {
					throw new Error(
						'CZML画像マーカーの画像・表示設定の組み合わせは256種類以下にしてください'
					);
				}
				const layout = czmlBillboardLayout(properties, image.width, image.height);
				pixels += layout.canvasWidth * layout.canvasHeight;
				if (pixels > czmlBillboardLimits.maxOutputPixels) {
					throw new Error('CZML画像マーカーの変換結果が合計1600万ピクセルを超えています');
				}
				const rendered = await renderCzmlBillboard(image, properties, layout);
				signal.throwIfAborted();
				outputBytes += rendered.length;
				if (outputBytes > czmlBillboardLimits.maxBytes) {
					throw new Error('CZML画像マーカーの変換結果が32 MiBを超えています');
				}
				id = `czml-image-${variants.size}`;
				embeddedImages[id] = rendered;
				variants.set(key, id);
			}
			geojson.features.push({
				...feature,
				properties: {
					...Object.fromEntries(
						Object.entries(properties).filter(([key]) => !key.startsWith('billboard_'))
					),
					image_id: id
				}
			});
		}
	} finally {
		for (const image of bitmaps.values()) image.close();
	}
	signal.throwIfAborted();
	const entry = await createCzmlEntry(geojson, name, result.timestamps);
	if (signal.aborted || entry.style.type !== 'circle') {
		GeojsonCache.remove(entry.id);
		signal.throwIfAborted();
		throw new Error('CZML画像マーカーのポイントを作成できません');
	}
	entry.properties.images = {
		icon: {
			type: 'absolute',
			urlKey: 'image_url',
			imageIdKey: 'image_id',
			rendering: 'original',
			embeddedImages
		}
	};
	entry.style.imageIcon = { show: true };
	entry.style.labels.show = false;
	entry.style.opacity = 1;
	entry.metaData.description =
		'CZMLに記録された画像マーカーのデータ。時刻ごとの位置と画像の変化を地図上で確認する際に利用できる。';
	if (result.timestamps.length) {
		entry.state = {
			...entry.state,
			temporalFilter: { enabled: true, mode: 'single_start', startIndex: 0, endIndex: 0 }
		};
	}
	return entry;
};
