import type {
	SourceSpecification,
	LayerSpecification,
	FillLayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	CircleLayerSpecification,
	HeatmapLayerSpecification,
	FillExtrusionLayerSpecification,
	RasterLayerSpecification,
	HillshadeLayerSpecification,
	BackgroundLayerSpecification,
	FilterSpecification,
	DataDrivenPropertyValueSpecification,
	ColorSpecification
} from 'maplibre-gl';

interface fillStyle {
	paint: FillLayerSpecification['paint'];
	layout: FillLayerSpecification['layout'];
}

interface lineStyle {
	paint: LineLayerSpecification['paint'];
	layout: LineLayerSpecification['layout'];
}

interface circleStyle {
	paint: CircleLayerSpecification['paint'];
	layout: CircleLayerSpecification['layout'];
}

interface symbolStyle {
	paint: SymbolLayerSpecification['paint'];
	layout: SymbolLayerSpecification['layout'];
}

export interface PolygonStyle {
	fill: fillStyle;
	line: lineStyle;
	circle: circleStyle;
	symbol: symbolStyle;
}

export interface LineStringStyle {
	line: lineStyle;
	circle: circleStyle;
	symbol: symbolStyle;
}

export interface PointStyle {
	circle: circleStyle;
	symbol: symbolStyle;
}

export interface LabelStyle {
	symbol: symbolStyle;
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
		categories: number[];
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
	value: string;
}

export interface Labels {
	key: string;
	show: boolean;
	expressions: LabelsExpressions[];
}

export type VectorLayerType = 'circle' | 'line' | 'fill' | 'symbol' | 'heatmap' | 'fill-extrusion';

export interface VectorStyle {
	type: VectorLayerType;
	opacity: number;
	visible?: boolean;
	labels: Labels;
	colors: Colors;
	default: PolygonStyle | LineStringStyle | PointStyle | LabelStyle;
}
