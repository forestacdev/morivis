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
	FilterSpecification
} from 'maplibre-gl';

type LayerPaint<T, U> = { name: string; paint: T; layout?: U };

// LayerStyle に拡張された LayerSpecification 型を使用
type LayerStyle = {
	fill?: LayerPaint<FillLayerSpecification['paint'], FillLayerSpecification['layout']>[];
	line?: LayerPaint<LineLayerSpecification['paint'], LineLayerSpecification['layout']>[];
	symbol?: LayerPaint<SymbolLayerSpecification['paint'], SymbolLayerSpecification['layout']>[];
	circle?: LayerPaint<CircleLayerSpecification['paint'], CircleLayerSpecification['layout']>[];
	heatmap?: LayerPaint<HeatmapLayerSpecification['paint'], HeatmapLayerSpecification['layout']>[];
	fillExtrusion?: LayerPaint<
		FillExtrusionLayerSpecification['paint'],
		FillExtrusionLayerSpecification['layout']
	>[];
	raster?: LayerPaint<RasterLayerSpecification['paint'], RasterLayerSpecification['layout']>[];
	hillshade?: LayerPaint<
		HillshadeLayerSpecification['paint'],
		HillshadeLayerSpecification['layout']
	>[];
	background?: LayerPaint<
		BackgroundLayerSpecification['paint'],
		BackgroundLayerSpecification['layout']
	>[];
};

export type rasterEntry = {};

export type vectorEntry = {};

export type LayerEntry = {
	id: string;
	name: string;
	type:
		| 'raster'
		| 'vector-polygon'
		| 'vector-line'
		| 'vector-point'
		| 'vector-label'
		| 'geojson-polygon'
		| 'geojson-line'
		| 'geojson-point'
		| 'geojson-label';
	path: string;
	attribution: string;
	source_minzoom?: number;
	source_maxzoom?: number;
	source_layer?: string;
	layer_minzoom?: number;
	layer_maxzoom?: number;
	opacity: number;
	style_key: string;
	style?: LayerStyle;
	filter?: FilterSpecification;
	visible: boolean;
	show_label?: boolean;
	show_outline?: boolean;
	show_fill?: boolean;
	id_field?: string; // フィーチャーのIDとして使用するフィールド名
	prop_dict?: string; // プロパティの辞書ファイルのURL
	clickable?: boolean; // クリック可能かどうか
	searchKeys?: string[]; // 検索対象のプロパティ名
	remarks?: string; // 備考
	bbox?: [number, number, number, number]; // バウンディングボックス
};
