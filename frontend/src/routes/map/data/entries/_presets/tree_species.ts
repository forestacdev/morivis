/**
 * 樹種ポリゴン用プリセット
 *
 * 使用例:
 * export default createTreeSpeciesEntry({
 *   id: 'hyogo_tree_species',
 *   prefecture: '兵庫県',
 *   url: 'https://rinya-hyogo.geospatial.jp/2023/rinya/tile/tree_species/{z}/{x}/{y}.pbf',
 *   sourceLayer: 'tree_species_hyogo',
 *   downloadUrl: 'https://www.geospatial.jp/ckan/dataset/tree_species_hyogo'
 * });
 */

import type { Region } from '$routes/map/data/types/location';
import type { Tag } from '$routes/map/data/types/tags';
import type { AttributionKey } from '$routes/map/data/entries/_meta_data/_attribution';
import type { VectorFormatType, PolygonEntry, TileMetaData } from '$routes/map/data/types/vector';
import type { FieldDef } from '$routes/map/data/types/vector/properties';
import type { ColorsExpression, PolygonStyle } from '$routes/map/data/types/vector/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { resolveBounds, type Bounds } from '$routes/map/data/entries/_meta_data/_bounds_map';
import {
	TREE_SPECIES_FIELDS,
	TREE_SPECIES_POPUP_KEYS,
	TREE_SPECIES_RELATIONS,
	TREE_SPECIES_TITLES
} from '$routes/map/data/entries/vector/_properties';
import {
	DEFAULT_POLYGON_STYLE,
	TREE_SPECIES_LABELS,
	TREE_SPECIES_OUTLINE,
	TREE_SINGLE_COLOR_STYLE,
	TREE_MATCH_COLOR_STYLE
} from '$routes/map/data/entries/vector/_style';

type XYZPresetKey = keyof typeof IMAGE_TILE_XYZ_SETS;

export interface TreeSpeciesEntryConfig {
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

	/** カスタム名前（デフォルト: ${prefecture} 樹種ポリゴン） */
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

	/** 面積Step用のrange */
	areaRange?: [number, number];

	/** カスタムカラー表現 */
	customColors?: ColorsExpression[];

	/** 透明度 */
	opacity?: 0.3 | 0.5 | 0.7 | 1;
}

export function createTreeSpeciesEntry(
	config: TreeSpeciesEntryConfig
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
		name = `${prefecture} 樹種ポリゴン`,
		tags = ['森林', '林相図'] as Tag[],
		bounds = prefecture,
		zoom = { min: 8, max: 18 },
		xyzImageTile = 'zoom_14',
		center,
		additionalFields = [],
		additionalPopupKeys = [],
		areaRange = [0, 200],
		customColors,
		opacity = 0.5
	} = config;

	// フィールドの結合
	const allFields = [...TREE_SPECIES_FIELDS, ...additionalFields];

	// popupKeysの結合
	const allPopupKeys = [...TREE_SPECIES_POPUP_KEYS, ...additionalPopupKeys];

	// カラー表現の構築
	const colorExpressions: ColorsExpression[] = customColors ?? [
		{ ...TREE_SINGLE_COLOR_STYLE },
		{ ...TREE_MATCH_COLOR_STYLE },
		{
			type: 'step',
			key: '面積_ha',
			name: '面積ごとの色分け',
			mapping: {
				scheme: 'RdPu',
				range: areaRange,
				divisions: 5
			}
		}
	];

	// ラベル表現の構築（追加フィールドも含める）
	const labelExpressions = [
		...TREE_SPECIES_LABELS.expressions,
		...additionalFields.map((f) => ({
			key: f.key,
			name: f.label ?? f.key
		}))
	];

	// xyzImageTileの解決
	const resolvedXyzImageTile = IMAGE_TILE_XYZ_SETS[xyzImageTile];

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
					...TREE_SPECIES_TITLES,
					{
						conditions: [],
						template: `${prefecture}の樹種ポリゴン`
					}
				],
				relations: {
					...TREE_SPECIES_RELATIONS
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
				...TREE_SPECIES_OUTLINE
			},
			labels: {
				...TREE_SPECIES_LABELS,
				expressions: labelExpressions
			},
			default: {
				...DEFAULT_POLYGON_STYLE
			}
		}
	};
}
