interface GBIFSpecies {
	key: number;
	scientificName: string;
	canonicalName: string;
	vernacularName?: string; // 和名
	kingdom: string;
	phylum: string;
	class: string;
	order: string;
	family: string;
	genus: string;
}

const searchGBIF = async (name: string): Promise<GBIFSpecies[]> => {
	const params = new URLSearchParams({
		q: name,
		limit: '10',
		language: 'ja' // 日本語名も検索
	});

	const response = await fetch(`https://api.gbif.org/v1/species/search?${params}`);

	const data = await response.json();
	return data.results || [];
};

// 詳細情報を取得
const getGBIFDetails = async (key: number) => {
	const response = await fetch(`https://api.gbif.org/v1/species/${key}`);
	const data = await response.json();

	// 和名を取得
	const vernacularResponse = await fetch(`https://api.gbif.org/v1/species/${key}/vernacularNames`);
	const vernacularData = await vernacularResponse.json();

	// 画像を取得
	const mediaResponse = await fetch(`https://api.gbif.org/v1/species/${key}/media`);
	const mediaData = await mediaResponse.json();

	return {
		...data,
		vernacularNames: vernacularData.results,
		images: mediaData.results
	};
};

// 使用例
const get = async () => {
	const results = await searchGBIF('シジュウカラ');
	console.log(results);
	if (results.length > 0) {
		const details = await getGBIFDetails(results[0].key);
		// console.log('学名:', details.scientificName);
		// console.log('和名:', details.vernacularNames);
		// console.log('画像:', details.images);
	}
};

get();
