import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle,
	Labels,
	ColorMatchExpression,
	ColorStepExpression,
	ColorSingleExpression,
	PolygonDefaultStyle,
	LineStringDefaultStyle,
	PointDefaultStyle,
	LabelDefaultStyle,
	PolygonOutLine,
	ColorsStyle
} from '$routes/map/data/types/vector/style';
import { color } from 'd3-color';

import type {
	FillLayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	CircleLayerSpecification,
	HeatmapLayerSpecification,
	FillExtrusionLayerSpecification,
	DataDrivenPropertyValueSpecification,
	FormattedSpecification,
	ExpressionSpecification
} from 'maplibre-gl';

export const DEFAULT_VECTOR_POINT_STYLE: PointStyle = {
	type: 'circle',
	opacity: 0.7,
	visible: true,
	markerType: 'circle',
	colors: {
		show: true,
		key: '単色',
		expressions: [
			{
				type: 'single',
				key: '単色',
				name: '単色',
				mapping: {
					value: '#ff7f00'
				}
			}
		]
	},
	radius: {
		key: '単一',
		expressions: [
			{
				type: 'single',
				key: '単一',
				name: '単一',
				mapping: {
					value: 8
				}
			}
		]
	},
	outline: {
		show: true,
		color: '#ffffff',
		width: 2
	},
	labels: {
		key: 'name',
		show: false,
		expressions: [
			{
				key: 'name',
				name: 'name'
			}
		]
	}
};

export const DEFAULT_VECTOR_LINE_STYLE: LineStringStyle = {
	type: 'line',
	opacity: 0.7,
	visible: true,
	colors: {
		show: true,
		key: '単色',
		expressions: [
			{
				type: 'single',
				key: '単色',
				name: '単色',
				mapping: {
					value: '#ff7f00'
				}
			}
		]
	},
	width: {
		key: '単一',
		expressions: [
			{
				type: 'single',
				key: '単一',
				name: '単一',
				mapping: {
					value: 5
				}
			}
		]
	},
	lineStyle: 'solid',
	labels: {
		key: 'name',
		show: false,
		expressions: [
			{
				key: 'name',
				name: 'name'
			}
		]
	}
};

export const DEFAULT_VECTOR_POLYGON_STYLE: PolygonStyle = {
	type: 'fill',
	opacity: 0.7,
	visible: true,
	colors: {
		key: '単色',
		show: true,
		expressions: [
			{
				type: 'single',
				key: '単色',
				name: '単色',
				mapping: {
					value: '#ff7f00'
				}
			}
		]
	},
	outline: {
		show: true,
		color: '#000000',
		width: 1,
		lineStyle: 'solid'
	},
	labels: {
		key: 'name',
		show: false,
		expressions: [
			{
				key: 'name',
				name: 'name'
			}
		]
	}
};

export const createLabelsExpressions = (keys: string[]): Labels => {
	const labelsExpressions = keys.map((label) => {
		return {
			key: label,
			name: label
		};
	});

	return {
		key: keys[0],
		show: false,
		expressions: labelsExpressions
	};
};

// =============================================================================
// 樹種ポリゴン (Tree Species Polygon)
// =============================================================================
export const TREE_SINGLE_COLOR_STYLE: ColorSingleExpression = {
	type: 'single',
	key: '単色',
	name: '単色',
	mapping: {
		value: '#33a02c',
		pattern: null
	}
};

/* 解析樹種のデフォルトカラーパターン */
export const TREE_MATCH_COLOR_STYLE: ColorMatchExpression = {
	type: 'match',
	key: '解析樹種',
	name: '樹種ごとの色分け',
	mapping: {
		categories: [
			'スギ',
			'ヒノキ類',
			'マツ類',
			'カラマツ',
			'トドマツ',
			'エゾマツ',
			'その他Ｎ', // 針葉樹
			'クヌギ',
			'ナラ類',
			'ブナ',
			'その他L', // 広葉樹
			'タケ',
			'針広混交林',
			'新植地',
			'伐採跡地',
			'その他'
		],
		values: [
			'#33a02c',
			'#b2df8a',
			'#a6cee3',
			'#1f78b4',
			'#fb9a99',
			'#e31a1c',
			'#fdbf6f',
			'#ffff99',
			'#cab2d6',
			'#6a3d9a',
			'#ff7f00',
			'#b15928',
			'#33a02c', // 針広混交林
			'#b2df8a', // 新植地
			'#a6cee3', // 伐採跡地
			'#1f78b4' // その他（グレー）
		],
		// パターン情報
		patterns: [
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			'tmpoly-line-vertical-down-light-200-black',
			'tmpoly-line-vertical-down-light-200-black',
			'tmpoly-line-vertical-down-light-200-black',
			'tmpoly-line-vertical-down-light-200-black'
		]
	},
	noData: {
		value: 'transparent',
		pattern: null
	}
};

