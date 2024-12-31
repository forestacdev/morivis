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

export type SingleColor = {
	default: string; // 単色
};
export type MatchColors = {
	categories: { [key: string | number]: string }; // 辞書形式のカテゴリ分け
	default: string; // デフォルトの色
	showCategories: string[] | number[]; // 表示するカテゴリ
};
export type InterpolateColors = {
	categories: { [key: string]: string }; // 補間に使うストップ値と色
	default: string; // デフォルトの色
	showCategories: string[] | number[]; // 表示するカテゴリ
};
export type LayerStyleColor = Record<
	string,
	{
		type: 'single' | 'match' | 'interpolate';
		property: string;
		values: SingleColor | MatchColors | InterpolateColors;
	}
>;

export type SingleNumeric = {
	default: number; // 単一の数値
};
export type MatchNumeric = {
	categories: { [key: string | number]: number }; // カテゴリと数値のマッピング
	default: number; // デフォルト値
	showCategories: string[] | number[]; // 表示するカテゴリ
};
export type InterpolateNumeric = {
	stops: { [key: number]: number }; // 補間用ストップ値と数値のマッピング
};
export type LayerStyleNumeric = Record<
	string,
	{
		type: 'single' | 'match' | 'interpolate';
		property: string;
		values: SingleNumeric | MatchNumeric | InterpolateNumeric;
	}
>;

export type FillLayerOptions<T, U> = {
	show: boolean;
	styleKey: string;
	color: LayerStyleColor;
	paint?: T;
	layout?: U;
};

export type LinePattern = 'solid' | 'dashed';
export type ColerValue = {
	type: string | 'custom';
	values: {
		[key: string]: DataDrivenPropertyValueSpecification<ColorSpecification>;
		custom: string;
	};
};

export type NumericValue = {
	type: string | 'custom';
	values: {
		[key: string]: DataDrivenPropertyValueSpecification<number>;
		custom: number;
	};
};
export type LineLayerOptions<T, U> = {
	show: boolean;
	styleKey: string;
	color: LayerStyleColor;
	linePattern: LinePattern;
	lineWidth: LayerStyleNumeric;
	paint?: T;
	layout?: U;
};

export type CircleLayerOptions<T, U> = {
	show: boolean;
	styleKey: string;
	color: LayerStyleColor;
	circleRadius: NumericValue;
	strokeColor: ColerValue;
	strokeWidth: NumericValue;
	paint?: T;
	layout?: U;
};

export type SymbolLayerOptions<T, U> = {
	show: boolean;
	styleKey: string;
	color: LayerStyleColor;
	paint?: T;
	layout?: U;
};

type RasterLayerOptions<T, U> = {
	paint?: T;
	layout?: U;
};

type VectorStyle = {
	fill?: FillLayerOptions<FillLayerSpecification['paint'], FillLayerSpecification['layout']>;
	line?: LineLayerOptions<LineLayerSpecification['paint'], LineLayerSpecification['layout']>;
	circle?: CircleLayerOptions<
		CircleLayerSpecification['paint'],
		CircleLayerSpecification['layout']
	>;
	symbol?: SymbolLayerOptions<
		SymbolLayerSpecification['paint'],
		SymbolLayerSpecification['layout']
	>;
	// heatmap?: LayerStyleColor<HeatmapLayerSpecification['paint'], HeatmapLayerSpecification['layout']>;
	// fillExtrusion?: LayerStyleColor<
	// 	FillExtrusionLayerSpecification['paint'],
	// 	FillExtrusionLayerSpecification['layout']
	// >;
};

type RasterStyle = {
	raster?: RasterLayerOptions<
		RasterLayerSpecification['paint'],
		RasterLayerSpecification['layout']
	>[];
	hillshade?: RasterLayerOptions<
		HillshadeLayerSpecification['paint'],
		HillshadeLayerSpecification['layout']
	>[];
	background?: RasterLayerOptions<
		BackgroundLayerSpecification['paint'],
		BackgroundLayerSpecification['layout']
	>[];
};



export type GeometryType = 'polygon' | 'line' | 'point' | 'label' | 'raster';

export type RasterEntry = {
	id: string;
	name: string;
	dataType: 'raster';
	rasterType: 'image' | 'dem';
	url: string;
	attribution: string;
	sourceMinZoom?: number;
	sourceMaxZoom?: number;
	layerMinZoom?: number;
	layerMaxZoom?: number;
	isOverVector?: boolean;
	opacity: number;
	styleKey: string;
	style: RasterStyle;
	visible: boolean;
	clickable?: boolean; // クリック可能かどうか
	remarks?: string; // 備考
	location?: Region[];
	bbox?: [number, number, number, number]; // バウンディングボックス
	guide_color?: {
		color: string;
		label: string;
	}[];
	tileImage?: {
		x: number;
		y: number;
		z: number;
	};
};

export type ProtocolKey = 'customdem' | 'customtiles' | 'customgeojsondem';

type DemVisualMode = {
	evolution: boolean;
	slope: boolean;
	shadow: boolean;
	aspect: boolean;
};

export type GeojsonEntry<T extends GeometryType> = {
	id: string;
	name: string;
	dataType: 'geojson';
	geometryType: T;
	url: string;
	attribution: string;
	sourceMinZoom?: number;
	sourceMaxZoom?: number;
	layerMinZoom?: number;
	layerMaxZoom?: number;
	opacity: number;
	style: VectorStyle;
	filter?: FilterSpecification;
	visible: boolean;
	fieldDict?: string; // プロパティの辞書ファイルのURL
	clickable?: boolean; // クリック可能かどうか
	searchKeys?: string[]; // 検索対象のプロパティ名
	remarks?: string; // 備考
	location?: Region[];
	bbox?: [number, number, number, number]; // バウンディングボックス
};

export type VectorEntry<T extends GeometryType> = {
	id: string;
	name: string;
	dataType: 'vector';
	geometryType: T;
	url: string;
	attribution: string;
	sourceMinZoom?: number;
	sourceMaxZoom?: number;
	sourceLayer: string;
	layerMinZoom?: number;
	layerMaxZoom?: number;
	opacity: number;
	style: VectorStyle;
	filter?: FilterSpecification;
	visible: boolean;
	showSymbol?: boolean;
	showLine?: boolean;
	showFill?: boolean;
	idField?: string; // フィーチャーのIDとして使用するフィールド名
	fieldDict?: string; // プロパティの辞書ファイルのURL
	clickable?: boolean; // クリック可能かどうか
	searchKeys?: string[]; // 検索対象のプロパティ名
	remarks?: string; // 備考
	location?: Region[];
	bbox?: [number, number, number, number]; // バウンディングボックス
};

export type LayerEntry =
	| RasterEntry
	| DemEntry
	| GeojsonEntry<GeometryType>
	| VectorEntry<GeometryType>;
