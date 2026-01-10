// Wikipedia APIのレスポンス型定義
interface WikipediaResponse {
	batchcomplete: string;
	query: {
		redirects?: Array<{
			from: string;
			to: string;
		}>;
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
	coordinates?: Array<{
		lat: number;
		lon: number;
		primary?: string;
		globe?: string;
	}>;
	categories?: Array<{
		ns: number;
		title: string;
	}>;
	revisions?: Array<{
		timestamp: string;
		user?: string;
	}>;
	missing?: boolean;
	redirect?: string;
}

// 画像ライセンス情報
export interface ImageLicenseInfo {
	license: string;
	licenseShortName: string;
	licenseUrl?: string;
	artist?: string;
	attributionRequired: boolean;
	isAllowed: boolean;
}

// 簡略化された型（実際に使う部分のみ）
export interface WikiArticle {
	pageId: number;
	title: string;
	extract: string;
	thumbnail?: {
		source: string;
		width: number;
		height: number;
	};
	url: string;
	coordinates?: {
		lat: number;
		lon: number;
	};
	categories?: string[];
	prefecture?: string;
	lastModified?: string;
	wasRedirected?: boolean;
	originalTitle?: string;
	imageLicense?: ImageLicenseInfo;
}

// 教育目的で二次利用可能なライセンス
const ALLOWED_LICENSES = [
	'pd', // パブリックドメイン
	'public domain',
	'cc0', // CC0
	'cc-by', // CC BY（帰属表示のみ）
	'cc-by-sa', // CC BY-SA（帰属表示・継承）
	'cc-by-2.0',
	'cc-by-2.5',
	'cc-by-3.0',
	'cc-by-4.0',
	'cc-by-sa-2.0',
	'cc-by-sa-2.5',
	'cc-by-sa-3.0',
	'cc-by-sa-4.0',
	'gfdl' // GNU Free Documentation License
];

// ライセンスが許可されているかチェック
const isLicenseAllowed = (license: string): boolean => {
	if (!license) return false;
	const normalized = license.toLowerCase().replace(/\s+/g, '-');
	return ALLOWED_LICENSES.some((allowed) => normalized.includes(allowed));
};

// 画像のライセンス情報を取得
const getImageLicenseInfo = async (pageimage: string): Promise<ImageLicenseInfo | null> => {
	const endpoint = 'https://commons.wikimedia.org/w/api.php';
	const params = new URLSearchParams({
		action: 'query',
		format: 'json',
		titles: `File:${pageimage}`,
		prop: 'imageinfo',
		iiprop: 'extmetadata',
		origin: '*'
	});

	try {
		const response = await fetch(`${endpoint}?${params}`);
		const data = await response.json();

		const pages = data.query?.pages;
		if (!pages) return null;

		const pageId = Object.keys(pages)[0];
		const page = pages[pageId];

		if (pageId === '-1' || !page.imageinfo?.[0]?.extmetadata) {
			return null;
		}

		const metadata = page.imageinfo[0].extmetadata;
		const license = metadata.License?.value || metadata.LicenseShortName?.value || '';
		const licenseShortName = metadata.LicenseShortName?.value || license;

		return {
			license,
			licenseShortName,
			licenseUrl: metadata.LicenseUrl?.value,
			artist: metadata.Artist?.value?.replace(/<[^>]*>/g, ''), // HTMLタグを除去
			attributionRequired: metadata.AttributionRequired?.value === 'true',
			isAllowed: isLicenseAllowed(license)
		};
	} catch (error) {
		console.error('License API Error:', error);
		return null;
	}
};

// Wikipedia APIで記事情報を取得
export const getWikipediaArticle = async (title: string): Promise<WikiArticle | null> => {
	const endpoint = 'https://ja.wikipedia.org/w/api.php';
	const params = new URLSearchParams({
		action: 'query',
		format: 'json',
		titles: title,
		prop: 'extracts|info|pageimages|coordinates|categories|revisions',
		exintro: 'true',
		explaintext: 'true',
		inprop: 'url',
		pithumbsize: '500',
		redirects: '1', // リダイレクトを自動解決
		clshow: '!hidden', // 隠しカテゴリを除外
		rvprop: 'timestamp', // 最終更新日時
		rvlimit: '1',
		origin: '*'
	});

	try {
		const response = await fetch(`${endpoint}?${params}`);
		const data: WikipediaResponse = await response.json();

		// リダイレクト情報を取得
		const redirectInfo = data.query.redirects?.[0];

		const pages = data.query.pages;
		const pageId = Object.keys(pages)[0];
		const page = pages[pageId];

		// ページが存在しない場合
		if (page.missing || pageId === '-1') {
			console.warn('ページが見つかりません:', title);
			return null;
		}

		// extractが空の場合（リダイレクトのみで実体がない）
		if (!page.extract) {
			console.warn('記事の内容が空です:', title);
			return null;
		}

		// カテゴリを取得
		const categories = page.categories?.map((cat) => cat.title.replace('Category:', ''));

		// 都道府県を取得（複数の方法を試す）
		let prefecture: string | null = null;

		// 方法1: カテゴリから
		prefecture = extractPrefectureFromCategories(categories);

		// 方法2: 本文から（カテゴリで見つからない場合）
		if (!prefecture) {
			prefecture = extractPrefectureFromText(page.extract);
		}

		// // 方法3: 座標から逆ジオコーディング（他の方法で見つからず、座標がある場合）
		// if (!prefecture && page.coordinates?.[0]) {
		// 	prefecture = await getPrefectureFromCoordinates(
		// 		page.coordinates[0].lat,
		// 		page.coordinates[0].lon
		// 	);
		// }

		// 画像のライセンス情報を取得
		let imageLicense: ImageLicenseInfo | undefined;
		let thumbnail = page.thumbnail;

		if (page.pageimage) {
			const licenseInfo = await getImageLicenseInfo(page.pageimage);
			if (licenseInfo) {
				imageLicense = licenseInfo;
				// ライセンスが許可されていない場合はサムネイルを除外
				if (!licenseInfo.isAllowed) {
					thumbnail = undefined;
				}
			}
		}

		return {
			pageId: page.pageid,
			title: page.title,
			extract: page.extract,
			thumbnail,
			url: page.fullurl,
			coordinates: page.coordinates?.[0],
			categories,
			prefecture: prefecture || undefined,
			lastModified: page.revisions?.[0]?.timestamp,
			wasRedirected: !!redirectInfo,
			originalTitle: redirectInfo ? redirectInfo.from : title,
			imageLicense
		};
	} catch (error) {
		console.error('Wikipedia API Error:', error);
		return null;
	}
};

// カテゴリから都道府県を抽出
const extractPrefectureFromCategories = (categories?: string[]): string | null => {
	if (!categories) return null;

	const prefectures = [
		'北海道',
		'青森県',
		'岩手県',
		'宮城県',
		'秋田県',
		'山形県',
		'福島県',
		'茨城県',
		'栃木県',
		'群馬県',
		'埼玉県',
		'千葉県',
		'東京都',
		'神奈川県',
		'新潟県',
		'富山県',
		'石川県',
		'福井県',
		'山梨県',
		'長野県',
		'岐阜県',
		'静岡県',
		'愛知県',
		'三重県',
		'滋賀県',
		'京都府',
		'大阪府',
		'兵庫県',
		'奈良県',
		'和歌山県',
		'鳥取県',
		'島根県',
		'岡山県',
		'広島県',
		'山口県',
		'徳島県',
		'香川県',
		'愛媛県',
		'高知県',
		'福岡県',
		'佐賀県',
		'長崎県',
		'熊本県',
		'大分県',
		'宮崎県',
		'鹿児島県',
		'沖縄県'
	];

	for (const category of categories) {
		for (const pref of prefectures) {
			if (category.includes(pref)) {
				return pref;
			}
		}
	}

	return null;
};

// 本文から都道府県を抽出
const extractPrefectureFromText = (extract: string): string | null => {
	const prefectures = [
		'北海道',
		'青森県',
		'岩手県',
		'宮城県',
		'秋田県',
		'山形県',
		'福島県',
		'茨城県',
		'栃木県',
		'群馬県',
		'埼玉県',
		'千葉県',
		'東京都',
		'神奈川県',
		'新潟県',
		'富山県',
		'石川県',
		'福井県',
		'山梨県',
		'長野県',
		'岐阜県',
		'静岡県',
		'愛知県',
		'三重県',
		'滋賀県',
		'京都府',
		'大阪府',
		'兵庫県',
		'奈良県',
		'和歌山県',
		'鳥取県',
		'島根県',
		'岡山県',
		'広島県',
		'山口県',
		'徳島県',
		'香川県',
		'愛媛県',
		'高知県',
		'福岡県',
		'佐賀県',
		'長崎県',
		'熊本県',
		'大分県',
		'宮崎県',
		'鹿児島県',
		'沖縄県'
	];

	// 最初に出現した都道府県を返す
	for (const pref of prefectures) {
		if (extract.includes(pref)) {
			return pref;
		}
	}

	return null;
};

// 座標から都道府県を取得（逆ジオコーディング）
const getPrefectureFromCoordinates = async (lat: number, lon: number): Promise<string | null> => {
	const params = new URLSearchParams({
		lat: lat.toString(),
		lon: lon.toString(),
		format: 'json',
		addressdetails: '1',
		'accept-language': 'ja'
	});

	try {
		const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
			headers: {
				'User-Agent': 'YourApp/1.0' // 必須
			}
		});

		const data = await response.json();
		return data.address?.state || null;
	} catch (error) {
		console.error('Nominatim Error:', error);
		return null;
	}
};
