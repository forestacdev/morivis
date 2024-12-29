import type { DemDataTypeKey } from './raster/dem';

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
	stops: { [key: string]: string }; // 補間に使うストップ値と色
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

// 地域ごとの都道府県型
type Hokkaido = '北海道';

type Tohoku = '青森県' | '岩手県' | '宮城県' | '秋田県' | '山形県' | '福島県';

type Kanto = '茨城県' | '栃木県' | '群馬県' | '埼玉県' | '千葉県' | '東京都' | '神奈川県';

type Chubu =
	| '新潟県'
	| '富山県'
	| '石川県'
	| '福井県'
	| '山梨県'
	| '長野県'
	| '岐阜県'
	| '静岡県'
	| '愛知県';

type Kinki = '三重県' | '滋賀県' | '京都府' | '大阪府' | '兵庫県' | '奈良県' | '和歌山県';

type Chugoku = '鳥取県' | '島根県' | '岡山県' | '広島県' | '山口県';

type Shikoku = '徳島県' | '香川県' | '愛媛県' | '高知県';

type Kyushu = '福岡県' | '佐賀県' | '長崎県' | '熊本県' | '大分県' | '宮崎県' | '鹿児島県';

type Okinawa = '沖縄県';

type LocationOther = '森林文化アカデミー' | '美濃市' | 'その他';
// 全都道府県型
export type Region =
	| Hokkaido
	| Tohoku
	| Kanto
	| Chubu
	| Kinki
	| Chugoku
	| Shikoku
	| Kyushu
	| Okinawa
	| '全国'
	| '世界'
	| LocationOther;

export type GeometryType = 'polygon' | 'line' | 'point' | 'label' | 'raster';

export type RasterEntry = {
	id: string;
	name: string;
	dataType: 'raster';
	geometryType: 'raster';
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

export type DemEntry = {
	id: string;
	tileId: string;
	visualMode: DemVisualMode;
	uniformsData: {
		evolution: {
			visible: boolean;
			opacity: number;
			max: number;
			min: number;
			colorMap: string;
		};
		shadow: {
			visible: boolean;
			opacity: number;
			azimuth: number;
			altitude: number;
		};
		aspect: {
			opacity: number;
			visible: boolean;
			colorMap: string;
		};
		slope: {
			opacity: number;
			visible: boolean;
			colorMap: string;
		};
		curvature: {
			visible: boolean;
			opacity: number;
			ridgeThreshold: number;
			valleyThreshold: number;
			ridgeColor: string;
			valleyColor: string;
		};
	};
	name: string;
	dataType: 'raster';
	geometryType: 'dem';
	demType: DemDataTypeKey;
	url: string;
	protocolKey: ProtocolKey;
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
	styleKey: string;
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
