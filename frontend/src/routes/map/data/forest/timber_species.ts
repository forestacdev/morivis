import { TIMBER_SPECIES_DATA_PATH } from '$routes/constants';

/**
 * CSV の行番号。
 *
 * 画像ファイル名のベース番号として使う。
 * `（コウヤマキ）` は CSV 側で番号が空欄のため含めていない。
 */
export const WOOD_IMAGE_ID_DICT = {
	ブナ: '1',
	トネリコ: '2',
	ウリハダカエデ: '3',
	ケヤキ: '4',
	イタヤカエデ: '5',
	ケンポナシ: '6',
	ソメイヨシノ: '7',
	シラカシ: '8', // 柾目
	ミズメ: '9',
	カラマツ: '10',
	イチイ: '11',
	ヤマハンノキ: '12',
	カツラ: '13',
	トチノキ: '14',
	クワ: '15',
	クリ: '16',
	イヌエンジュ: '17',
	シイ: '18',
	シウリザクラ: '19',
	ニセアカシア: '20',
	ミズナラ: '21',
	シラカシ2: '22', // 板目
	セン: '23',
	ヤマナシ: '24',
	ニレ: '25',
	ヤマザクラ: '26',
	ウダイカンバ: '27',
	センダン: '28',
	キハダ: '29',
	オニグルミ: '30',
	スギ: '31',
	シナノキ: '32',
	ヒノキ: '33',
	アカマツ: '34',
	ホオノキ: '35',
	イチョウ: '36',
	キリ: '37',
	オオウラジロノキ: '38',
	ヤナギ: '39',
	イヌマキ: '40',
	エノキ: '41',
	ツガ: '42',
	クスノキ: '44',
	ミズキ: '45',
	コウヨウザン: '46',
	ヤマグルマ: '47'
} as const;

export type WoodImageIdKey = keyof typeof WOOD_IMAGE_ID_DICT;
export type WoodImageId = (typeof WOOD_IMAGE_ID_DICT)[WoodImageIdKey];

export interface TimberSpeciesJawicReference {
	id: WoodImageId;
	name: string;
	url?: string;
	distribution?: string;
}

/**
 * JAWIC の木材ページ参照辞書。
 *
 * - キーは和名
 * - `id` は画像 ID
 * - `name` は参照した JAWIC 側の掲載名
 * - `distribution` は JAWIC 掲載文の分布情報を要約したもの
 *
 * 一部は JAWIC 側の掲載名に合わせて近い樹種群のページを参照している。
 */
export const TIMBER_SPECIES_JAWIC_REFERENCE_DICT: Partial<
	Record<WoodImageIdKey, TimberSpeciesJawicReference>
