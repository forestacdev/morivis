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
