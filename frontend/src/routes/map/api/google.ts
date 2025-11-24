/** google検索のサジェストを取得する関数 */
export const getGoogleAutocomplete = async (query: string): Promise<string[]> => {
	const params = new URLSearchParams({
		client: 'chrome', // または 'chrome'
		q: query,
		hl: 'ja'
	});

	try {
		const endpoint = import.meta.env.DEV
			? '/api/google-suggest'
			: 'https://suggestqueries.google.com/complete/search';

		const response = await fetch(`${endpoint}?${params}`);
		const data = await response.json();

		return data[1] || [];
	} catch (error) {
		console.error('Google Autocomplete error:', error);
		return [];
	}
};
