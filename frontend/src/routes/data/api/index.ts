interface GsiGetelEvation {
	elevation: number;
	hsrc: string;
}

/**
 * 国土地理院の標高APIを利用して、指定した緯度経度の標高を取得する関数
 * https://maps.gsi.go.jp/development/elevation_s.html
 * @param lng 経度
 * @param lat 緯度
 * @returns 標高 (m)
 */
export const gsiGetElevation = async (lng: number, lat: number): Promise<number> => {
	const url = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lng}&lat=${lat}&outtype=JSON`;
	try {
		const response = await fetch(url);
		if (response.ok) {
			// 型アサーションで型を明示
			const data: GsiGetelEvation = await response.json();
			return data.elevation;
		} else {
			throw new Error('Failed to fetch');
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		} else {
			throw new Error('Unknown error occurred');
		}
	}
};

interface Address {
	results: {
		muniCd: string;
		lv01Nm: string;
	};
}

import { GSI } from './muni';

// 国土地理院APIの変換表を使って住所コードを住所に変換
export const addressCodeToAddress = (addressCode: string) => {
	const csvString = GSI.MUNI_ARRAY[addressCode as keyof typeof GSI.MUNI_ARRAY];
	if (!csvString) return '';
	const parts = csvString.split(',');
	return `${parts[1]}${parts[3]}`;
};

/**
 * 国土地理院APIを利用して、指定した緯度経度から住所情報を取得する関数
 * @param lng 経度
 * @param lat 緯度
 * @returns 住所情報
 */
export const lonLatToAddress = async (lng: number, lat: number): Promise<string> => {
	const url = `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lng}`;
	try {
		const response = await fetch(url);
		if (response.ok) {
			const data: Address = await response.json();
			const address = addressCodeToAddress(data.results.muniCd);
			return `${address}${data.results.lv01Nm === '－' ? '' : data.results.lv01Nm}`;
		} else {
			throw new Error('Failed to fetch');
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		} else {
			throw new Error('Unknown error occurred');
		}
	}
};

/* 国土地理院APIの住所検索レスポンスデータ */
interface GsiAddressSearchData {
	geometry: {
		coordinates: [number, number];
		type: 'Point';
	};
	type: 'Feature';
	properties: {
		addressCode: string;
		title: string;
	};
}

/** 国土地理院APIの住所検索 */
export const addressSearch = async (searchWord: string): Promise<GsiAddressSearchData[]> => {
	const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${searchWord}`;
	try {
		const response = await fetch(url, {
			method: 'GET'
		});

		if (response.ok) return response.json();
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		} else {
			throw new Error('Unknown error occurred');
		}
	}
};

/**
 * Overpass APIを利用して、指定したキーワードでPOIを検索する関数
 * @param keyword 検索キーワード
 * @param limit 取得件数
 */
export const searchPOIOverpass = async (keyword: string, limit = 10): Promise<void> => {
	const query = `
		[out:json][timeout:25];
		node
		  [name~"${keyword}"]
		  (35.0, 135.0, 36.0, 136.0);
		out body ${limit};
	`;

	try {
		const res = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			body: query,
			headers: {
				'Content-Type': 'text/plain'
			}
		});

		if (res.ok) {
			const data = await res.json();

			return data.elements;
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		} else {
			throw new Error('Unknown error occurred');
		}
	}
};

interface GSISeamless {
	title: string;
	symbol: string;
	value: string;
	r: number;
	g: number;
	b: number;
	formationAge_ja: string;
	formationAge_en: string;
	group_ja: string;
	group_en: string;
	lithology_ja: string;
	lithology_en: string;
}

/*
 * 20万分の1日本シームレス地質図V2 Web APIを利用して、緯度軽度から地質情報を取得する関数
 * @param lng 経度
 * @param lat 緯度
 * @returns 地質情報
 */
export const getGSISeamless = async (lng: number, lat: number): Promise<GSISeamless> => {
	const url = `https://gbank.gsj.jp/seamless/v2/api/1.3.1/legend.json?point=${lat},${lng}`;
	try {
		const response = await fetch(url);
		if (response.ok) {
			const data = await response.json();
			return data;
		} else {
			throw new Error('Failed to fetch');
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		} else {
			throw new Error('Unknown error occurred');
		}
	}
};

