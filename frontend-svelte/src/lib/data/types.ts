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

type VectorStyle = {
	fill?: LayerPaint<FillLayerSpecification['paint'], FillLayerSpecification['layout']>[];
	line?: LayerPaint<LineLayerSpecification['paint'], LineLayerSpecification['layout']>[];
	symbol?: LayerPaint<SymbolLayerSpecification['paint'], SymbolLayerSpecification['layout']>[];
	circle?: LayerPaint<CircleLayerSpecification['paint'], CircleLayerSpecification['layout']>[];
	heatmap?: LayerPaint<HeatmapLayerSpecification['paint'], HeatmapLayerSpecification['layout']>[];
	fillExtrusion?: LayerPaint<
		FillExtrusionLayerSpecification['paint'],
		FillExtrusionLayerSpecification['layout']
	>[];
};

type RasterStyle = {
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
type Region =
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
	style?: RasterStyle;
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
	styleKey: string;
	style?: VectorStyle;
	filter?: FilterSpecification;
	visible: boolean;
	showLabel?: boolean;
	showLine?: boolean;
	showFill?: boolean;
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
	style?: VectorStyle;
	filter?: FilterSpecification;
	visible: boolean;
	showLabel?: boolean;
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

export type LayerEntry = RasterEntry | GeojsonEntry<GeometryType> | VectorEntry<GeometryType>;
