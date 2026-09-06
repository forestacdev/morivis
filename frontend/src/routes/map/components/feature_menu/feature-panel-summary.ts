import { delay } from 'es-toolkit';

import { getImageByName } from '$routes/map/api/inaturalist';
import { getWikipediaArticle, type WikiArticle } from '$routes/map/api/wikipedia';
import {
	ProtectionForestNameToCodeDict,
	ProtectionForestTypes
} from '$routes/map/data/forest/protection_forest';
import { getTimberSpeciesData } from '$routes/map/data/forest/timber_species';
import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { MediaData } from '$routes/map/data/types/details';
import type { Relations } from '$routes/map/data/types/vector/properties';
import { formatFieldValue } from '$routes/map/data/types/vector/properties';
import type {
	FeatureMenuData,
	FeaturePanelMedia,
	FeaturePanelSummary as FeaturePanelSummaryData
} from '$routes/map/types';
import { generatePopupTitle } from '$routes/map/utils/data/properties';
import { resolvePopupImageUrl } from '$routes/map/utils/icon';

export const hasFeaturePanelSummaryContent = (summary: FeaturePanelSummaryData): boolean => {
	return Boolean(
		summary.description?.linkUrl
			|| summary.description?.text.trim()
			|| summary.timberSpecies
		// summary.protectionForestDescription?.trim()
		// summary.point ||
	);
};

const getLayerRelations = (targetLayer: MorivisLayerEntry | null): Relations | undefined => {
	if (targetLayer?.type === 'vector') return targetLayer.properties.attributeView.relations;
	if (targetLayer?.type === 'model') return targetLayer.properties?.attributeView?.relations;
	return undefined;
};

// _prop_data.ts の静的メディア定義を FeaturePanel 用メディア形式に変換する。
const convertMediaData = (
	media: MediaData,
	targetLayer: MorivisLayerEntry | null,
	title = targetLayer?.metaData.name
): FeaturePanelMedia => {
	if (media.type === 'image') {
		return {
			type: 'image',
			url: media.url,
			alt: title ?? '画像',
			source: 'static',
			fit: 'cover'
		};
	}

	if (media.type === 'youtube') {
		return {
			type: 'youtube',
			url: `https://www.youtube.com/embed/${media.id}`,
			title: title ?? 'YouTube video'
		};
	}

	if (media.type === 'video') {
		return {
			type: 'video',
			url: media.url,
			title: title ?? '動画'
		};
	}

	return {
		type: 'audio',
		url: media.url,
		title: title ?? '音声',
		source: 'static'
	};
};

// メディア表示は 静的定義 -> 属性画像 -> iNaturalist 画像 の順で解決する。
const getLayerFeatureMedia = async (
	featureMenuData: FeatureMenuData,
	targetLayer: MorivisLayerEntry | null,
	iNaturalistData?: Awaited<ReturnType<typeof getImageByName>> | null,
	modelPart?: FeatureMenuData['modelPart']
): Promise<FeaturePanelMedia[]> => {
	const propId = featureMenuData.properties?._prop_id;
	const data = targetLayer?.type === 'vector' && typeof propId === 'string'
		? targetLayer.properties.detailsById?.[propId]
		: undefined;

	const fetchMedia = async (): Promise<FeaturePanelMedia[]> => {
		const medias = modelPart?.medias ?? data?.medias;
		if (medias && medias.length > 0) {
			return medias.map((media) => convertMediaData(media, targetLayer, modelPart?.name));
		}

		const url = targetLayer && targetLayer.type === 'vector'
			? resolvePopupImageUrl(featureMenuData.properties, targetLayer.properties)
			: null;

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

		const iNaturalistNameKey = getLayerRelations(targetLayer)?.iNaturalistNameKey;

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
						fit: 'cover'
					}
				];
			}
		}

		return [];
	};

	const [media] = await Promise.all([fetchMedia(), delay(300)]);
	return media;
};

// iNaturalist で使った和名から Wikipedia の概要ページを引く。
const getWikipediaArticleForINaturalist = async (
	commonName?: string
): Promise<WikiArticle | null> => {
	if (!commonName?.trim()) return null;

	return getWikipediaArticle(commonName);
};

