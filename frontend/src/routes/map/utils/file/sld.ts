/**
 * SLD (Styled Layer Descriptor) パーサー
 * QGIS GPKGのlayer_stylesテーブルから取得したSLD XMLを解析し、
 * MapLibreのカテゴリカラーマッピングに変換する
 */

export interface SldCategoryStyle {
	propertyName: string;
	categories: string[];
	colors: string[];
	name: string;
}

/**
 * SLD XMLからカテゴリスタイルを抽出する
 * categorizedSymbol（PropertyIsEqualTo）に対応
 */
export const parseSldCategories = (sldXml: string): SldCategoryStyle | null => {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(sldXml, 'text/xml');

		const rules = doc.querySelectorAll('Rule');
		if (rules.length === 0) return null;

		let propertyName = '';
		const categories: string[] = [];
		const colors: string[] = [];

		for (const rule of rules) {
			// PropertyIsEqualTo からプロパティ名と値を取得
			const propIsEqual = rule.querySelector('PropertyIsEqualTo');
			if (!propIsEqual) continue;

			const propNameEl = propIsEqual.querySelector('PropertyName');
			const literalEl = propIsEqual.querySelector('Literal');
			if (!propNameEl?.textContent || !literalEl?.textContent) continue;

			if (!propertyName) {
				propertyName = propNameEl.textContent;
			}

			const value = literalEl.textContent;

			// fill色を取得（PolygonSymbolizer > Fill > SvgParameter[@name="fill"]）
			const fillParam = rule.querySelector(
				'PolygonSymbolizer Fill SvgParameter[name="fill"], ' +
					'LineSymbolizer Stroke SvgParameter[name="stroke"], ' +
					'PointSymbolizer Graphic Mark Fill SvgParameter[name="fill"]'
			);

			const color = fillParam?.textContent ?? '#888888';

			categories.push(value);
			colors.push(color);
		}

		if (categories.length === 0 || !propertyName) return null;

		// スタイル名を取得
		const nameEl = doc.querySelector('UserStyle Name');
		const name = nameEl?.textContent ?? 'SLDスタイル';

		return { propertyName, categories, colors, name };
	} catch {
		return null;
	}
};
