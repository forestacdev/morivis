import { getImageLicenseInfo, getWikipediaArticle, type WikiArticle } from './wikipedia';

type PoiImageType = 'image' | 'logo';
type ImageClaim = { rank?: string; mainsnak: { datavalue?: { value: unknown; }; }; };

interface WikidataEntity {
	descriptions?: Record<string, { value: string; }>;
	sitelinks?: Record<string, { title: string; }>;
	claims?: {
		P18?: ImageClaim[];
		P154?: ImageClaim[];
	};
}

export interface PoiKnowledge {
	article: WikiArticle | null;
	wikidataUrl?: string;
	wikipediaUrl?: string;
	description?: string;
	image?: Awaited<ReturnType<typeof getImageLicenseInfo>>;
	searchCandidate?: { title: string; url: string; };
}

const fetchJson = async <T>(endpoint: string, values: Record<string, string>): Promise<T> => {
	const params = new URLSearchParams({ format: 'json', origin: '*', ...values });
	const response = await fetch(`${endpoint}?${params}`, { signal: AbortSignal.timeout(10000) });
	if (!response.ok) throw new Error(`Wiki API: ${response.status}`);
	const data = await response.json();
	if (data.error) throw new Error(data.error.info ?? 'Wiki API error');
	return data as T;
};

const withWhiteLogoBackground = async (source: string): Promise<string> => {
	try {
		const response = await fetch(source, { signal: AbortSignal.timeout(10000) });
		if (!response.ok) return source;
		const bitmap = await createImageBitmap(await response.blob());
		try {
			const canvas = document.createElement('canvas');
			canvas.width = bitmap.width;
			canvas.height = bitmap.height;
			const context = canvas.getContext('2d');
			if (!context) return source;
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.drawImage(bitmap, 0, 0);
			return canvas.toDataURL('image/png');
		} finally {
			bitmap.close();
		}
	} catch {
		// 画像の取得・変換に失敗しても、説明と元画像は表示する。
		return source;
	}
};

const loadKnowledge = async (
	name: string,
	wikidata: string | undefined,
	imageType: PoiImageType
): Promise<PoiKnowledge> => {
	if (wikidata && /^Q[1-9]\d*$/.test(wikidata)) {
		const data = await fetchJson<{ entities: Record<string, WikidataEntity>; }>(
			'https://www.wikidata.org/w/api.php',
			{
				action: 'wbgetentities',
				ids: wikidata,
				props: 'descriptions|claims|sitelinks',
				languages: 'ja|en',
				sitefilter: 'jawiki|enwiki'
			}
		);
		const entity = data.entities[wikidata];
		if (!entity) throw new Error('Wikidataの項目が見つかりません');
		const language = entity.sitelinks?.jawiki ? 'ja' : 'en';
		const articleTitle = entity.sitelinks?.[`${language}wiki`]?.title;
		// ブランドではロゴだけを取得し、通常画像（本社ビルなど）に代替しない。
		const images = (entity.claims?.[imageType === 'logo' ? 'P154' : 'P18'] ?? []).filter(
			(claim) =>
				claim.rank !== 'deprecated'
				&& typeof claim.mainsnak.datavalue?.value === 'string'
		);
		const imageValue = (images.find((claim) => claim.rank === 'preferred') ?? images[0])
			?.mainsnak.datavalue?.value;
		const [article, image] = await Promise.all([
			articleTitle ? getWikipediaArticle(articleTitle, { exactTitle: true, language }) : null,
			typeof imageValue === 'string' ? getImageLicenseInfo(imageValue) : null
		]);
		let displayImage = image?.isAllowed ? image : null;
		if (imageType === 'logo' && displayImage?.thumbnail) {
			displayImage = {
				...displayImage,
				thumbnail: {
					...displayImage.thumbnail,
					source: await withWhiteLogoBackground(displayImage.thumbnail.source)
				}
			};
		}
		return {
			article,
			wikipediaUrl: articleTitle
				? `https://${language}.wikipedia.org/wiki/${
					encodeURIComponent(articleTitle.replaceAll(' ', '_'))
				}`
				: undefined,
			image: displayImage,
			wikidataUrl: `https://www.wikidata.org/wiki/${wikidata}`,
			description: entity.descriptions?.ja?.value ?? entity.descriptions?.en?.value
		};
	}
	if (!name.trim()) return { article: null };
	const data = await fetchJson<{ query?: { search?: Array<{ title: string; }>; }; }>(
		'https://ja.wikipedia.org/w/api.php',
		{
			action: 'query',
			list: 'search',
			srsearch: `"${name.trim().replace(/["\\]/g, ' ')}"`,
			srnamespace: '0',
			srlimit: '1'
		}
	);
	const title = data.query?.search?.[0]?.title;
	if (!title) return { article: null };
	// 名称検索だけでは同一施設と判断できないため、説明や画像は取得しない。
	return {
		article: null,
		searchCandidate: {
			title,
			url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
		}
	};
};

const knowledgeCache = new Map<string, Promise<PoiKnowledge>>();

export const getPoiKnowledge = (
	name: string,
	wikidata?: string,
	imageType: PoiImageType = 'image'
): Promise<PoiKnowledge> => {
	const key = JSON.stringify([name, wikidata, imageType]);
	const cached = knowledgeCache.get(key);
	if (cached) return cached;
	const request = loadKnowledge(name, wikidata, imageType).catch((error) => {
		knowledgeCache.delete(key);
		throw error;
	});
	if (knowledgeCache.size >= 100) knowledgeCache.delete(knowledgeCache.keys().next().value!);
	knowledgeCache.set(key, request);
	return request;
};