/**
 * TREE_MATCH_COLOR_STYLEから指定したcategoriesのみのmappingを作成する
 * @param categories - 抽出したいcategoryの配列
 * @returns 抽出後のColorMatchExpression['mapping']
 */
export const createFilteredTreeMatchColorStyleMapping = (
	categories: string[]
): ColorMatchExpression['mapping'] => {
	const sourceCategories = TREE_MATCH_COLOR_STYLE.mapping.categories as string[];
	const sourceValues = TREE_MATCH_COLOR_STYLE.mapping.values;
	const sourcePatterns = TREE_MATCH_COLOR_STYLE.mapping.patterns;

	const filteredCategories: string[] = [];
	const filteredValues: string[] = [];
	const filteredPatterns: NonNullable<typeof sourcePatterns> = [];

	for (const category of categories) {
		const index = sourceCategories.indexOf(category);
		if (index !== -1) {
			filteredCategories.push(sourceCategories[index]);
			filteredValues.push(sourceValues[index]);
			filteredPatterns.push(sourcePatterns?.[index] ?? null);
		}
	}

	return {
		categories: filteredCategories,
		values: filteredValues,
		patterns: filteredPatterns
	};
};

export const TREE_STEP_COLOR_STYLE: ColorStepExpression = {
	type: 'step',
	key: '面積_ha',
	name: '面積ごとの色分け',
	mapping: {
		scheme: 'RdPu',
		range: [0, 9380],
		divisions: 5
	}
};

export const TREE_SPECIES_OUTLINE: PolygonOutLine = {
	show: false,
	color: '#000000',
	width: 1,
	lineStyle: 'solid'
};

export const TREE_SPECIES_LABELS: Labels = {
	key: '樹種',
	show: false,
	minZoom: 10,
	expressions: [
		{
			key: '樹種',
			name: '樹種'
		},
		{
			key: '解析樹種',
			name: '解析樹種'
		},
		{
			key: '面積_ha',
			name: '面積'
		},
		{
			key: '森林計測年',
			name: '森林計測年'
		},
		{
			key: '森林計測法',
			name: '森林計測法'
		},
		{
			key: '樹種ID',
			name: '樹種ID'
		},
		{
			key: '県code',
			name: '県code'
		},
		{
			key: '市町村code',
			name: '市町村code'
		},
		{
			key: '解析樹種ID',
			name: '解析樹種ID'
		}
	]
};

export const TREE_SPECIES_STYLE_COLORS: ColorsStyle = {
	key: '解析樹種',
	show: true,
	expressions: [
		{
			...TREE_SINGLE_COLOR_STYLE
		},
		{
			...TREE_MATCH_COLOR_STYLE
		},
		{
			...TREE_STEP_COLOR_STYLE
		}
	]
};

export const DEFAULT_POLYGON_LABEL_STYLE: PolygonDefaultStyle['symbol'] = {
	paint: {
		'text-color': '#ffffff',
		'text-halo-color': '#151515',
		'text-halo-width': 2,
		'text-halo-blur': 1,
		'text-opacity': 0.9
	},
	layout: {}
};

export const DEFAULT_POLYGON_STYLE: PolygonDefaultStyle = {
	symbol: DEFAULT_POLYGON_LABEL_STYLE
};

export const TREE_SPECIES_STYLE: PolygonStyle = {
	type: 'fill',
	opacity: 0.5,
	colors: {
		...TREE_SPECIES_STYLE_COLORS
	},
	outline: {
		...TREE_SPECIES_OUTLINE
	},
	labels: {
		...TREE_SPECIES_LABELS
	},
	default: {
		...DEFAULT_POLYGON_STYLE
	}
};

// =============================================================================
// 森林資源量集計メッシュ (Forest Resource Mesh 20m)
// =============================================================================

