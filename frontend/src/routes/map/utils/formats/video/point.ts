import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import type { VideoLocation } from './location';

/** 撮影位置1点と詳細画面の動画を、既存のvector entryへ正規化する。 */
export const createVideoPointEntry = async (
	file: File,
	location: VideoLocation,
	previewImageUrl: string | undefined,
	signal: AbortSignal
): Promise<PointEntry<GeoJsonMetaData>> => {
	signal.throwIfAborted();
	const url = URL.createObjectURL(file);
	let entry: Awaited<ReturnType<typeof createGeoJsonEntry>>;
	try {
		const { longitude, latitude, altitude } = location;
		entry = await createGeoJsonEntry(
			{
				type: 'FeatureCollection',
				features: [{
					type: 'Feature',
					geometry: { type: 'Point', coordinates: [longitude, latitude] },
					properties: {
						_prop_id: 'video',
						fileName: file.name,
						videoUrl: url,
						...(previewImageUrl && { iconImageUrl: previewImageUrl }),
						longitude,
						latitude,
						...(altitude !== undefined && { altitude })
					}
				}]
			},
			'Point',
			file.name.replace(/\.[^.]+$/, ''),
			[longitude, latitude, longitude, latitude],
			undefined,
			{ attribution: '位置情報付き動画', coverImage: previewImageUrl }
		);
		signal.throwIfAborted();
		if (!entry || entry.format.geometryType !== 'Point') {
			throw new Error('動画の登録に失敗しました');
		}
		entry.metaData.description = '撮影位置を持つ動画。地図上のポイントから映像を再生する。';
		entry.properties.fields = [
			{ key: 'fileName', label: 'ファイル名' },
			{ key: 'longitude', label: '経度', type: 'number' },
			{ key: 'latitude', label: '緯度', type: 'number' },
			...(altitude !== undefined
				? [{ key: 'altitude', label: '標高 (m)', type: 'number' as const }]
				: [])
		];
		entry.properties.attributeView.popupKeys = entry.properties.fields.map(field => field.key);
		entry.properties.attributeView.titles = [{
			conditions: ['fileName'],
			template: '{fileName}'
		}];
		entry.properties.detailsById = {
			video: { description: null, url: null, medias: [{ type: 'video', url }] }
		};
		const pointEntry = entry as PointEntry<GeoJsonMetaData>;
		if (previewImageUrl) {
			pointEntry.properties.images = {
				icon: { type: 'absolute', imageIdKey: '_prop_id', urlKey: 'iconImageUrl' }
			};
			pointEntry.style.imageIcon = { show: true };
			pointEntry.style.opacity = 1;
		}
		return pointEntry;
	} catch (error) {
		URL.revokeObjectURL(url);
		if (entry) GeojsonCache.remove(entry.id);
		throw error;
	}
};
