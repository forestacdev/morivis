// Wikipedia APIのレスポンス型定義
interface WikipediaResponse {
	batchcomplete: string;
	query: {
		pages: {
			[pageId: string]: WikipediaPage;
		};
	};
}

interface WikipediaPage {
	pageid: number;
	ns: number;
	title: string;
	extract: string;
	contentmodel: string;
	pagelanguage: string;
	pagelanguagehtmlcode: string;
	pagelanguagedir: string;
	touched: string;
	lastrevid: number;
	length: number;
	fullurl: string;
	editurl: string;
	canonicalurl: string;
	thumbnail?: {
		source: string;
		width: number;
		height: number;
	};
	pageimage?: string;
	missing?: boolean; // ページが存在しない場合
}

// 簡略化された型（実際に使う部分のみ）
interface WikiArticle {
	pageId: number;
	title: string;
	extract: string;
	thumbnail?: {
		source: string;
		width: number;
		height: number;
	};
	url: string;
}

// Wikipedia APIで記事情報を取得
export const getWikipediaArticle = async (title: string): Promise<WikiArticle | null> => {
	const endpoint = 'https://ja.wikipedia.org/w/api.php';
	const params = new URLSearchParams({
		action: 'query',
		format: 'json',
		titles: title,
		prop: 'extracts|info|pageimages',
		exintro: 'true',
		explaintext: 'true',
		inprop: 'url',
		pithumbsize: '500',
		origin: '*'
	});

	try {
		const response = await fetch(`${endpoint}?${params}`);
		const data: WikipediaResponse = await response.json();

		const pages = data.query.pages;
		const pageId = Object.keys(pages)[0];
		const page = pages[pageId];

		// ページが存在しない場合
		if (page.missing || pageId === '-1') {
			return null;
		}

		return {
			pageId: page.pageid,
			title: page.title,
			extract: page.extract,
			thumbnail: page.thumbnail,
			url: page.fullurl
		};
	} catch (error) {
		console.error('Wikipedia API Error:', error);
		return null;
	}
};
