import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle,
	LabelStyle,
	Labels,
	ColorMatchExpression
} from '$routes/map/data/types/vector/style';
import type {
	RasterBaseMapStyle,
	RasterCategoricalStyle,
	RasterDemStyle,
	RasterInteraction
} from '$routes/map/data/types/raster';

export const DEFAULT_RASTER_BASEMAP_STYLE: RasterBaseMapStyle = {
	type: 'basemap',
	opacity: 1.0,
	visible: true,
	preset: 'default',
	hueRotate: 0,
	brightnessMin: 0,
	brightnessMax: 1,
	saturation: 0,
	contrast: 0
};

export const DEFAULT_RASTER_CATEGORICAL_STYLE: RasterCategoricalStyle = {
	type: 'categorical',
	opacity: 0.7,
	visible: true,
	legend: {
		type: 'category',
		name: '',
		colors: [''],
		labels: ['']
	}
};

export const DEFAULT_RASTER_DEM_STYLE: RasterDemStyle = {
	type: 'dem',
	opacity: 1.0,
	visualization: {
		demType: 'gsi',
		mode: 'relief',
		uniformsData: {
			relief: {
				max: 4000,
				min: 0,
				colorMap: 'jet'
			},

			slope: {
				max: 90,
				min: 0,
				colorMap: 'salinity'
			},
			aspect: {
				colorMap: 'rainbow-soft'
			}
			// shadow: {
			// 	azimuth: 180,
			// 	altitude: 45
			// },
			// curvature: {
			// 	ridgeThreshold: 0.7,
			// 	valleyThreshold: 0.3,
			// 	ridgeColor: '#980707',
			// 	valleyColor: '#137c83'
			// }
		}
	}
};

export const DEFAULT_RASTER_BASEMAP_INTERACTION: RasterInteraction = {
	clickable: false
};

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
					value: '#ff00ea'
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
				name: 'name',
				value: '{name}'
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
					value: '#cf42cc'
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
				name: 'name',
				value: '{name}'
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
					value: '#349f1c'
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
				name: 'name',
				value: '{name}'
			}
		]
	}
};

export const createLabelsExpressions = (keys: string[]): Labels => {
	const labelsExpressions = keys.map((label) => {
		return {
			key: label,
			name: label,
			value: `{${label}}`
		};
	});

	return {
		key: keys[0],
		show: false,
		expressions: labelsExpressions
	};
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
		values: 'transparent',
		pattern: null
	}
};
