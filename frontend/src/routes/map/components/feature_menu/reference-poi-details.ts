import { getTransitPoiLinks } from './reference-poi-transit';

import {
	checkOsmPoiMatch,
	decodePlanetilerPoiId,
	fetchOsmPoiElement
} from '$routes/map/api/osm-poi';
import { getPoiKnowledge, type PoiKnowledge } from '$routes/map/api/poi-knowledge';
import type { FeatureMenuData, FeaturePanelSummary } from '$routes/map/types';
import { getPoiCategoryLabel } from '$routes/map/utils/data/poi-category';

const getWikidataId = (value: unknown): string | undefined =>
	typeof value === 'string' && /^Q[1-9]\d*$/.test(value) ? value : undefined;

export const getReferencePoiDetails = async (data: FeatureMenuData) => {
	let properties = { ...data.properties };
	const notices: string[] = [];
	const links: Array<{ label: string; url: string; }> = [];
	const ref = data.osmIdEncoding === 'planetiler' ? decodePlanetilerPoiId(data.featureId) : null;
	if (ref) {
		try {
			const element = await fetchOsmPoiElement(ref);
			if (checkOsmPoiMatch(properties, data.point, element).status === 'match') {
				properties = { ...properties, ...element.tags };
				links.push({
					label: 'OpenStreetMap',
					url: `https://www.openstreetmap.org/${ref.type}/${ref.id}`
				});
			} else {
				notices.push('OSMの取得結果を照合できなかったため、地図上の属性を表示しています。');
			}
		} catch {
			notices.push('OSMの属性を取得できませんでした。地図上の属性を表示しています。');
		}
	}
	const name = String(properties['name:ja'] ?? properties.name ?? '名称なし');
	const transitLinks = getTransitPoiLinks(properties, data.point);
	const isTransit = transitLinks !== null;
	if (transitLinks) links.unshift(...transitLinks);
	const facilityWikidata = getWikidataId(properties.wikidata);
	const brandWikidata = isTransit ? undefined : getWikidataId(properties['brand:wikidata']);
	const wikidata = facilityWikidata ?? brandWikidata;
	const isBrandInformation = !facilityWikidata && !!brandWikidata;
	let knowledge: PoiKnowledge = { article: null };
	try {
		if (!isTransit || wikidata) {
			knowledge = await getPoiKnowledge(name === '名称なし' ? '' : name, wikidata);
		}
	} catch {
		notices.push('Wikiの情報を取得できませんでした。');
	}
	const { article, image } = knowledge;
	const brandName = String(properties['brand:ja'] ?? properties.brand ?? article?.title ?? '');
	const wikidataLabel = isBrandInformation ? 'ブランドのWikidata' : 'Wikidata';
	const wikipediaLabel = isBrandInformation ? 'ブランドのWikipedia' : 'Wikipedia';
	if (knowledge.wikidataUrl) links.push({ label: wikidataLabel, url: knowledge.wikidataUrl });
	const wikipediaUrl = knowledge.wikipediaUrl ?? article?.url;
	if (wikipediaUrl) links.push({ label: wikipediaLabel, url: wikipediaUrl });
	const searchUrl = `https://ja.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`;
	if (!isTransit && !wikidata && name !== '名称なし') {
		links.push({ label: 'Wikipediaで検索', url: searchUrl });
	}
	const thumbnail = image?.thumbnail ?? article?.thumbnail;
	const license = image?.thumbnail ? image : article?.imageLicense;
	const summary: FeaturePanelSummary = {
		title: name,
		subtitle: getPoiCategoryLabel(properties),
		point: data.point,
		media: thumbnail
			? [{
				type: 'image',
				url: thumbnail.source,
				alt: isBrandInformation ? `${brandName || 'ブランド'}の画像` : name,
				credit: license?.artist,
				licenseName: license?.licenseShortName,
				licenseUrl: license?.licenseUrl,
				linkUrl: image?.thumbnail ? image.descriptionUrl : article?.url,
				source: image?.thumbnail ? 'static' : 'wikipedia',
				fit: 'contain'
			}]
			: [],
		description: article?.extract?.trim()
			? {
				text: article.extract,
				source: 'wikipedia',
				linkUrl: article.url,
				linkLabel: `${wikipediaLabel}を見る`
			}
			: knowledge.description?.trim()
			? {
				text: knowledge.description,
				source: 'external',
				linkUrl: knowledge.wikidataUrl,
				linkLabel: `${wikidataLabel}を見る`
			}
			: undefined
	};
	const attributeItems = Object.entries(properties).filter(
		(item): item is [string, string | number | true] =>
			(typeof item[1] === 'string' && item[1] !== '') || typeof item[1] === 'number'
			|| item[1] === true
	);
	return {
		summary,
		attributeItems,
		links,
		notices,
		isTransit,
		brandInformationLabel: isBrandInformation
			? `ブランド情報${brandName ? `：${brandName}` : ''}`
			: undefined,
		searchCandidate: knowledge.searchCandidate
	};
};
