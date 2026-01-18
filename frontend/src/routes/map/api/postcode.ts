const BASE_URL = 'https://postcode.teraren.com';

export interface PostcodeInfo {
	jis: string;
	old: string;
	new: string;
	prefecture_kana: string;
	city_kana: string;
	suburb_kana: string;
	prefecture: string;
	city: string;
	suburb: string;
}

export type AddressPart = 1 | 2 | 3 | 4 | 5;

/**
 * 郵便番号から住所情報を取得
 * @param postcode - 郵便番号（7桁、ハイフンなし）
 * @returns 住所情報
 * @example
 * const info = await getPostcodeInfo('1600022');
 * // { prefecture: '東京都', city: '新宿区', suburb: '新宿', ... }
 */
export async function getPostcodeInfo(postcode: string): Promise<PostcodeInfo | null> {
	const normalized = postcode.replace(/-/g, '');
	const res = await fetch(`${BASE_URL}/postcodes/${normalized}.json`);
	if (!res.ok) return null;
	return res.json();
}

/**
 * 郵便番号から住所テキストを取得
 * @param postcode - 郵便番号（7桁、ハイフンなし）
 * @param part - 取得する部分（1:都道府県, 2:市町村区, 3:町域, 4:番地, 5:名称）
 * @returns 住所テキスト
 * @example
 * const address = await getPostcodeText('1600022');
 * // '東京都新宿区新宿'
 * const pref = await getPostcodeText('1600022', 1);
 * // '東京都'
 */
export async function getPostcodeText(
	postcode: string,
	part?: AddressPart
): Promise<string | null> {
	const normalized = postcode.replace(/-/g, '');
	const url = part
		? `${BASE_URL}/postcodes/${normalized}.txt?part=${part}`
		: `${BASE_URL}/postcodes/${normalized}.txt`;
	const res = await fetch(url);
	if (!res.ok) return null;
	return res.text();
}

/**
 * キーワードで郵便番号を検索
 * @param keyword - 検索キーワード（住所の一部）
 * @param options - オプション
 * @param options.per - 取得件数（デフォルト: 10）
 * @returns 検索結果の配列
 * @example
 * const results = await searchPostcode('新橋', { per: 5 });
 */
export async function searchPostcode(
	keyword: string,
	options: { per?: number } = {}
): Promise<PostcodeInfo[]> {
	const params = new URLSearchParams({ s: keyword });
	if (options.per) params.set('per', String(options.per));

	const res = await fetch(`${BASE_URL}/postcodes.json?${params}`);
	if (!res.ok) return [];
	return res.json();
}
