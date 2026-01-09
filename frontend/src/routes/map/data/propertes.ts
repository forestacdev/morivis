import type { DataDrivenPropertyValueSpecification, FormattedSpecification } from 'maplibre-gl';

type FieldDef = {
	key: string;
	unit?: string;
	format?: { digits?: number; emptyText?: string };
};

function getField(fields: FieldDef[], key: string): FieldDef | undefined {
	return fields.find((f) => f.key === key);
}

// 数値丸め（MapLibre 側でやるなら round を使う）
// digits: 2 なら *100してroundして/100
function numberExpr(
	key: string,
	digits?: number
): DataDrivenPropertyValueSpecification<FormattedSpecification> {
	const get = [
		'to-number',
		['get', key]
	] as DataDrivenPropertyValueSpecification<FormattedSpecification>;
	if (!digits || digits <= 0) return get;
	const pow = Math.pow(10, digits);
	return [
		'/',
		['round', ['*', get, pow]],
		pow
	] as DataDrivenPropertyValueSpecification<FormattedSpecification>;
}

// unit を fields から付ける（' ha' みたいなスペースもここで統一）
const withUnit = (
	expr: DataDrivenPropertyValueSpecification<FormattedSpecification>,
	unit?: string
): DataDrivenPropertyValueSpecification<FormattedSpecification> => {
	if (!unit) return expr;
	return [
		'concat',
		expr,
		` ${unit}`
	] as DataDrivenPropertyValueSpecification<FormattedSpecification>;
};

// null/empty を '-' にする（空値ポリシーを fields に寄せたい場合）
const withEmptyFallback = (
	expr: DataDrivenPropertyValueSpecification<FormattedSpecification>,
	emptyText?: string
): DataDrivenPropertyValueSpecification<FormattedSpecification> => {
	if (!emptyText) return expr;
	// get が null だったら emptyText。空文字も扱いたいなら条件増やす
	return [
		'case',
		['==', expr, null],
		emptyText,
		expr
	] as DataDrivenPropertyValueSpecification<FormattedSpecification>;
};

/** LabelExpr を最終的な MapLibre text-field expression にコンパイル */
// const compileLabelExpr = (
// 	le: DataDrivenPropertyValueSpecification<FormattedSpecification>,
// 	fields: FieldDef[]
// ): DataDrivenPropertyValueSpecification<FormattedSpecification> => {
// 	if (le.expr) return le.expr; // 明示exprが最優先

// 	const f = getField(fields, le.key);
// 	// 文字列はそのまま get、数値は丸めを適用（ここは type を持ってるならそれで分岐が理想）
// 	const base =
// 		f?.format?.digits != null
// 			? numberExpr(le.key, f.format.digits)
// 			: (['get', le.key] as DataDrivenPropertyValueSpecification<FormattedSpecification>);

// 	const withUnitExpr = withUnit(base, f?.unit);
// 	return withEmptyFallback(withUnitExpr, f?.format?.emptyText);
// };
