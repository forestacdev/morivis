import { DEFAULT_SYMBOL_TEXT_FONT } from '$routes/constants';

import type {
	DataDrivenPropertyValueSpecification,
	FormattedSpecification,
	SymbolLayerSpecification
} from 'maplibre-gl';

import type { Labels, VectorStyle, PointStyle } from '$routes/map/data/types/vector/style';

import type { LayerItem } from '$routes/map/utils/layers/index';

import type { FieldDef } from '$routes/map/data/types/vector/properties';
import type { LabelsExpressions } from '$routes/map/data/types/vector/style';

type Expr = DataDrivenPropertyValueSpecification<FormattedSpecification>;

/**
 * fieldsからkeyに対応するFieldDefを取得する
 */
const getField = (fields: FieldDef[], key: string): FieldDef | undefined => {
	return fields.find((f) => f.key === key);
};

/**
 * 数値丸め式を生成（MapLibre 側でやるなら round を使う）
 * digits: 2 なら *100してroundして/100
 */
const numberExpr = (key: string, digits?: number): Expr => {
	const get = ['to-number', ['get', key]] as Expr;
	if (!digits || digits <= 0) return get;
	const pow = Math.pow(10, digits);
	return ['/', ['round', ['*', get, pow]], pow] as Expr;
};

/**
 * 単位を付与する式を生成
 */
const withUnit = (expr: Expr, unit?: string): Expr => {
	if (!unit) return expr;
	return ['concat', expr, unit] as Expr;
};

/**
 * prefix/suffixを付与する式を生成
 */
const withAffix = (expr: Expr, affix?: { prefix?: string; suffix?: string }): Expr => {
	if (!affix) return expr;
	const { prefix, suffix } = affix;
	if (prefix && suffix) {
		return ['concat', prefix, expr, suffix] as Expr;
	} else if (prefix) {
		return ['concat', prefix, expr] as Expr;
	} else if (suffix) {
		return ['concat', expr, suffix] as Expr;
	}
	return expr;
};

/**
 * 辞書変換（valueDict）の式を生成
 */
const withValueDict = (key: string, valueDict?: Record<string | number, string | number>): Expr => {
	if (!valueDict) return ['get', key] as Expr;
	const entries = Object.entries(valueDict);
	if (entries.length === 0) return ['get', key] as Expr;

	// ['match', ['get', key], val1, label1, val2, label2, ..., fallback]
	const matchExpr: unknown[] = ['match', ['get', key]];
	for (const [val, label] of entries) {
		// キーが数値の場合は数値として追加
		const parsedKey = isNaN(Number(val)) ? val : Number(val);
		matchExpr.push(parsedKey, String(label));
	}
	// フォールバック: 元の値をそのまま表示
	matchExpr.push(['to-string', ['get', key]]);
	return matchExpr as Expr;
};

/**
 * 無効値のフォールバック式を生成
 * 値がnullや空文字の場合にフォールバックテキストを返す
 */
const withEmptyFallback = (expr: Expr, emptyRules?: FieldDef['format']): Expr => {
	if (!emptyRules?.empty || emptyRules.empty.length === 0) return expr;

	// 最初のemptyルールのテキストをフォールバックとして使用
	const fallbackText = emptyRules.empty[0].text;

	// ['case', ['==', expr, null], fallbackText, ['==', expr, ''], fallbackText, expr]
	return [
		'case',
		['==', expr, null],
		fallbackText,
		['==', ['to-string', expr], ''],
		fallbackText,
		expr
	] as Expr;
};

/**
 * FieldDefに基づいてMapLibreのsymbol表示用text-field式を生成する
 *
 * 処理順序:
 * 1. 辞書変換（valueDict）
 * 2. 数値フォーマット（format.digits）
 * 3. affix適用（prefix/suffix）
 * 4. 単位付与（unit）
 * 5. 無効値フォールバック（format.empty）
 */
