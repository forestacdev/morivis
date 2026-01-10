import municipality_dict from './municipality_dict.json';

export type CityCode = keyof typeof municipality_dict;

/**
 * 団体コードに対応する自治体情報
 */
export interface MunicipalityInfo {
	/** 都道府県名（漢字） */
	prefecture: string;
	/** 市区町村名（漢字） */
	city: string;
	/** 都道府県名（カナ） */
	prefecture_kana: string;
	/** 市区町村名（カナ） */
	city_kana: string;
	/** 完全名（都道府県+市区町村） */
	full_name: string;
	/** 完全名（カナ） */
	full_name_kana: string;
}

/**
 * 団体コード辞書の型
 */
export type MunicipalityDict = Record<string, MunicipalityInfo>;

/**
 * 団体コード辞書（型安全）
 */
export const municipalityDict = municipality_dict as MunicipalityDict;

/**
 * 5桁コードから6桁コードを検索するためのキャッシュ
 */
let fiveDigitCache: Record<string, string> | null = null;

/**
 * 5桁コードから6桁コードへのマッピングを初期化
 */
const initFiveDigitCache = () => {
	if (!fiveDigitCache) {
		fiveDigitCache = {};
		for (const code of Object.keys(municipalityDict)) {
			const fiveDigit = code.slice(0, 5);
			// 同じ5桁コードが複数ある場合は最初のものを使用
			if (!fiveDigitCache[fiveDigit]) {
				fiveDigitCache[fiveDigit] = code;
			}
		}
	}
	return fiveDigitCache;
};

/**
 * 団体コードから自治体情報を取得
 * @param code 団体コード（5桁または6桁）
 * @returns 自治体情報、存在しない場合はundefined
 */
export const getMunicipalityInfo = (code: string): MunicipalityInfo | undefined => {
	// 6桁の場合は直接検索
	if (code.length === 6) {
		return municipalityDict[code];
	}

	// 5桁の場合は6桁コードに変換して検索
	if (code.length === 5) {
		const cache = initFiveDigitCache();
		const sixDigitCode = cache[code];
		return sixDigitCode ? municipalityDict[sixDigitCode] : undefined;
	}

	return undefined;
};

/**
 * 完全名（都道府県+市区町村）を取得
 * @param code 団体コード（5桁または6桁）
 * @returns 完全名、存在しない場合はundefined
 */
export const getFullName = (code: string | number): string | undefined => {
	const info = getMunicipalityInfo(String(code));
	return info ? info.full_name : undefined;
};

/**
 * 団体コードが有効かチェック
 * @param code 団体コード（5桁または6桁）
 */
export const isValidCityCode = (code: string): boolean => {
	if (code.length === 6) {
		return code in municipalityDict;
	}
	if (code.length === 5) {
		const cache = initFiveDigitCache();
		return code in cache;
	}
	return false;
};
