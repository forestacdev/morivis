import { locationBboxData } from './location_bbox';
import type { Region } from './types/location';
export const prefCodeDict = {
	'01': '北海道',
	'02': '青森県',
	'03': '岩手県',
	'04': '宮城県',
	'05': '秋田県',
	'06': '山形県',
	'07': '福島県',
	'08': '茨城県',
	'09': '栃木県',
	'10': '群馬県',
	'11': '埼玉県',
	'12': '千葉県',
	'13': '東京都',
	'14': '神奈川県',
	'15': '新潟県',
	'16': '富山県',
	'17': '石川県',
	'18': '福井県',
	'19': '山梨県',
	'20': '長野県',
	'21': '岐阜県',
	'22': '静岡県',
	'23': '愛知県',
	'24': '三重県',
	'25': '滋賀県',
	'26': '京都府',
	'27': '大阪府',
	'28': '兵庫県',
	'29': '奈良県',
	'30': '和歌山県',
	'31': '鳥取県',
	'32': '島根県',
	'33': '岡山県',
	'34': '広島県',
	'35': '山口県',
	'36': '徳島県',
	'37': '香川県',
	'38': '愛媛県',
	'39': '高知県',
	'40': '福岡県',
	'41': '佐賀県',
	'42': '長崎県',
	'43': '熊本県',
	'44': '大分県',
	'45': '宮崎県',
	'46': '鹿児島県',
	'47': '沖縄県'
} as const;

const prefCodeReversedDict = Object.fromEntries(
	Object.entries(prefCodeDict).map(([key, value]) => [value, key])
) as Record<PrefectureCode, keyof typeof prefCodeDict>;

export type PrefectureCode = keyof typeof prefCodeDict;

const prefCodes = Object.keys(prefCodeDict) as PrefectureCode[];

/**
 * Get the prefecture code by its name.
 * @param name - The name of the prefecture.
 * @returns The code of the prefecture.
 * @throws Will throw an error if the prefecture name is not valid.
 */
export const getPrefectureCode = (location: Region): PrefectureCode | undefined => {
	if (location) {
		return prefCodeReversedDict[location];
	} else {
		return undefined;
	}
};

export const name = {
	北海道: 'hokkaido',
	青森県: 'aomori',
	岩手県: 'iwate',
	宮城県: 'miyagi',
	秋田県: 'akita',
	山形県: 'yamagata',
	福島県: 'fukushima',
	茨城県: 'ibaraki',
	栃木県: 'tochigi',
	群馬県: 'gunma',
	埼玉県: 'saitama',
	千葉県: 'chiba',
	東京都: 'tokyo',
	神奈川県: 'kanagawa',
	新潟県: 'niigata',
	富山県: 'toyama',
	石川県: 'ishikawa',
	福井県: 'fukui',
	山梨県: 'yamanashi',
	長野県: 'nagano',
	岐阜県: 'gifu',
	静岡県: 'shizuoka',
	愛知県: 'aichi',
	三重県: 'mie',
	滋賀県: 'shiga',
	京都府: 'kyoto',
	大阪府: 'osaka',
	兵庫県: 'hyogo',
	奈良県: 'nara',
	和歌山県: 'wakayama',
	鳥取県: 'tottori',
	島根県: 'shimane',
	岡山県: 'okayama',
	広島県: 'hiroshima',
	山口県: 'yamaguchi',
	徳島県: 'tokushima',
	香川県: 'kagawa',
	愛媛県: 'ehime',
	高知県: 'kochi',
	福岡県: 'fukuoka',
	佐賀県: 'saga',
	長崎県: 'nagasaki',
	熊本県: 'kumamoto',
	大分県: 'oita',
	宮崎県: 'miyazaki',
	鹿児島県: 'kagoshima',
	沖縄県: 'okinawa'
};
