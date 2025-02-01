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
	fill: fillLayerStyle;
	line: lineLayerStyle;
	circle: circleLayerStyle;
	symbol: SymbolLayerStyle;
	fillExtrusion?: FillExtrusionLayerStyle;
}

export interface LineStringDefaultStyle {
	line: lineLayerStyle;
	circle: circleLayerStyle;
	symbol: SymbolLayerStyle;
}

export interface PointDefaultStyle {
	circle: circleLayerStyle;
	symbol: SymbolLayerStyle;
	heatmap?: HeatmapLayerStyle;
}

export interface LabelDefaultStyle {
	symbol: SymbolLayerStyle;
}

export interface ColorSingleExpressions {
	type: 'single';
	key: string;
	name: string;
	mapping: {
		value: string;
	};
}

export interface ColorMatchExpressions {
	type: 'match';
	key: string;
	name: string;
	mapping: {
		categories: string[] | number[];
		values: string[];
	};
}

export interface ColorStepExpressions {
	type: 'step';
	key: string;
	name: string;
	mapping: {
		range: [number, number]; // min, max
		divisions: number;
		values: string[];
	};
}

export type ColorsExpressions =
	| ColorSingleExpressions
	| ColorMatchExpressions
	| ColorStepExpressions;

export interface Colors {
	key: string;
	expressions: ColorsExpressions[];
}

export interface LabelsExpressions {
	key: string;
	name: string;
	value: DataDrivenPropertyValueSpecification<FormattedSpecification>;
}

export interface Labels {
	key: string;
	show: boolean;
	expressions: LabelsExpressions[];
}

export type VectorLayerType = 'circle' | 'line' | 'fill' | 'symbol' | 'heatmap' | 'fill-extrusion';

interface BaseVectorStyle {
	opacity: number;
	visible?: boolean;
	labels: Labels;
	colors: Colors;
}

export interface OutLine {
	show: boolean;
	color: string;
	width: number;
	lineStyle: 'solid' | 'dashed';
}

export interface PolygonStyle extends BaseVectorStyle {
	type: 'fill' | 'line' | 'circle';
	outline: OutLine;
	default: PolygonDefaultStyle;
}

export interface LineStringStyle extends BaseVectorStyle {
	type: 'line' | 'circle';
	default: LineStringDefaultStyle;
}

export interface PointStyle extends BaseVectorStyle {
	type: 'circle';
	default: PointDefaultStyle;
}

export interface LabelStyle extends BaseVectorStyle {
	type: 'symbol';
	default: LabelDefaultStyle;
}

export type VectorStyle = PolygonStyle | LineStringStyle | PointStyle | LabelStyle;
