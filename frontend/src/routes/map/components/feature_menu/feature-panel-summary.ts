import { delay } from 'es-toolkit';

import {
	getImageByName,
	getTaxonomyByJapaneseName,
	RANK_NAMES_JA,
	type TaxonomicRank
} from '$routes/map/api/inaturalist';
import { getWikipediaArticle, type WikiArticle } from '$routes/map/api/wikipedia';
import { propData, type MediaData } from '$routes/map/data/entries/_prop_data';
import {
	ProtectionForestNameToCodeDict,
	ProtectionForestTypes
} from '$routes/map/data/forest/protection_forest';
import type { GeoDataEntry } from '$routes/map/data/types';
import { formatFieldValue } from '$routes/map/data/types/vector/properties';
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
	targetLayer: GeoDataEntry | null,
	iNaturalistData?: Awaited<ReturnType<typeof getImageByName>> | null
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
			if (name && iNaturalistData) {
				return [
					{
						type: 'image',
						url: iNaturalistData.url,
						alt: name,
						source: 'inaturalist',
						credit: iNaturalistData.attribution,
						licenseName: iNaturalistData.licenseCode,
						linkUrl: `https://www.inaturalist.org/taxa/${iNaturalistData.taxonId}`,
						fit: 'contain'
					}
				];
			}
		}

		return [];
	};

	const [media] = await Promise.all([fetchMedia(), delay(300)]);
	return media;
};

const getWikipediaArticleForINaturalist = async (
	commonName?: string
): Promise<WikiArticle | null> => {
	if (!commonName?.trim()) return null;

	return getWikipediaArticle(commonName);
};

const getTaxonomyItemsForINaturalist = async (
	commonName?: string
): Promise<Array<{ label: string; value: string }> | undefined> => {
	if (!commonName?.trim()) return undefined;

	const taxonomy = await getTaxonomyByJapaneseName(commonName);
	if (!taxonomy) return undefined;

	const ranks: TaxonomicRank[] = [
		'kingdom',
		'phylum',
		'class',
		'order',
		'family',
		'genus',
		'species'
	];
	const items = ranks
		.map((rank) => {
			const info = taxonomy[rank];
			if (!info) return null;

			return {
				label: RANK_NAMES_JA[rank],
				value: info.commonName || info.name
			};
		})
		.filter((item): item is { label: string; value: string } => item !== null);

	return items.length > 0 ? items : undefined;
};

const getProtectionForestDescription = (
	targetLayer: GeoDataEntry | null,
	featureMenuData: FeatureMenuData
): { name?: string; description?: string } | null => {
	if (!targetLayer || targetLayer.type !== 'vector' || !featureMenuData.properties) {
		return null;
	}

	const protectionForestNameKey =
		targetLayer.properties.attributeView.relations?.nationalForest?.protectionForestNameKey;
	if (!protectionForestNameKey) return null;

	const protectionForestName = featureMenuData.properties[protectionForestNameKey];
	if (typeof protectionForestName !== 'string' || protectionForestName === '') {
		return null;
	}

	const protectionForestCode = ProtectionForestNameToCodeDict[protectionForestName];
	if (!protectionForestCode) {
		return null;
	}

	return {
		name: protectionForestName,
		description: ProtectionForestTypes[protectionForestCode]?.description
	};
};

export const getLayerFeaturePanelSummary = async (
	featureMenuData: FeatureMenuData,
	layerEntries: GeoDataEntry[]
): Promise<FeaturePanelSummaryData | null> => {
	const targetLayer = layerEntries.find((entry) => entry.id === featureMenuData.layerId) ?? null;
	const data = featureMenuData.properties
		? propData[featureMenuData.properties._prop_id as string]
		: null;
	const propId = featureMenuData.properties?._prop_id;
	const descriptionKey =
		targetLayer && targetLayer.type === 'vector'
			? targetLayer.properties.attributeView.descriptionKey
			: null;
	const descriptionField =
		descriptionKey && targetLayer && targetLayer.type === 'vector'
			? targetLayer.properties.fields.find((field) => field.key === descriptionKey)
			: undefined;
	const attributeDescription =
		descriptionKey && featureMenuData.properties
			? formatFieldValue(featureMenuData.properties[descriptionKey], descriptionField)
			: null;
	const protectionForestSummary = getProtectionForestDescription(targetLayer, featureMenuData);
	const iNaturalistNameKey =
		targetLayer && targetLayer.type === 'vector'
			? targetLayer.properties.attributeView.relations?.iNaturalistNameKey
			: null;
	const iNaturalistName =
		iNaturalistNameKey && featureMenuData.properties
			? (featureMenuData.properties[iNaturalistNameKey] as string)
			: null;
	const [iNaturalistData, wikipediaArticle, taxonomy] = await Promise.all([
		iNaturalistName ? getImageByName(iNaturalistName) : Promise.resolve(null),
		!data?.description && iNaturalistName
			? getWikipediaArticleForINaturalist(iNaturalistName)
			: Promise.resolve(null),
		iNaturalistName ? getTaxonomyItemsForINaturalist(iNaturalistName) : Promise.resolve(undefined)
	]);
	const media = await getLayerFeatureMedia(featureMenuData, targetLayer, iNaturalistData);
	const description =
		typeof attributeDescription === 'string' && attributeDescription !== ''
			? attributeDescription
			: (data?.description ?? wikipediaArticle?.extract);
	const sourceUrl = data?.url ?? wikipediaArticle?.url ?? undefined;
	const sourceLabel = data?.url
		? '詳細を見る'
		: wikipediaArticle?.url
			? 'Wikipediaを見る'
			: undefined;

	if (propId && featureMenuData.properties) {
		return {
			title: String(featureMenuData.properties.name ?? targetLayer?.metaData.name ?? ''),
			subtitle:
				typeof featureMenuData.properties.category === 'string'
					? featureMenuData.properties.category
					: undefined,
			media,
			protectionForestName: protectionForestSummary?.name,
			protectionForestDescription: protectionForestSummary?.description,
			taxonomy,
			description,
			sourceUrl,
			sourceLabel
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
		protectionForestName: protectionForestSummary?.name,
		protectionForestDescription: protectionForestSummary?.description,
		taxonomy,
		description,
		sourceUrl,
		sourceLabel
	};
};
