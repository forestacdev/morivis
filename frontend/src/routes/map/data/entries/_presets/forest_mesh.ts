/**
 * 森林資源量集計メッシュ用プリセット
 *
 * 使用例:
 * export default createForestMeshEntry({
 *   id: 'hyogo_fr_mesh20m',
 *   prefecture: '兵庫県',
 *   url: 'https://example.com/tiles/mesh/{z}/{x}/{y}.pbf',
 *   sourceLayer: 'mesh_hyogo'
 * });
 */

import type { Region } from '$routes/map/data/types/location';
import type { Tag } from '$routes/map/data/types/tags';
import type { AttributionKey } from '$routes/map/data/entries/_meta_data/_attribution';
import type { VectorFormatType, PolygonEntry, TileMetaData } from '$routes/map/data/types/vector';
import type { FieldDef } from '$routes/map/data/types/vector/properties';
import type { ColorsExpression } from '$routes/map/data/types/vector/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { resolveBounds, type Bounds } from '$routes/map/data/entries/_meta_data/_bounds_map';
import {
	FOREST_MESH_FIELDS,
	FOREST_MESH_POPUP_KEYS,
	FOREST_MESH_RELATIONS,
	FOREST_MESH_TITLES
} from '$routes/map/data/entries/vector/_properties';
import {
	DEFAULT_POLYGON_STYLE,
	FOREST_MESH_LABELS,
	FOREST_MESH_OUTLINE,
	FOREST_MESH_STEP_COLOR_STYLE_EXPRESSIONS,
	TREE_SINGLE_COLOR_STYLE,
	TREE_MATCH_COLOR_STYLE,
	createFilteredTreeMatchColorStyleMapping
} from '$routes/map/data/entries/vector/_style';

type XYZPresetKey = keyof typeof IMAGE_TILE_XYZ_SETS;

export interface ForestMeshEntryConfig {
	/** エントリID */
	id: string;

	/** 都道府県名（boundsとlocationの自動設定に使用） */
	prefecture: Region;

	/** タイルURL */
	url: string;

	/** ソースレイヤー名 */
	sourceLayer: string;

	/** データフォーマット（デフォルト: mvt） */
	format?: VectorFormatType;

	/** 帰属表示 */
	attribution?: AttributionKey;

	/** ダウンロードURL */
	downloadUrl?: string;

	/** 元データ名 */
	sourceDataName?: string;

	/** カスタム名前（デフォルト: ${prefecture} 森林資源量メッシュ） */
	name?: string;

	/** 追加タグ */
	tags?: Tag[];

	/** カスタムbounds（指定しない場合はprefectureから自動解決） */
	bounds?: Region | Bounds;

	/** ズームレベル */
	zoom?: { min: number; max: number };

	/** プレビュータイル */
	xyzImageTile?: XYZPresetKey;

	/** 中心座標 */
	center?: [number, number];

	/** 追加フィールド定義 */
	additionalFields?: FieldDef[];

	/** 追加popupKeys */
	additionalPopupKeys?: string[];

	/** 樹種カテゴリのフィルタ（指定した樹種のみの色分けを使用） */
	treeCategories?: string[];

	/** カスタムカラー表現（指定した場合はデフォルトを上書き） */
	customColors?: ColorsExpression[];

	/** 透明度 */
	opacity?: 0.3 | 0.5 | 0.7 | 1;
}

export function createForestMeshEntry(
	config: ForestMeshEntryConfig
): PolygonEntry<TileMetaData> {
	const {
		id,
		prefecture,
		url,
		sourceLayer,
		format = 'mvt',
		attribution = 'カスタムデータ',
		downloadUrl,
		sourceDataName,
		name = `${prefecture} 森林資源量メッシュ`,
		tags = ['森林', 'メッシュ'] as Tag[],
		bounds = prefecture,
		zoom = { min: 10, max: 18 },
		xyzImageTile = 'zoom_14',
		center,
		additionalFields = [],
		additionalPopupKeys = [],
		treeCategories,
		customColors,
		opacity = 0.7
	} = config;

	// フィールドの結合
	const allFields = [...FOREST_MESH_FIELDS, ...additionalFields];

	// popupKeysの結合
	const allPopupKeys = [...FOREST_MESH_POPUP_KEYS, ...additionalPopupKeys];

	// カラー表現の構築
	let colorExpressions: ColorsExpression[];
	if (customColors) {
		colorExpressions = customColors;
	} else if (treeCategories) {
		// 特定の樹種カテゴリのみを使用
		colorExpressions = [
			{ ...TREE_SINGLE_COLOR_STYLE },
			{
				type: 'match',
				key: '解析樹種',
				name: '樹種ごとの色分け',
				mapping: createFilteredTreeMatchColorStyleMapping(treeCategories)
			},
			...FOREST_MESH_STEP_COLOR_STYLE_EXPRESSIONS
		];
	} else {
		colorExpressions = [
			{ ...TREE_SINGLE_COLOR_STYLE },
			{ ...TREE_MATCH_COLOR_STYLE },
			...FOREST_MESH_STEP_COLOR_STYLE_EXPRESSIONS
		];
	}

	// ラベル表現の構築（追加フィールドも含める）
	const labelExpressions = [
		...FOREST_MESH_LABELS.expressions,
		...additionalFields.map((f) => ({
			key: f.key,
			name: f.label ?? f.key
		}))
	];

	// xyzImageTileの解決
	const resolvedXyzImageTile = IMAGE_TILE_XYZ_SETS[xyzImageTile as XYZPresetKey];

	return {
		id,
		type: 'vector',
		format: {
			type: format,
			geometryType: 'Polygon',
			url
		},
		metaData: {
			name,
			sourceDataName,
			attribution,
			downloadUrl,
			location: prefecture,
			tags,
			minZoom: zoom.min,
			maxZoom: zoom.max,
			sourceLayer,
			bounds: resolveBounds(bounds),
			xyzImageTile: resolvedXyzImageTile,
			...(center && { center })
		},
		properties: {
			fields: allFields,
			attributeView: {
				popupKeys: allPopupKeys,
				titles: [
					...FOREST_MESH_TITLES,
					{
						conditions: [],
						template: `${prefecture}の森林資源量メッシュ`
					}
				],
				relations: {
					...FOREST_MESH_RELATIONS
				}
			}
		},
		interaction: {
			clickable: true
		},
		style: {
			type: 'fill',
			opacity,
			colors: {
				key: '解析樹種',
				show: true,
				expressions: colorExpressions
			},
			outline: {
				...FOREST_MESH_OUTLINE
			},
			labels: {
				...FOREST_MESH_LABELS,
				expressions: labelExpressions
			},
			default: {
				...DEFAULT_POLYGON_STYLE
			}
		}
	};
}