// 型定義
interface WikiImage {
	title: string;
}

interface WikiResponse {
	query: {
		pages: {
			[key: string]: {
				images: WikiImage[];
			};
		};
	};
}

// wiki画像のフィルタリング関数
const filterWikiImages = async (response: WikiResponse): Promise<WikiImage[]> => {
	const pages = Object.values(response.query.pages);
	if (pages.length === 0) return [];

	const images = pages[0].images || [];

	// ラスタ画像の拡張子でフィルタリング
	const rasterImages = images.filter((image) => /\.(jpg|jpeg|png)$/i.test(image.title));

	return rasterImages;
};

// wiki画像URLを取得する関数
const getWikiImageUrls = async (imageTitles: WikiImage[]): Promise<string[]> => {
	const baseUrl = 'https://ja.wikipedia.org/w/api.php';
	const urls: string[] = [];

	for (const image of imageTitles) {
		const imageTitle = encodeURIComponent(image.title);
		const url = `${baseUrl}?action=query&titles=${imageTitle}&prop=imageinfo&iiprop=url&format=json&origin=*`;

		const res = await fetch(url);
		const data = await res.json();
		const pages = Object.values(data.query.pages);

		const imageUrl = pages[0]?.imageinfo?.[0]?.url || null;
		if (imageUrl) {
			urls.push(imageUrl);
		}
	}

	return urls;
};

// 1つ目の画像URLを取得する関数
const getFirstWikiImageUrl = async (imageTitle: string): Promise<string | null> => {
	const baseUrl = 'https://ja.wikipedia.org/w/api.php';
	const encodedTitle = encodeURIComponent(imageTitle);
	const url = `${baseUrl}?action=query&titles=${encodedTitle}&prop=imageinfo&iiprop=url&format=json&origin=*`;

	const res = await fetch(url);
	const data = await res.json();
	const pages = Object.values(data.query.pages);

	// 最初の画像URLを取得
	return pages[0]?.imageinfo?.[0]?.url || null;
};

// メイン関数
export const fetchWikipediaImage = async (pageTitle: string): Promise<string | null> => {
	const baseUrl = 'https://ja.wikipedia.org/w/api.php';
	const url = `${baseUrl}?action=query&prop=images&titles=${encodeURIComponent(
		pageTitle
	)}&format=json&origin=*`;

	const res = await fetch(url);

	const data: WikiResponse = await res.json();

	console.log(data);

	// 画像をフィルタリング
	const Images = await filterWikiImages(data);

	if (Images.length === 0) {
		return null;
	}

	const image = getFirstWikiImageUrl(Images[0].title);

	return image;
};

// Sentinel-2 L2Aデータを取得する関数
const searchDataset = async (
	minx: number,
	miny: number,
	maxx: number,
	maxy: number,
	limit: number = 12
): Promise<any> => {
	const url = new URL('https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items');

	const params = {
		limit: limit.toString(),
		bbox: `${minx},${miny},${maxx},${maxy}`
	};

	Object.entries(params).forEach(([key, value]) => {
		url.searchParams.append(key, value);
	});

	const response = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`);
	}

	const dataset = await response.json();
	return dataset;
};

// Himawariの衛星画像の取得
export const getHimawariSatimgTimes = async () => {
	try {
		const response = await fetch(
			'https://www.jma.go.jp/bosai/himawari/data/satimg/targetTimes_fd.json'
		);
		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const json = await response.json();
		return json;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch Himawari satellite image times: ${error.message}`);
		} else {
			throw new Error('Unknown error occurred while fetching Himawari satellite image times');
		}
	}
};

export const getHimawariImageUrl = async (basetime: number) => {
	const url = `https://www.jma.go.jp/bosai/himawari/data/satimg/${basetime}/fd/${basetime}/B13/TBB/{z}/{x}/{y}.jpg`;
	return url;
};
