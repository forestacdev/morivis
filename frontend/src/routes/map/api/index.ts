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
