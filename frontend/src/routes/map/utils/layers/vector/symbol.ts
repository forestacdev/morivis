import type { DataDrivenPropertyValueSpecification, FormattedSpecification } from 'maplibre-gl';

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