// 国有林レイヤーでは、保安林種別名から保安林説明辞書を引けるようにする。
const getProtectionForestDescription = (
	targetLayer: MorivisLayerEntry | null,
	featureMenuData: FeatureMenuData
): { name?: string; description?: string; } | null => {
	if (!targetLayer || targetLayer.type !== 'vector' || !featureMenuData.properties) {
		return null;
	}

	const protectionForestNameKey = targetLayer.properties.attributeView.relations?.nationalForest
		?.protectionForestNameKey;
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

// 樹種名が木材辞書にあれば、木材画像と分布説明を概要欄に追加する。
const getTimberSpeciesSummary = (
	targetLayer: MorivisLayerEntry | null,
	featureMenuData: FeatureMenuData
):
	| {
		url: string;
		distribution?: string;
		nameEn?: string;
		scientificName?: string;
		airDryDensity?: number | { min: number; max: number; };
		woodStructure?: string;
		hardness?: string;
		summary?: string;
		characteristics?: string[];
		uses?: string[];
	}
	| undefined =>
{
	if (
		!targetLayer
		|| (targetLayer.type !== 'vector' && targetLayer.type !== 'model')
		|| !featureMenuData.properties
	) {
		return undefined;
	}

	const timberSpeciesNameKey = getLayerRelations(targetLayer)?.iNaturalistNameKey;
	if (!timberSpeciesNameKey) {
		return undefined;
	}

	const timberSpeciesName = featureMenuData.properties[timberSpeciesNameKey];
	if (typeof timberSpeciesName !== 'string' || timberSpeciesName === '') {
		return undefined;
	}

	const timberSpecies = getTimberSpeciesData(timberSpeciesName);
	if (!timberSpecies) return undefined;

	return {
		url: timberSpecies.url,
		distribution: timberSpecies.distribution,
		nameEn: timberSpecies.detail?.nameEn,
		scientificName: timberSpecies.detail?.scientificName,
		airDryDensity: timberSpecies.detail?.airDryDensity,
		woodStructure: timberSpecies.detail?.woodStructure,
		hardness: timberSpecies.detail?.hardness,
		summary: timberSpecies.detail?.summary,
		characteristics: timberSpecies.detail?.characteristics,
		uses: timberSpecies.detail?.uses
	};
};

// 通常の地物クリック時に表示する概要情報をここで集約して組み立てる。
export const getLayerFeaturePanelSummary = async (
	featureMenuData: FeatureMenuData,
	layerEntries: MorivisLayerEntry[]
): Promise<FeaturePanelSummaryData | null> => {
	const modelPart = featureMenuData.modelPart;
	const targetLayer = layerEntries.find((entry) => entry.id === featureMenuData.layerId) ?? null;
	const propId = featureMenuData.properties?._prop_id;
	const modelObjectName = targetLayer?.type === 'model'
			&& typeof featureMenuData.properties?.['オブジェクト名'] === 'string'
		? featureMenuData.properties['オブジェクト名']
		: undefined;
	const modelPartTitle = modelPart?.name ?? modelObjectName;
	const data = targetLayer?.type === 'vector' && typeof propId === 'string'
		? targetLayer.properties.detailsById?.[propId]
		: undefined;
	const descriptionKey = targetLayer && targetLayer.type === 'vector'
		? targetLayer.properties.attributeView.descriptionKey
		: null;
	const descriptionField = descriptionKey && targetLayer && targetLayer.type === 'vector'
		? targetLayer.properties.fields.find((field) => field.key === descriptionKey)
		: undefined;
	const attributeDescription = descriptionKey && featureMenuData.properties
		? formatFieldValue(featureMenuData.properties[descriptionKey], descriptionField)
		: null;
	const protectionForestSummary = getProtectionForestDescription(targetLayer, featureMenuData);
	const timberSpecies = getTimberSpeciesSummary(targetLayer, featureMenuData);
	const iNaturalistNameKey = getLayerRelations(targetLayer)?.iNaturalistNameKey;
	const iNaturalistName = iNaturalistNameKey && featureMenuData.properties
		? (featureMenuData.properties[iNaturalistNameKey] as string)
		: null;

	// 外部連携で取るものは並列で取得する。
	const [iNaturalistData, wikipediaArticle] = await Promise.all([
		iNaturalistName ? getImageByName(iNaturalistName) : Promise.resolve(null),
		!modelPart?.description && !data?.description && iNaturalistName
			? getWikipediaArticleForINaturalist(iNaturalistName)
			: Promise.resolve(null)
	]);

	const media = await getLayerFeatureMedia(
		featureMenuData,
		targetLayer,
		iNaturalistData,
		modelPart
	);

	// 説明文は 属性 descriptionKey -> _prop_data.ts -> Wikipedia の順で補完する。
	const description = typeof attributeDescription === 'string' && attributeDescription !== ''
		? {
			text: attributeDescription,
			source: 'attribute' as const
		}
		: modelPart?.description
		? {
			text: modelPart.description,
			source: 'static' as const,
			linkUrl: modelPart.url,
			linkLabel: modelPart.url ? '詳細を見る' : undefined
		}
		: data?.description
		? {
			text: data.description,
			source: 'static' as const,
			linkUrl: data.url ?? undefined,
			linkLabel: data.url ? '詳細を見る' : undefined
		}
		: wikipediaArticle?.extract
		? {
			text: wikipediaArticle.extract,
			source: 'wikipedia' as const,
			linkUrl: wikipediaArticle.url ?? undefined,
			linkLabel: wikipediaArticle.url ? 'Wikipediaを見る' : undefined
		}
		: undefined;

	if (propId && featureMenuData.properties) {
		return {
			title: modelPartTitle
				?? String(featureMenuData.properties.name ?? targetLayer?.metaData.name ?? ''),
			subtitle: typeof featureMenuData.properties.category === 'string'
				? featureMenuData.properties.category
				: targetLayer?.type === 'model'
				? targetLayer.metaData.name
				: undefined,
			media,
			protectionForestName: protectionForestSummary?.name,
			protectionForestDescription: protectionForestSummary?.description,
			timberSpecies,
			description
		};
	}

	const title = targetLayer
			&& targetLayer.type === 'vector'
			&& targetLayer.properties.attributeView.titles.length
			&& featureMenuData.properties
		? generatePopupTitle(
			featureMenuData.properties,
			targetLayer.properties.attributeView.titles
		)
		: modelPartTitle ?? targetLayer?.metaData.name;

	return {
		title: title ?? '',
		subtitle: targetLayer?.metaData.name,
		media,
		protectionForestName: protectionForestSummary?.name,
		protectionForestDescription: protectionForestSummary?.description,
		timberSpecies,
		description
	};
};
