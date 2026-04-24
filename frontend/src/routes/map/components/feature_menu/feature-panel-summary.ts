import { delay } from 'es-toolkit';

import { getImageByName } from '$routes/map/api/inaturalist';
import { propData, type MediaData } from '$routes/map/data/entries/_prop_data';
import type { GeoDataEntry } from '$routes/map/data/types';
import type {
	FeatureMenuData,
	FeaturePanelMedia,
	FeaturePanelSummary as FeaturePanelSummaryData
} from '$routes/map/types';
import { generatePopupTitle } from '$routes/map/utils/data/properties';

const convertMediaData = (
	media: MediaData,
	targetLayer: GeoDataEntry | null
): FeaturePanelMedia => {
	if (media.type === 'image') {
		return {
			type: 'image',
			url: media.url,
			alt: targetLayer?.metaData.name ?? '画像',
			source: 'static',
			fit: 'cover'
		};
	}

	if (media.type === 'youtube') {
		return {
			type: 'youtube',
			url: `https://www.youtube.com/embed/${media.id}`,
			title: targetLayer?.metaData.name ?? 'YouTube video'
		};
	}

	if (media.type === 'video') {
		return {
			type: 'video',
			url: media.url,
			title: targetLayer?.metaData.name ?? '動画'
		};
	}

	return {
		type: 'audio',
		url: media.url,
		title: targetLayer?.metaData.name ?? '音声',
		source: 'static'
	};
};

const getLayerFeatureMedia = async (
	featureMenuData: FeatureMenuData,
	targetLayer: GeoDataEntry | null
): Promise<FeaturePanelMedia[]> => {
	const data = featureMenuData.properties
		? propData[featureMenuData.properties._prop_id as string]
		: null;

	const fetchMedia = async (): Promise<FeaturePanelMedia[]> => {
		if (data?.medias && data.medias.length > 0) {
			return data.medias.map((media) => convertMediaData(media, targetLayer));
		}

		const imageKey =
			targetLayer && targetLayer.type === 'vector'
				? targetLayer.properties.attributeView.imageKey
				: null;

		if (featureMenuData.properties && imageKey) {
			const url = featureMenuData.properties[imageKey] as string;
			if (url) {
				return [
					{
						type: 'image',
						url,
						alt: '画像',
						source: 'static',
						fit: 'contain'
					}
				];
			}
		}

		const iNaturalistNameKey =
			targetLayer && targetLayer.type === 'vector'
				? targetLayer.properties.attributeView.relations?.iNaturalistNameKey
				: null;

		if (iNaturalistNameKey && featureMenuData.properties) {
			const name = featureMenuData.properties[iNaturalistNameKey] as string;
			if (name) {
				const res = await getImageByName(name);

				if (res) {
					return [
						{
							type: 'image',
							url: res.url,
							alt: name,
							source: 'inaturalist',
							credit: res.attribution,
							licenseName: res.licenseCode,
							linkUrl: `https://www.inaturalist.org/taxa/${res.taxonId}`,
							fit: 'contain'
						}
					];
				}
			}
		}

		return [];
	};

	const [media] = await Promise.all([fetchMedia(), delay(300)]);
	return media;
};

export const getLayerFeaturePanelSummary = async (
	featureMenuData: FeatureMenuData,
	layerEntries: GeoDataEntry[]
): Promise<FeaturePanelSummaryData | null> => {
	const targetLayer = layerEntries.find((entry) => entry.id === featureMenuData.layerId) ?? null;
	const data = featureMenuData.properties
		? propData[featureMenuData.properties._prop_id as string]
		: null;
	const media = await getLayerFeatureMedia(featureMenuData, targetLayer);
	const propId = featureMenuData.properties?._prop_id;

	if (propId && featureMenuData.properties) {
		return {
			title: String(featureMenuData.properties.name ?? targetLayer?.metaData.name ?? ''),
			subtitle:
				typeof featureMenuData.properties.category === 'string'
					? featureMenuData.properties.category
					: undefined,
			media,
			description: data?.description ?? undefined,
			sourceUrl: data?.url ?? undefined,
			sourceLabel: '詳細を見る'
		};
	}

	const title =
		targetLayer &&
		targetLayer.type === 'vector' &&
		targetLayer.properties.attributeView.titles.length &&
		featureMenuData.properties
			? generatePopupTitle(featureMenuData.properties, targetLayer.properties.attributeView.titles)
			: targetLayer?.metaData.name;

	return {
		title: title ?? '',
		subtitle: targetLayer?.metaData.name,
		media,
		description: data?.description ?? undefined,
		sourceUrl: data?.url ?? undefined,
		sourceLabel: '詳細を見る'
	};
};