export const FOREST_MESH_STEP_COLOR_STYLE_EXPRESSIONS: ColorStepExpression[] = [
	{
		type: 'step',
		key: '立木本数',
		name: '立木本数による色分け',
		mapping: {
			scheme: 'YlOrRd',
			range: [0, 50],
			divisions: 5
		}
	},
	{
		type: 'step',
		key: '立木密度',
		name: '立木密度による色分け',
		mapping: {
			scheme: 'YlOrRd',
			range: [0, 1500],
			divisions: 5
		}
	},
	{
		type: 'step',
		key: '平均樹高',
		name: '平均樹高による色分け',
		mapping: {
			scheme: 'YlOrRd',
			range: [0, 30],
			divisions: 5
		}
	},
	{
		type: 'step',
		key: '平均直径',
		name: '平均直径による色分け',
		mapping: {
			scheme: 'YlOrRd',
			range: [0, 50],
			divisions: 5
		}
	},
	{
		type: 'step',
		key: '合計材積',
		name: '合計材積による色分け',
		mapping: {
			scheme: 'YlOrRd',
			range: [0, 50],
			divisions: 5
		}
	},

	{
		type: 'step',
		key: '平均標高',
		name: '平均標高による色分け',
		mapping: {
			scheme: 'YlOrRd',
			range: [0, 1000],
			divisions: 5
		}
	},
	{
		type: 'step',
		key: '平均傾斜',
		name: '平均傾斜による色分け',
		mapping: {
			scheme: 'YlOrRd',
			range: [0, 90],
			divisions: 5
		}
	}
];

export const FOREST_MESH_OUTLINE: PolygonOutLine = {
	show: false,
	color: '#000000',
	width: 0.1,
	lineStyle: 'solid'
};

export const FOREST_MESH_LABELS: Labels = {
	key: '樹種',
	show: false,
	minZoom: 14,
	expressions: [
		{
			key: '解析樹種ID',
			name: '解析樹種ID'
		},
		{
			key: '解析樹種',
			name: '解析樹種'
		},
		{
			key: '樹種ID',
			name: '樹種ID'
		},
		{
			key: '樹種',
			name: '樹種'
		},
		{
			key: '面積_ha',
			name: '面積_ha'
		},
		{
			key: '立木本数',
			name: '立木本数'
		},
		{
			key: '立木密度',
			name: '立木密度'
		},
		{
			key: '平均樹高',
			name: '平均樹高'
		},
		{
			key: '平均直径',
			name: '平均直径'
		},
		{
			key: '合計材積',
			name: '合計材積'
		},
		{
			key: 'ha材積',
			name: 'ha材積'
		},
		{
			key: '収量比数',
			name: '収量比数'
		},
		{
			key: '相対幹距比',
			name: '相対幹距比'
		},
		{
			key: '形状比',
			name: '形状比'
		},
		{
			key: '樹冠長率',
			name: '樹冠長率'
		},
		{
			key: '森林計測年',
			name: '森林計測年'
		},
		{
			key: '森林計測法',
			name: '森林計測法'
		},
		{
			key: '平均傾斜',
			name: '平均傾斜'
		},
		{
			key: '最大傾斜',
			name: '最大傾斜'
		},
		{
			key: '最小傾斜',
			name: '最小傾斜'
		},
		{
			key: '最頻傾斜',
			name: '最頻傾斜'
		},
		{
			key: '県code',
			name: '県code'
		},
		{
			key: '市町村code',
			name: '市町村code'
		}
		// {
		// 	key: 'ID',
		// 	name: 'ID'
		// },
		// {
		// 	key: '樹冠高90',
		// 	name: '樹冠高90'
		// },
		// {
		// 	key: '最大樹冠高',
		// 	name: '最大樹冠高'
		// }
	]
};

export const FOREST_MESH_STYLE_COLORS: ColorsStyle = {
	key: '解析樹種',
	show: true,
	expressions: [
		{
			...TREE_SINGLE_COLOR_STYLE
		},
		{
			...TREE_MATCH_COLOR_STYLE
		},
		...FOREST_MESH_STEP_COLOR_STYLE_EXPRESSIONS
	]
};

export const FOREST_MESH_STYLE: PolygonStyle = {
	type: 'fill',
	opacity: 0.5,
	colors: {
		...FOREST_MESH_STYLE_COLORS
	},
	outline: {
		...FOREST_MESH_OUTLINE
	},
	labels: {
		...FOREST_MESH_LABELS
	},
	default: {
		...DEFAULT_POLYGON_STYLE
	}
};
