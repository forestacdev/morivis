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
