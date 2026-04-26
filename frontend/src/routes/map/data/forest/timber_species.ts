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
		distribution: '北海道南部から本州、四国、九州に分布する。'
	},
	トネリコ: {
		id: '2',
		name: 'ヤチダモ、タモ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=yachidamo',
		distribution: '北海道と本州北・中部を中心に、朝鮮、中国、樺太、シベリアにも分布する。'
	},
	ウリハダカエデ: {
		id: '3',
		name: 'ウリハダカエデ'
	},
	ケヤキ: {
		id: '4',
		name: 'ケヤキ、欅',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=keyaki',
		distribution: '本州、四国、九州に分布し、朝鮮や中国にもみられる。'
	},
	イタヤカエデ: {
		id: '5',
		name: 'イタヤカエデ、イタヤ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=itayakaede',
		distribution:
			'北海道、本州、四国、九州に加え、サハリン、千島、朝鮮、中国東北部から北部にも分布する。'
	},
	ケンポナシ: {
		id: '6',
		name: 'ケンポナシ'
	},
	ソメイヨシノ: {
		id: '7',
		name: 'ソメイヨシノ'
	},
	シラカシ: {
		id: '8',
		name: 'シラカシ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sirakasi',
		distribution:
			'福島県・新潟県以南の本州、四国、九州に分布し、済州島や中国大陸中南部にもみられる。'
	},
	ミズメ: {
		id: '9',
		name: 'ミズメ、ヨグソミネバリ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=mizume',
		distribution: '岩手県以南の本州、四国、九州に分布する。'
	},
	カラマツ: {
		id: '10',
		name: 'カラマツ、落葉松',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=karamatsu',
		distribution:
			'本州中部の標高1000〜2000m帯に分布し、近年は北海道や東北の寒冷地にも広く造林されている。'
	},
	イチイ: {
		id: '11',
		name: 'イチイ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=ichii',
		distribution:
			'サハリン、千島、北海道、本州、四国、九州のほか、朝鮮、中国東北部、シベリア東部にも分布する。'
	},
	ヤマハンノキ: {
		id: '12',
		name: 'ハンノキ、赤楊',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=hannoki',
		distribution:
			'北海道、本州、四国、九州に分布し、朝鮮や中国東北部にもみられる。JAWIC本文ではヤマハンノキ類も含めて扱っている。'
	},
	カツラ: {
		id: '13',
		name: 'カツラ、桂',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=katsura',
		distribution: '北海道、本州、四国、九州に分布し、蓄積は北海道に多い。'
	},
	クワ: {
		id: '15',
		name: 'ヤマグワ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=yamaguwa',
		distribution: '北海道から本州、四国、九州、沖縄にかけて分布し、伊豆諸島にもみられる。'
	},
	トチノキ: {
		id: '14',
		name: 'トチノキ、栃'
        },
	クリ: {
		id: '16',
		name: 'クリ、栗',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kuri',
		distribution: '北海道南部から本州、四国、九州に分布する。'
	},
	イヌエンジュ: {
		id: '17',
		name: 'イヌエンジュ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=inuenju',
		distribution:
			'北海道、本州、四国に生育し、九州では少なく、千島、朝鮮半島、台湾、中国にも分布する。'
	},
	シイ: {
		id: '18',
		name: 'シイノキとコジイ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kojii',
		distribution:
			'JAWICではシイノキとコジイを併せて扱う。本州西部、四国、九州、沖縄を中心に分布する。'
	},
	シウリザクラ: {
		id: '19',
		name: 'ヤマザクラを含むサクラ類',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sakura',
		distribution:
			'JAWICではサクラ類として扱う。シウリザクラは本州中部以北、北海道、南千島、サハリン、中国東北部、シベリアに分布する。'
	},
	ニセアカシア: {
		id: '20',
		name: 'ニセアカシア、ブラックローカスト',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=niseakasia',
		distribution: '北米原産で、日本には明治期に導入され、その後は各地で植栽・野生化している。'
	},
	ミズナラ: {
		id: '21',
		name: 'ミズナラ、楢',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=mizunara',
		distribution:
			'北海道、本州、四国、九州に分布し、サハリン、南千島、朝鮮にもみられる。代表的な産地は北海道。'
	},
	シラカシ2: {
		id: '22',
		name: 'シラカシ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sirakasi',
		distribution:
			'福島県・新潟県以南の本州、四国、九州に分布し、済州島や中国大陸中南部にもみられる。'
	},
	セン: {
		id: '23',
		name: 'セン、ハリギリ、栓',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=harihagi',
		distribution: '北海道、本州、四国、九州、沖縄のほか、朝鮮、中国、ロシアにも分布する。'
	},
	ヤマナシ: {
		id: '24',
		name: 'ヤマナシ'
	},
	ニレ: {
		id: '25',
		name: 'ハルニレ、アカダモ、楡',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=harunire',
		distribution: '北海道、本州、四国、九州に加え、サハリン、朝鮮、中国にも分布する。'
	},
	ヤマザクラ: {
		id: '26',
		name: 'ヤマザクラを含むサクラ類',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sakura',
		distribution: 'JAWICではサクラ類として扱う。ヤマザクラは本州、四国、九州、朝鮮に分布する。'
	},
	ウダイカンバ: {
		id: '27',
		name: 'ウダイカンバ'
	},
	センダン: {
		id: '28',
		name: 'センダン'
	},
	キハダ: {
		id: '29',
		name: 'キハダ、ヒロハノキハダ、シコロ 黄蘖',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kihada',
		distribution: '北海道、本州、四国、九州に分布し、サハリン、朝鮮、中国にもみられる。'
	},
	オニグルミ: {
		id: '30',
		name: 'オニグルミ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=onigurumi',
		distribution: '北海道、本州、四国、九州に分布し、東北地方や北海道が産地としてよく知られる。'
	},
	スギ: {
		id: '31',
		name: 'スギ 杉、椙',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sugi',
		distribution: '本州、四国、九州に分布し、造林により北海道南部以南の各地でも広くみられる。'
	},
	シナノキ: {
		id: '32',
		name: 'シナノキ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=sinanoki',
		distribution: '北海道、本州、四国、九州に分布し、中国大陸にもみられる。北海道が主要産地。'
	},
	ヒノキ: {
		id: '33',
		name: 'ヒノキ、桧、扁柏',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=hinoki',
		distribution: '福島県東南部以南の本州、四国、九州に分布する。'
	},
	アカマツ: {
		id: '34',
		name: 'アカマツ'
	},
	ホオノキ: {
		id: '35',
		name: 'ホオノキ、朴',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=hoonoki',
		distribution: '北海道、本州、四国、九州、沖縄に分布し、朝鮮や中国中部にもみられる。'
	},
	イチョウ: {
		id: '36',
		name: 'イチョウ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=icyou',
		distribution: '中国原産で、日本では古くから街路樹や庭園樹として広く植栽されている。'
	},
	キリ: {
		id: '37',
		name: 'キリ 桐',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kiri',
		distribution:
			'日本では野生ではなく、北海道南部以南で植栽される。近年は中国、台湾、米国、ブラジルなどの植栽材も多い。'
	},
	オオウラジロノキ: {
		id: '38',
		name: 'オオウラジロノキ'
	},
	ヤナギ: {
		id: '39',
		name: 'ヤナギ類',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=yanagi',
		distribution: '日本各地の河川流域や低湿地にみられるヤナギ類をまとめて扱っている。'
	},
	イヌマキ: {
		id: '40',
		name: 'イヌマキ、クサマキ、槙',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=inumaki',
		distribution: '本州、四国、九州、沖縄に分布し、台湾や中国南部にもみられる。'
	},
	エノキ: {
		id: '41',
		name: 'エノキ'
	},
	ツガ: {
		id: '42',
		name: 'ツガ、トガ、栂',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=tsuga',
		distribution: '関東以南の本州、四国、九州、屋久島に分布する。'
	},
	クスノキ: {
		id: '44',
		name: 'クスノキ、樟',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=kusunoki',
		distribution: '本州中南部、四国、九州に分布し、台湾や中国にもみられる。'
	},
	ミズキ: {
		id: '45',
		name: 'ミズキ',
		url: 'https://www.jawic.or.jp/woods/sch.php?nam0=mizuki',
		distribution: '北海道、本州、四国、九州に分布し、低い山地では比較的普通に見られる。'
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
