export const REGIONS = {
	hokkaido: { kanji: '北海道', kana: 'ほっかいどう' },
	tohoku: { kanji: '東北', kana: 'とうほく' },
	kanto: { kanji: '関東', kana: 'かんとう' },
	chubu: { kanji: '中部', kana: 'ちゅうぶ' },
	kinki: { kanji: '近畿', kana: 'きんき' },
	chugoku: { kanji: '中国', kana: 'ちゅうごく' },
	shikoku: { kanji: '四国', kana: 'しこく' },
	kyushu: { kanji: '九州', kana: 'きゅうしゅう' }
} as const;

export type RegionCode = keyof typeof REGIONS;
export type RegionInfo = (typeof REGIONS)[RegionCode];
export type RegionName = RegionInfo['kanji'];

// 都道府県コード → 地方コードのマッピング
export const PREF_TO_REGION: Record<string, RegionCode> = {
	'01': 'hokkaido',
	'02': 'tohoku',
	'03': 'tohoku',
	'04': 'tohoku',
	'05': 'tohoku',
	'06': 'tohoku',
	'07': 'tohoku',
	'08': 'kanto',
	'09': 'kanto',
	'10': 'kanto',
	'11': 'kanto',
	'12': 'kanto',
	'13': 'kanto',
	'14': 'kanto',
	'15': 'chubu',
	'16': 'chubu',
	'17': 'chubu',
	'18': 'chubu',
	'19': 'chubu',
	'20': 'chubu',
	'21': 'chubu',
	'22': 'chubu',
	'23': 'chubu',
	'24': 'kinki',
	'25': 'kinki',
	'26': 'kinki',
	'27': 'kinki',
	'28': 'kinki',
	'29': 'kinki',
	'30': 'kinki',
	'31': 'chugoku',
	'32': 'chugoku',
	'33': 'chugoku',
	'34': 'chugoku',
	'35': 'chugoku',
	'36': 'shikoku',
	'37': 'shikoku',
	'38': 'shikoku',
	'39': 'shikoku',
	'40': 'kyushu',
	'41': 'kyushu',
	'42': 'kyushu',
	'43': 'kyushu',
	'44': 'kyushu',
	'45': 'kyushu',
	'46': 'kyushu',
	'47': 'kyushu'
};

// 地方コード → 都道府県コードの配列
export const REGION_TO_PREFS = Object.entries(PREF_TO_REGION).reduce(
	(acc, [prefCode, regionCode]) => {
		if (!acc[regionCode]) {
			acc[regionCode] = [];
		}
		acc[regionCode].push(prefCode);
		return acc;
	},
	{} as Record<RegionCode, string[]>
);
