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
