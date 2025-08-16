import type {
	FillLayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	CircleLayerSpecification,
	HeatmapLayerSpecification,
	FillExtrusionLayerSpecification,
	DataDrivenPropertyValueSpecification,
	FormattedSpecification
} from 'maplibre-gl';
import type { SpritePatternId } from './pattern';

interface fillLayerStyle {
	paint: FillLayerSpecification['paint'];
	layout: FillLayerSpecification['layout'];
}

interface lineLayerStyle {
	paint: LineLayerSpecification['paint'];
	layout: LineLayerSpecification['layout'];
}

interface circleLayerStyle {
	paint: CircleLayerSpecification['paint'];
	layout: CircleLayerSpecification['layout'];
}

interface SymbolLayerStyle {
	paint: SymbolLayerSpecification['paint'];
	layout: SymbolLayerSpecification['layout'];
}

// TODO: 押し出しポリゴンのスタイルを追加
interface FillExtrusionLayerStyle {
	paint: FillExtrusionLayerSpecification['paint'];
	layout: FillExtrusionLayerSpecification['layout'];
}

// TODO: ヒートマップのスタイルを追加
interface HeatmapLayerStyle {
	paint: HeatmapLayerSpecification['paint'];
	layout: HeatmapLayerSpecification['layout'];
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
		value: string;
		pattern?: SpritePatternId | null;
	};
}

export interface ColorMatchExpression {
	type: 'match';
	key: string;
	name: string;
	mapping: {
		categories: string[] | number[];
		values: string[];
		patterns?: (SpritePatternId | null)[];
	};
	noData: {
		values: string;
		pattern?: SpritePatternId | null;
	};
}

export interface ColorStepExpression {
	type: 'step';
	key: string;
	name: string;
	mapping: {
		range: [number, number]; // min, max
		divisions: number;
		values: [string, string];
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
	expressions: ColorsExpression[];
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
	| NumberLinearExpression;

export interface NumbersStyle {
	key: string;
	expressions: NumbersExpression[];
}

export type ExpressionType = 'color' | 'number';

export interface LabelsExpressions {
	key: string;
	name: string;
	value: DataDrivenPropertyValueSpecification<FormattedSpecification>;
}

export interface Labels {
	key: string;
	show: boolean;
	minZoom?: number;
	expressions: LabelsExpressions[];
}

export type VectorLayerType = 'circle' | 'line' | 'fill' | 'symbol' | 'heatmap' | 'fill-extrusion';

interface BaseVectorStyle {
	opacity: number;
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

export interface PointOutLine {
	show: boolean;
	color: string;
	width: number;
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

export interface LabelStyle extends BaseVectorStyle {
	type: 'symbol';
	textSize: NumbersStyle;
	outline: LabelOutLine;
	default?: LabelDefaultStyle;
}

export type VectorStyle = PolygonStyle | LineStringStyle | PointStyle | LabelStyle;
