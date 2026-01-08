import type {
	DataDrivenPropertyValueSpecification,
	FormattedSpecification,
	ExpressionSpecification
} from 'maplibre-gl';

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
function withUnit(expr: MbExpr, unit?: string): MbExpr {
	if (!unit) return expr;
	return ['concat', expr, ` ${unit}`];
}

// null/empty を '-' にする（空値ポリシーを fields に寄せたい場合）
function withEmptyFallback(expr: MbExpr, emptyText?: string): MbExpr {
	if (!emptyText) return expr;
	// get が null だったら emptyText。空文字も扱いたいなら条件増やす
	return ['case', ['==', expr, null], emptyText, expr];
}

/** LabelExpr を最終的な MapLibre text-field expression にコンパイル */
function compileLabelExpr(le: LabelExpr, fields: FieldDef[]): MbExpr {
	if (le.expr) return le.expr; // 明示exprが最優先

	const f = getField(fields, le.key);
	// 文字列はそのまま get、数値は丸めを適用（ここは type を持ってるならそれで分岐が理想）
	const base = f?.format?.digits != null ? numberExpr(le.key, f.format.digits) : ['get', le.key];

	const withUnitExpr = withUnit(base, f?.unit);
	return withEmptyFallback(withUnitExpr, f?.format?.emptyText);
}
