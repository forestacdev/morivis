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
import type { SpritePatternId } from './pattern';
import type {
	SequentialScheme,
	SequentialCount,
	BaseSingleColor
} from '$routes/map/utils/color/color-brewer';

interface fillLayerStyle {
	paint: FillLayerSpecification['paint'];
	layout: FillLayerSpecification['layout'];
	filter?: FillLayerSpecification['filter']; // Optional filter for fill layers
}

interface lineLayerStyle {
	paint: LineLayerSpecification['paint'];
	layout: LineLayerSpecification['layout'];
	filter?: LineLayerSpecification['filter']; // Optional filter for line layers
}

interface circleLayerStyle {
	paint: CircleLayerSpecification['paint'];
	layout: CircleLayerSpecification['layout'];
	filter?: CircleLayerSpecification['filter']; // Optional filter for circle layers
}

interface SymbolLayerStyle {
	paint: SymbolLayerSpecification['paint'];
	layout: SymbolLayerSpecification['layout'];
	filter?: SymbolLayerSpecification['filter']; // Optional filter for symbol layers
}

interface FillExtrusionLayerStyle {
	paint: FillExtrusionLayerSpecification['paint'];
	layout: FillExtrusionLayerSpecification['layout'];
	filter?: FillExtrusionLayerSpecification['filter']; // Optional filter for fill-extrusion layers
}

// TODO: ヒートマップのスタイルを追加
interface HeatmapLayerStyle {
	paint: HeatmapLayerSpecification['paint'];
	layout: HeatmapLayerSpecification['layout'];
	filter?: HeatmapLayerSpecification['filter']; // Optional filter for heatmap layers
}

export interface PolygonDefaultStyle {
	fill?: fillLayerStyle;
	line?: lineLayerStyle;
	circle?: circleLayerStyle;
	symbol?: SymbolLayerStyle;
	fillExtrusion?: FillExtrusionLayerStyle;
}

export interface LineStringDefaultStyle {
	line?: lineLayerStyle;
	circle?: circleLayerStyle;
	symbol?: SymbolLayerStyle;
}

export interface PointDefaultStyle {
	circle?: circleLayerStyle;
	symbol?: SymbolLayerStyle;
	heatmap?: HeatmapLayerStyle;
}

export interface LabelDefaultStyle {
	symbol: SymbolLayerStyle;
}

export interface ColorSingleExpression {
	type: 'single';
	key: string;
	name: string;
	mapping: {
		value: BaseSingleColor;
		pattern?: SpritePatternId | null;
	};
}

// #a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'
// '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'

export interface ColorMatchExpression {
	type: 'match';
	key: string;
	name: string;
	mapping: {
		categories: string[] | number[];
		values: string[];
		patterns?: (SpritePatternId | null)[];
	};
	noData?: {
		category?: string;
		value: string;
		pattern: SpritePatternId | null;
	};
}

export interface ColorStepExpression {
	type: 'step';
	key: string;
	name: string;
	mapping: {
		scheme: SequentialScheme;
		range: [number, number]; // min, max
		divisions: SequentialCount;
	};
}

export interface ColorLinearExpression {
	type: 'linear';
	key: string;
	name: string;
	mapping: {
		range: [number, number]; // min, max
		values: [string, string];
	};
}

export type ColorsExpression =
	| ColorSingleExpression
	| ColorMatchExpression
	| ColorStepExpression
	| ColorLinearExpression;

export interface ColorsStyle {
	key: string;
	show: boolean;
	expressions: (ColorsExpression | RawExpression)[];
}

export interface NumberSingleExpression {
	type: 'single';
	key: string;
	name: string;
	mapping: {
		value: number;
	};
}

export interface NumberMatchExpression {
	type: 'match';
	key: string;
	name: string;
	mapping: {
		categories: string[] | number[];
		values: number[];
	};
}

export interface NumberStepExpression {
	type: 'step';
	key: string;
	name: string;
	mapping: {
		range: [number, number]; // min, max
		divisions: number;
		values: number[];
	};
}

export interface NumberLinearExpression {
	type: 'linear';
	key: string;
	name: string;
	mapping: {
		range: [number, number]; // min, max
		values: [number, number];
	};
}

export type NumbersExpression =
	| NumberSingleExpression
	| NumberMatchExpression
	| NumberStepExpression
	| NumberLinearExpression;

export interface RawExpression {
	type: 'raw';
	key: string;
	name: string;
	mapping: {
		expression: ExpressionSpecification;
	};
}

export interface NumbersStyle {
	key: string;
	expressions: (NumbersExpression | RawExpression)[];
}

export type ExpressionType = 'color' | 'number';

export interface LabelsExpressions {
	key: string;
	name: string;
	expression?: DataDrivenPropertyValueSpecification<FormattedSpecification>;
}

export interface Labels {
	key: string;
	show: boolean;
	opacity?: number;
	color?: string;
	size?: number;
	haloColor?: string;
	haloWidth?: number;
	minZoom?: number;
	expressions: LabelsExpressions[];
}

export type VectorLayerType = 'circle' | 'line' | 'fill' | 'symbol' | 'heatmap' | 'fill-extrusion';

interface BaseVectorStyle {
	opacity: number | 1 | 0.7 | 0.5 | 0.3;
	visible?: boolean; // NOTE: 動的追加
	labels: Labels;
	colors: ColorsStyle;
}

export interface PolygonOutLine {
	show: boolean;
	minZoom?: number;
	color: string;
	width: number;
	lineStyle: 'solid' | 'dashed';
}

export interface PolygonExtrusion {
	show: boolean;
	height: NumbersStyle;
}

export interface PointOutLine {
	show: boolean;
	color: string;
	width: number;
	minzoom?: number;
}

export interface PointIcon {
	show: boolean;
	size: number;
}

export interface LabelOutLine {
	show: boolean;
	color: string;
	width: NumbersStyle;
}

export interface PolygonStyle extends BaseVectorStyle {
	type: 'fill';
	outline: PolygonOutLine;
	extrusion?: PolygonExtrusion;
	default?: PolygonDefaultStyle;
}

export interface LineStringStyle extends BaseVectorStyle {
	type: 'line';
	width: NumbersStyle;
	lineStyle: 'solid' | 'dashed';
	default?: LineStringDefaultStyle;
}

export interface PointStyle extends BaseVectorStyle {
	type: 'circle';
	radius: NumbersStyle;
	markerType: 'circle' | 'icon';
	icon?: PointIcon;
	outline: PointOutLine;
	default?: PointDefaultStyle;
}

export type VectorStyle = PolygonStyle | LineStringStyle | PointStyle;
