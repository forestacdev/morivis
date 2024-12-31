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

interface PolygonStyle {
	fill: fillStyle;
	line: lineStyle;
	circle: circleStyle;
	symbol: symbolStyle;
}

interface LineStringStyle {
	line: lineStyle;
	circle: circleStyle;
	symbol: symbolStyle;
}

interface PointStyle {
	circle: circleStyle;
	symbol: symbolStyle;
}

interface LabelStyle {
	symbol: symbolStyle;
}

interface Labels {
	name: string;
	key: string;
	value: string;
}

export type VectorLayerType = 'circle' | 'line' | 'fill';

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
