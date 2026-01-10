import type { FeatureProp } from '$routes/map/types/properties';

/**
 * 属性表示のタイトル表示テンプレート
 */
export interface Title {
	/**
	 * 表示条件の属性キー配列。
	 * すべてのキーが存在する場合にこのタイトルテンプレートを使用する。
	 */
	conditions: string[];

	/** 表示テンプレート文字列。
	 * 例: '{name} ({year}年)'
	 */
	template: string;
}

export interface Relations {
	/** 市町村コード連携用の属性キー */
	cityCodeKey?: string;
	/** iNaturalist 連携用の和名の属性キー。 */
	iNaturalistNameKey?: string;
}

/**
 * UI表示用の属性設定
 */
export interface AttributeView {
	/**
	 * ポップアップに表示する属性キーの配列。順番もここで管理。
	 */
	popupKeys: string[];

	/**
	 * タイトル表示のテンプレート配列。条件付きで表示を切り替える。
	 */
	titles: Title[];

	/**
	 * 日付情報の属性キー
	 */
	dateKey?: string;

	/**
	 * 画像表示用の属性キー 時間軸データなどで使用
	 */
	imageKey?: string;

	relations?: Relations;
}

/**
 * 無効値（欠損値・非有効値）として扱う条件と表示文字列
 */
export interface EmptyValueRule {
	/**
	 * 無効値として扱う実データ値
	 * 例: null, undefined, '', '---', '不明', -9999
	 */
	values: Array<string | number | null | undefined>;

	/**
	 * 表示時に使用する文字列
	 * 例: '-', '不明', '—'
	 */
	text: string;
}

/** 追加: 属性(フィールド)の意味を1箇所に集約 */
type FieldType = 'string' | 'number' | 'integer' | 'date';

/**
 * フィーチャの属性（フィールド）定義。
 *
 * データの「意味」を1か所に集約するための定義で、
 * ポップアップ、テーブル表示、地図ラベル（MapLibre）など
 * すべてのUIで共通して参照される。
 *
 * - 表示名（label）
 * - 単位（unit）
 * - 数値の丸め（format.digits）
 * - 無効値・欠損値の表現（format.empty）
 * - コード値→表示名変換（dict）
 *
 * UI 固有の情報（並び順・表示ON/OFF・フォント等）は
 * ここには含めず、表示側の設定で制御する。
 */
export interface FieldDef {
	/**
	 * 元データの属性キー（GeoJSON / MVT の properties のキー）
	 */
	key: string;

	/**
	 * 人間向けの表示名。
	 * 未指定の場合は key をそのまま表示名として使用する。
	 */
	label?: string;

	/**
	 * 属性値の型。
	 * 表示時のフォーマットや MapLibre expression 生成に利用される。
	 */
	type?: FieldType;

	/**
	 * 表示時に付与する単位（例: 'ha', 'm', '年'）。
	 * ポップアップ、テーブル、地図ラベルで共通して使用される。
	 */
	unit?: string;

	/**
	 * 表示名の整形用（単位ではない）
	 * 例: '第' + value + '林班'
	 *     value + '林'
	 */
	affix?: {
		prefix?: string;
		suffix?: string;
	};

	/**
	 * 表示用フォーマット設定。
	 */
	format?: {
		/**
		 * 数値の小数点以下桁数。
		 * 例: digits=2 → 12.345 → 12.35
		 */
		digits?: number;

		/**
		 * 無効値・欠損値として扱う値の定義と表示文字列。
		 */
		empty?: EmptyValueRule[];
	};

	/**
	 * コード値などをを人間向け表示名に変換する辞書。
	 * 例: { 1: '航空レーザ', 2: '航空写真' }
	 */
	valueDict?: Record<number | string, number | string>;
}

export interface VectorProperties {
	fields: FieldDef[];
	attributeView: AttributeView;
	/**
	 * 属性を結合するための外部データのURL(JSON)。 TODO: 将来的に汎用化
	 */
	joinDataUrl?: string;
}

/**
 * FieldDefに基づいて属性値をフォーマットする。
 *
 * 処理順序:
 * 1. 無効値チェック（format.empty）
 * 2. 辞書変換（valueDict）
 * 3. 数値フォーマット（format.digits）
 * 4. affix適用（prefix/suffix）
 * 5. 単位付与（unit）
 */
export const formatFieldValue = (rawValue: unknown, field: FieldDef): string => {
	// 1. 無効値ルール
	for (const rule of field.format?.empty ?? []) {
		if (rule.values.includes(rawValue as string | number | null | undefined)) {
			return rule.text;
		}
	}

	// null/undefinedの早期リターン
	if (rawValue == null) {
		return '';
	}

	let formatted: string;

	// 2. 辞書変換
	if (field.valueDict) {
		const mapped = field.valueDict[rawValue as string | number];
		if (mapped != null) {
			formatted = String(mapped);
		} else {
			formatted = String(rawValue);
		}
	} else if (typeof rawValue === 'number') {
		// 3. 数値フォーマット
		if (field.format?.digits != null) {
			formatted = rawValue.toFixed(field.format.digits);
		} else {
			formatted = String(rawValue);
		}
	} else {
		formatted = String(rawValue);
	}

	// 4. affix適用
	if (field.affix) {
		const prefix = field.affix.prefix ?? '';
		const suffix = field.affix.suffix ?? '';
		formatted = `${prefix}${formatted}${suffix}`;
	}

	// 5. 単位付与
	if (field.unit) {
		formatted = `${formatted} ${field.unit}`;
	}

	return formatted;
};

/**
 * 属性キーを表示ラベルに変換する。
 * FieldDefにlabelが定義されていればそれを返し、なければkeyをそのまま返す。
 */
export const getFieldLabel = (key: string, fields: FieldDef[]): string => {
	const field = fields.find((f) => f.key === key);
	return field?.label ?? key;
};

/**
 * FeaturePropからpopupKeysに含まれる属性のみを抽出する。
 * popupKeysの順序を維持する。
 */
export const filterByPopupKeys = (props: FeatureProp, popupKeys: string[]): FeatureProp => {
	const result: FeatureProp = {};
	for (const key of popupKeys) {
		if (key in props) {
			result[key] = props[key];
		}
	}
	return result;
};
