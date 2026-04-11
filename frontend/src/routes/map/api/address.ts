import { GSI } from './muni';
import { gsiLonLatToAddress } from './gsi';

// 国土地理院APIの変換表を使って住所コードを住所に変換
export const addressCodeToAddress = (addressCode: string) => {
	const csvString = GSI.MUNI_ARRAY[addressCode as keyof typeof GSI.MUNI_ARRAY];
	if (!csvString) return '';
	const parts = csvString.split(',');
	return `${parts[1]}${parts[3]}`;
};

// 国土地理院APIの変換表を使って住所コードを都道府県名に変換
export const addressCodeToPrefecture = (addressCode: string) => {
	const csvString = GSI.MUNI_ARRAY[addressCode as keyof typeof GSI.MUNI_ARRAY];
	if (!csvString) return '';
	const parts = csvString.split(',');
	return parts[1] ?? '';
};

/**
 * 国土地理院APIを利用して、指定した緯度経度から住所情報を取得する関数
 * @param lng 経度
 * @param lat 緯度
 * @returns 住所情報
 */
export const lonLatToAddress = async (lng: number, lat: number): Promise<string> => {
	try {
		const data = await gsiLonLatToAddress(lng, lat);
		const address = addressCodeToAddress(data.results.muniCd);
		return `${address}${data.results.lv01Nm === '−' ? '' : data.results.lv01Nm}`;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		} else {
			throw new Error('Unknown error occurred');
		}
	}
};

/**
 * 指定した緯度経度から都道府県名のみを取得する関数
 * @param lng 経度
 * @param lat 緯度
 * @returns 都道府県名
 */
export const lonLatToPrefecture = async (lng: number, lat: number): Promise<string> => {
	try {
		const data = await gsiLonLatToAddress(lng, lat);
		return addressCodeToPrefecture(data.results.muniCd);
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

/** 都道府県リスト（短縮名・ひらがな → 正式名） */
const PREFECTURES: Record<string, string> = {
	北海道: '北海道',
	ほっかいどう: '北海道',
	青森: '青森県',
	あおもり: '青森県',
	岩手: '岩手県',
	いわて: '岩手県',
	宮城: '宮城県',
	みやぎ: '宮城県',
	秋田: '秋田県',
	あきた: '秋田県',
	山形: '山形県',
	やまがた: '山形県',
	福島: '福島県',
	ふくしま: '福島県',
	茨城: '茨城県',
	いばらき: '茨城県',
	栃木: '栃木県',
	とちぎ: '栃木県',
	群馬: '群馬県',
	ぐんま: '群馬県',
	埼玉: '埼玉県',
	さいたま: '埼玉県',
	千葉: '千葉県',
	ちば: '千葉県',
	東京: '東京都',
	とうきょう: '東京都',
	神奈川: '神奈川県',
	かながわ: '神奈川県',
	新潟: '新潟県',
	にいがた: '新潟県',
	富山: '富山県',
	とやま: '富山県',
	石川: '石川県',
	いしかわ: '石川県',
	福井: '福井県',
	ふくい: '福井県',
	山梨: '山梨県',
	やまなし: '山梨県',
	長野: '長野県',
	ながの: '長野県',
	岐阜: '岐阜県',
	ぎふ: '岐阜県',
	静岡: '静岡県',
	しずおか: '静岡県',
	愛知: '愛知県',
	あいち: '愛知県',
	三重: '三重県',
	みえ: '三重県',
	滋賀: '滋賀県',
	しが: '滋賀県',
	京都: '京都府',
	きょうと: '京都府',
	大阪: '大阪府',
	おおさか: '大阪府',
	兵庫: '兵庫県',
	ひょうご: '兵庫県',
	奈良: '奈良県',
	なら: '奈良県',
	和歌山: '和歌山県',
	わかやま: '和歌山県',
	鳥取: '鳥取県',
	とっとり: '鳥取県',
	島根: '島根県',
	しまね: '島根県',
	岡山: '岡山県',
	おかやま: '岡山県',
	広島: '広島県',
	ひろしま: '広島県',
	山口: '山口県',
	やまぐち: '山口県',
	徳島: '徳島県',
	とくしま: '徳島県',
	香川: '香川県',
	かがわ: '香川県',
	愛媛: '愛媛県',
	えひめ: '愛媛県',
	高知: '高知県',
	こうち: '高知県',
	福岡: '福岡県',
	ふくおか: '福岡県',
	佐賀: '佐賀県',
	さが: '佐賀県',
	長崎: '長崎県',
	ながさき: '長崎県',
	熊本: '熊本県',
	くまもと: '熊本県',
	大分: '大分県',
	おおいた: '大分県',
	宮崎: '宮崎県',
	みやざき: '宮崎県',
	鹿児島: '鹿児島県',
	かごしま: '鹿児島県',
	沖縄: '沖縄県',
	おきなわ: '沖縄県'
};

/**
 * 検索ワードが都道府県名に一致するか判定し、正式名を返す
 */
export const matchPrefecture = (word: string): string | null => {
	// 正式名で完全一致（「愛知県」「東京都」等）
	for (const full of Object.values(PREFECTURES)) {
		if (word === full) return full;
	}
	// 短縮名で完全一致（「愛知」「東京」等）
	return PREFECTURES[word] ?? null;
};

/** 国土地理院APIの住所検索 */
export const addressSearch = async (
	searchWord: string
): Promise<GsiAddressSearchData[] | undefined> => {
	// 都道府県名マッチ: 正式名で検索し、その都道府県内の結果のみ返す
	const prefName = matchPrefecture(searchWord);
	const query = prefName ?? searchWord;

	const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${query}`;
	try {
		const response = await fetch(url, {
			method: 'GET'
		});

		if (!response.ok) return undefined;

		const results: GsiAddressSearchData[] = await response.json();

		// 都道府県名で検索した場合、その都道府県に属する結果のみ返す
		if (prefName) {
			return results.filter((r) => r.properties.title.startsWith(prefName));
		}

		return results;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(error.message);
		} else {
			throw new Error('Unknown error occurred');
		}
	}
};
