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

import type { Expressions } from '$routes/map/data/vector/expression';

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

export interface Labels {
	name: string;
	key: string;
	value: string;
}

export type VectorLayerType = 'circle' | 'line' | 'fill' | 'symbol' | 'heatmap' | 'fill-extrusion';

export interface VectorStyle {
	type: VectorLayerType;
	opacity: number;
	color: string;
	visible?: boolean;
	displayLabel: boolean;
	labels: Labels[];
	expressions: Expressions;
	default: PolygonStyle | LineStringStyle | PointStyle | LabelStyle;
}
