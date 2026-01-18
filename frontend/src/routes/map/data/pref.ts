import type { Region } from './types/location';

export const PREFECTURES = {
	'01': { kanji: '北海道', kana: 'ほっかいどう', en: 'hokkaido' },
	'02': { kanji: '青森県', kana: 'あおもりけん', en: 'aomori' },
	'03': { kanji: '岩手県', kana: 'いわてけん', en: 'iwate' },
	'04': { kanji: '宮城県', kana: 'みやぎけん', en: 'miyagi' },
	'05': { kanji: '秋田県', kana: 'あきたけん', en: 'akita' },
	'06': { kanji: '山形県', kana: 'やまがたけん', en: 'yamagata' },
	'07': { kanji: '福島県', kana: 'ふくしまけん', en: 'fukushima' },
	'08': { kanji: '茨城県', kana: 'いばらきけん', en: 'ibaraki' },
	'09': { kanji: '栃木県', kana: 'とちぎけん', en: 'tochigi' },
	'10': { kanji: '群馬県', kana: 'ぐんまけん', en: 'gunma' },
	'11': { kanji: '埼玉県', kana: 'さいたまけん', en: 'saitama' },
	'12': { kanji: '千葉県', kana: 'ちばけん', en: 'chiba' },
	'13': { kanji: '東京都', kana: 'とうきょうと', en: 'tokyo' },
	'14': { kanji: '神奈川県', kana: 'かながわけん', en: 'kanagawa' },
	'15': { kanji: '新潟県', kana: 'にいがたけん', en: 'niigata' },
	'16': { kanji: '富山県', kana: 'とやまけん', en: 'toyama' },
	'17': { kanji: '石川県', kana: 'いしかわけん', en: 'ishikawa' },
	'18': { kanji: '福井県', kana: 'ふくいけん', en: 'fukui' },
	'19': { kanji: '山梨県', kana: 'やまなしけん', en: 'yamanashi' },
	'20': { kanji: '長野県', kana: 'ながのけん', en: 'nagano' },
	'21': { kanji: '岐阜県', kana: 'ぎふけん', en: 'gifu' },
	'22': { kanji: '静岡県', kana: 'しずおかけん', en: 'shizuoka' },
	'23': { kanji: '愛知県', kana: 'あいちけん', en: 'aichi' },
	'24': { kanji: '三重県', kana: 'みえけん', en: 'mie' },
	'25': { kanji: '滋賀県', kana: 'しがけん', en: 'shiga' },
	'26': { kanji: '京都府', kana: 'きょうとふ', en: 'kyoto' },
	'27': { kanji: '大阪府', kana: 'おおさかふ', en: 'osaka' },
	'28': { kanji: '兵庫県', kana: 'ひょうごけん', en: 'hyogo' },
	'29': { kanji: '奈良県', kana: 'ならけん', en: 'nara' },
	'30': { kanji: '和歌山県', kana: 'わかやまけん', en: 'wakayama' },
	'31': { kanji: '鳥取県', kana: 'とっとりけん', en: 'tottori' },
	'32': { kanji: '島根県', kana: 'しまねけん', en: 'shimane' },
	'33': { kanji: '岡山県', kana: 'おかやまけん', en: 'okayama' },
	'34': { kanji: '広島県', kana: 'ひろしまけん', en: 'hiroshima' },
	'35': { kanji: '山口県', kana: 'やまぐちけん', en: 'yamaguchi' },
	'36': { kanji: '徳島県', kana: 'とくしまけん', en: 'tokushima' },
	'37': { kanji: '香川県', kana: 'かがわけん', en: 'kagawa' },
	'38': { kanji: '愛媛県', kana: 'えひめけん', en: 'ehime' },
	'39': { kanji: '高知県', kana: 'こうちけん', en: 'kochi' },
	'40': { kanji: '福岡県', kana: 'ふくおかけん', en: 'fukuoka' },
	'41': { kanji: '佐賀県', kana: 'さがけん', en: 'saga' },
	'42': { kanji: '長崎県', kana: 'ながさきけん', en: 'nagasaki' },
	'43': { kanji: '熊本県', kana: 'くまもとけん', en: 'kumamoto' },
	'44': { kanji: '大分県', kana: 'おおいたけん', en: 'oita' },
	'45': { kanji: '宮崎県', kana: 'みやざきけん', en: 'miyazaki' },
	'46': { kanji: '鹿児島県', kana: 'かごしまけん', en: 'kagoshima' },
	'47': { kanji: '沖縄県', kana: 'おきなわけん', en: 'okinawa' }
} as const;

export type PrefectureCode = keyof typeof PREFECTURES;
export type PrefectureInfo = (typeof PREFECTURES)[PrefectureCode];
export type PrefectureName = PrefectureInfo['kanji'];

// 派生辞書
export const PREF_CODE_DICT = Object.fromEntries(
	Object.entries(PREFECTURES).map(([code, info]) => [code, info.kanji])
) as Record<PrefectureCode, PrefectureName>;

const kanjiToCode = Object.fromEntries(
	Object.entries(PREFECTURES).map(([code, info]) => [info.kanji, code])
) as Record<PrefectureName, PrefectureCode>;

export const kanjiToen = Object.fromEntries(
	Object.values(PREFECTURES).map((info) => [info.kanji, info.en])
) as Record<PrefectureName, PrefectureInfo['en']>;

export const getPrefectureCode = (location: Region): PrefectureCode | undefined => {
	if (location && location in kanjiToCode) {
		return kanjiToCode[location as PrefectureName];
	}
	return undefined;
};