export const buildFieldExpression = (field: FieldDef): Expr => {
	let expr: Expr;

	// 1. 辞書変換
	if (field.valueDict) {
		expr = withValueDict(field.key, field.valueDict);
	} else if (field.type === 'number' || field.type === 'integer' || field.format?.digits != null) {
		// 2. 数値フォーマット
		expr = numberExpr(field.key, field.format?.digits);
	} else {
		expr = ['get', field.key] as Expr;
	}

	// 3. affix適用
	expr = withAffix(expr, field.affix);

	// 4. 単位付与
	expr = withUnit(expr, field.unit);

	// 5. 無効値フォールバック
	expr = withEmptyFallback(expr, field.format);

	return expr;
};

/**
 * LabelsExpressionsをMapLibre text-field expressionにコンパイルする
 */
export const compileLabelExpr = (le: LabelsExpressions, fields: FieldDef[]): Expr => {
	// 明示的なexpressionが最優先
	if (le.expression) return le.expression;

	const field = getField(fields, le.key);
	if (!field) {
		// FieldDefが見つからない場合はシンプルにget
		return ['get', le.key] as Expr;
	}

	return buildFieldExpression(field);
};

// ポイントのicon用レイヤーの作成
// TODO: 廃止予定
export const createPointIconLayer = (
	layer: LayerItem,
	style: PointStyle
): SymbolLayerSpecification => {
	const defaultStyle = style.default;
	const key = style.labels.key as keyof Labels;
	const showLabel = style.labels.show;
	const textField = style.labels.expressions.find((label) => label.key === key)?.expression ?? '';
	const labelPaint = {
		'text-opacity': 1,
		'text-color': '#000000',
		'text-halo-color': '#FFFFFF',
		'text-halo-width': 2
	};
	const labelLayout = {
		'text-field': textField,
		'text-size': 12,
		'text-max-width': 12
	};

	const symbolLayer: SymbolLayerSpecification = {
		...layer,
		id: `${layer.id}`,
		type: 'symbol',
		paint: {
			...(showLabel ? labelPaint : {}),
			...(showLabel && defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.paint : {}),
			'icon-opacity': style.opacity
		},
		layout: {
			...(showLabel ? labelLayout : {}),
			...(showLabel && defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.layout : {}),
			'icon-image': ['get', '_prop_id'],
			'icon-size': style.icon?.size ?? 0.1,
			'icon-anchor': 'bottom'

			// ...(symbolStyle.layout ?? {})

			// "text-variable-anchor": ["top", "bottom", "left", "right"],
			// "text-radial-offset": 0.5,
			// "text-justify": "auto",
		},
		// フィルター設定
		...(() => {
			if (defaultStyle?.symbol?.filter) {
				return { filter: defaultStyle.symbol.filter };
			}
			return {};
		})()
	};

	// TODO: text-halo-color text-halo-width text-size
	return symbolLayer;
};

// symbolレイヤーの作成

export const createSymbolLayer = (
	layer: LayerItem,
	style: VectorStyle,
	fields: FieldDef[]
): SymbolLayerSpecification => {
	const defaultStyle = style.default;
	const key = style.labels.key as keyof Labels;

	const LabelsExpression = style.labels.expressions.find((label) => label.key === key);
	const symbolLayer: SymbolLayerSpecification = {
		...layer,
		id: `${layer.id}_label`,
		minzoom: style.labels.minZoom ? style.labels.minZoom : layer.minzoom,
		type: 'symbol',
		paint: {
			'text-opacity': 1,
			'icon-opacity': 1,
			'text-color': '#000000',
			'text-halo-color': '#e8e8e8',
			'text-halo-width': 2,
			...(defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.paint : {})
		},
		layout: {
			'text-field': compileLabelExpr(LabelsExpression!, fields),
			'text-size': 12,
			'text-max-width': 12,
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			...(defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.layout : {})

			// 自動オフセット
			// 'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
			// 'text-radial-offset': 0.5,
			// 'text-justify': 'auto'
		},
		// フィルター設定
		...(() => {
			if (defaultStyle?.symbol?.filter) {
				return { filter: defaultStyle.symbol.filter };
			}
			return {};
		})()
	};

	// TODO: text-halo-color text-halo-width text-size
	return symbolLayer;
};