> = {
	ブナ: {
		id: '1',
		name: 'ブナ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=buna',
		distribution: ``
	},
	トネリコ: {
		id: '2',
		name: 'トネリコ',
		distribution: ``
	},
	ウリハダカエデ: {
		id: '3',
		name: 'ウリハダカエデ',
		distribution: ``
	},
	ケヤキ: {
		id: '4',
		name: 'ケヤキ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=keyaki',
		distribution: ``
	},
	イタヤカエデ: {
		id: '5',
		name: 'イタヤカエデ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=itayakaede',
		distribution: ``
	},
	ケンポナシ: {
		id: '6',
		name: 'ケンポナシ',
		distribution: ``
	},
	ソメイヨシノ: {
		id: '7',
		name: 'ソメイヨシノ',
		distribution: ``
	},
	シラカシ: {
		id: '8',
		name: 'シラカシ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sirakasi',
		distribution: ``
	},
	ミズメ: {
		id: '9',
		name: 'ミズメ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=mizume',
		distribution: ``
	},
	カラマツ: {
		id: '10',
		name: 'カラマツ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=karamatsu',
		distribution: ``
	},
	イチイ: {
		id: '11',
		name: 'イチイ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=ichii',
		distribution: ``
	},
	ヤマハンノキ: {
		id: '12',
		name: 'ヤマハンノキ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=hannoki',
		distribution: ``
	},
	カツラ: {
		id: '13',
		name: 'カツラ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=katsura',
		distribution: ``
	},
	クワ: {
		id: '15',
		name: 'クワ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=yamaguwa',
		distribution: ``
	},
	トチノキ: {
		id: '14',
		name: 'トチノキ',
		distribution: ``
	},
	クリ: {
		id: '16',
		name: 'クリ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kuri',
		distribution: ``
	},
	イヌエンジュ: {
		id: '17',
		name: 'イヌエンジュ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=inuenju',
		distribution: ``
	},
	シイ: {
		id: '18',
		name: 'シイノキとコジイ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kojii',
		distribution: ``
	},
	シウリザクラ: {
		id: '19',
		name: 'シウリザクラ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sakura',
		distribution: ``
	},
	ニセアカシア: {
		id: '20',
		name: 'ニセアカシア',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=niseakasia',
		distribution: ``
	},
	ミズナラ: {
		id: '21',
		name: 'ミズナラ、楢',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=mizunara',
		distribution: ``
	},
	シラカシ2: {
		id: '22',
		name: 'シラカシ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sirakasi',
		distribution: ``
	},
	セン: {
		id: '23',
		name: 'セン、ハリギリ、栓',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=harihagi',
		distribution: ``
	},
	ヤマナシ: {
		id: '24',
		name: 'ヤマナシ',
		distribution: ``
	},
	ニレ: {
		id: '25',
		name: 'ニレ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=harunire',
		distribution: ``
	},
	ヤマザクラ: {
		id: '26',
		name: 'ヤマザクラ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sakura',
		distribution: ``
	},
	ウダイカンバ: {
		id: '27',
		name: 'ウダイカンバ',
		distribution: ``
	},
	センダン: {
		id: '28',
		name: 'センダン'
	},
	キハダ: {
		id: '29',
		name: 'キハダ、ヒロハノキハダ、シコロ 黄蘖',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kihada',
		distribution: ''
	},
	オニグルミ: {
		id: '30',
		name: 'オニグルミ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=onigurumi',
		distribution: ''
	},
	スギ: {
		id: '31',
		name: 'スギ 杉、椙',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sugi',
		distribution: ''
	},
	シナノキ: {
		id: '32',
		name: 'シナノキ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sinanoki',
		distribution: ''
	},
	ヒノキ: {
		id: '33',
		name: 'ヒノキ、桧、扁柏',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=hinoki',
		distribution: ''
	},
	アカマツ: {
		id: '34',
		name: 'アカマツ'
	},
	ホオノキ: {
		id: '35',
		name: 'ホオノキ、朴',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=hoonoki',
		distribution: ''
	},
	イチョウ: {
		id: '36',
		name: 'イチョウ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=icyou',
		distribution: ''
	},
	キリ: {
		id: '37',
		name: 'キリ 桐',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kiri',
		distribution: ''
	},
	オオウラジロノキ: {
		id: '38',
		name: 'オオウラジロノキ'
	},
	ヤナギ: {
		id: '39',
		name: 'ヤナギ類',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=yanagi',
		distribution: ''
	},
	イヌマキ: {
		id: '40',
		name: 'イヌマキ、クサマキ、槙',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=inumaki',
		distribution: ''
	},
	エノキ: {
		id: '41',
		name: 'エノキ'
	},
	ツガ: {
		id: '42',
		name: 'ツガ、トガ、栂',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=tsuga',
		distribution: ''
	},
	クスノキ: {
		id: '44',
		name: 'クスノキ、樟',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kusunoki',
		distribution: ''
	},
	ミズキ: {
		id: '45',
		name: 'ミズキ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=mizuki',
		distribution: ''
	},
	コウヨウザン: {
		id: '46',
		name: 'コウヨウザン'
	},
	ヤマグルマ: {
		id: '47',
		name: 'ヤマグルマ'
	}
} as const;

// 和名から木材画像のURLを取得する関数
export const getTimberSpeciesImageUrl = (name: string): string => {
	const timberSpecies = TIMBER_SPECIES_JAWIC_REFERENCE_DICT[name as WoodImageIdKey];
	if (!timberSpecies) {
		throw new Error(`Unknown timber species: ${name}`);
	}
	return `${TIMBER_SPECIES_DATA_PATH}/face_grain/thumb/${timberSpecies.id}.webp`;
};

export const getTimberSpeciesData = (
	name: string
): { url: string; distribution?: string } | null => {
	const timberSpecies = TIMBER_SPECIES_JAWIC_REFERENCE_DICT[name as WoodImageIdKey];
	if (!timberSpecies) {
		return null;
	}

	return {
		url: `${TIMBER_SPECIES_DATA_PATH}/face_grain/thumb/${timberSpecies.id}.webp`,
		distribution: timberSpecies.distribution
	};
};
