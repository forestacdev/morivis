import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';
import { FOREST_MESH_PROPERTIES } from '$routes/map/data/entries/vector/_properties';
import {
	FOREST_MESH_STYLE,
	TREE_SINGLE_COLOR_STYLE,
	createFilteredTreeMatchColorStyleMapping
} from '$routes/map/data/entries/vector/_style';

const entry: VectorEntry<TileMetaData> = {
	id: 'hyogo_fr_mesh20m',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://rinya-hyogo.geospatial.jp/2023/rinya/tile/fr_mesh20m/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '兵庫県 森林資源量集計メッシュ',
		attribution: '兵庫県',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/fr_mesh20m_hyogo',
		location: '兵庫県',
		tags: ['森林', 'メッシュ'],
		minZoom: 13,
		maxZoom: 16,
		sourceLayer: 'fr_mesh20m_hyogo',
		bounds: [134.252809, 34.156129, 135.468591, 35.674667],
		xyzImageTile: { x: 57274, y: 25978, z: 16 },
		center: [134.651168, 34.897842],
		mapImage: `${MAP_IMAGE_BASE_PATH}/hyogo_fr_mesh20m.webp`
	},
	properties: {
		fields: [
			...FOREST_MESH_PROPERTIES.fields,
			{
				key: 'ID',
				label: 'ID',
				type: 'string'
			},
			{
				key: '樹冠高90',
				label: '樹冠高90',
				type: 'number'
			},
			{
				key: '最大樹冠高',
				label: '最大樹冠高',
				type: 'number'
			}
		],
		attributeView: {
			popupKeys: [
				'樹種',
				'解析樹種',
				'面積_ha',
				'森林計測年',
				'森林計測法',
				'平均傾斜',
				'最大傾斜',
				'樹冠高90',
				'最大樹冠高',
				'県code',
				'市町村code'
			],
			relations: {
				...FOREST_MESH_PROPERTIES.attributeView.relations
			},
			titles: [
				...FOREST_MESH_PROPERTIES.attributeView.titles,
				{
					conditions: [],
					template: '兵庫県の森林資源メッシュ'
				}
			]
		}
	},
	interaction: {
		clickable: true
	},
	style: {
		...FOREST_MESH_STYLE,
		colors: {
			...FOREST_MESH_STYLE.colors,
			expressions: [
				TREE_SINGLE_COLOR_STYLE,
				{
					type: 'match',
					key: '解析樹種',
					name: '樹種ごとの色分け',
					mapping: createFilteredTreeMatchColorStyleMapping([
						'スギ',
						'ヒノキ類',
						'マツ類',
						'その他N',
						'その他L',
						'タケ',
						'その他'
					]), // 'その他' を含む
					noData: {
						value: 'transparent',
						pattern: null
					}
				}
			]
		},
		outline: {
			...FOREST_MESH_STYLE.outline
		},
		labels: {
			...FOREST_MESH_STYLE.labels,
			expressions: [...FOREST_MESH_STYLE.labels.expressions]
		},
		default: {
			...FOREST_MESH_STYLE.default
		}
	}
};

export default entry;

/**


  ---
  兵庫県「森林資源量集計メッシュ」属性情報サマリー

  基本情報

  - 座標系: JGD2011 / Japan Plane Rectangular CS V (EPSG:6673)
  - ジオメトリ: Multi Polygon
  - メッシュサイズ: 20m × 20m (面積 0.04 ha/メッシュ固定)

  ---
  属性一覧
  属性名: JF20mID
  型: TEXT(12)
  説明: 20mメッシュID
  値の範囲・例: 05LE23000000 など（図郭+連番）
  ────────────────────────────────────────
  属性名: 解析樹種ID
  型: TEXT(2)
  説明: 解析樹種コード
  値の範囲・例: 01=スギ, 02=ヒノキ類, 03=マツ類, 07=その他N, 11=その他L,
    12=タケ, 99=その他
  ────────────────────────────────────────
  属性名: 解析樹種
  型: TEXT(50)
  説明: 解析樹種名
  値の範囲・例: スギ, ヒノキ類, マツ類, その他N, その他L, タケ, その他
  ────────────────────────────────────────
  属性名: 樹種ID
  型: TEXT(5)
  説明: 樹種コード
  値の範囲・例: 1=スギ, 2=ヒノキ類, 3=マツ類, 4=その他針葉樹, 5=広葉樹,
    6=タケ, 7=その他
  ────────────────────────────────────────
  属性名: 樹種
  型: TEXT(50)
  説明: 樹種名
  値の範囲・例: スギ, ヒノキ類, マツ類, その他針葉樹, 広葉樹, タケ, その他
  ────────────────────────────────────────
  属性名: 面積_ha
  型: REAL
  説明: 面積 (ha)
  値の範囲・例: 0.04 (全て固定)
  ────────────────────────────────────────
  属性名: 立木本数
  型: INT
  説明: 立木本数
  値の範囲・例: 0〜90程度
  ────────────────────────────────────────
  属性名: 立木密度
  型: INT
  説明: 立木密度 (本/ha)
  値の範囲・例: 0〜2250程度
  ────────────────────────────────────────
  属性名: 平均樹高
  型: REAL
  説明: 平均樹高 (m)
  値の範囲・例: 0.0〜41.9
  ────────────────────────────────────────
  属性名: 平均直径
  型: REAL
  説明: 平均直径 (cm)
  値の範囲・例: 0.0〜69.2
  ────────────────────────────────────────
  属性名: 合計材積
  型: REAL
  説明: 合計材積 (m³)
  値の範囲・例: 0.0〜67.1
  ────────────────────────────────────────
  属性名: ha材積
  型: INT
  説明: ha当たり材積 (m³/ha)
  値の範囲・例: 0〜1677程度
  ────────────────────────────────────────
  属性名: 収量比数
  型: REAL
  説明: 収量比数 (Ry)
  値の範囲・例: 0.0〜0.9
  ────────────────────────────────────────
  属性名: 相対幹距比
  型: REAL
  説明: 相対幹距比 (Sr)
  値の範囲・例: 0.0〜327.9
  ────────────────────────────────────────
  属性名: 形状比
  型: REAL
  説明: 形状比 (H/D)
  値の範囲・例: 0.0〜131.8
  ────────────────────────────────────────
  属性名: 樹冠長率
  型: INT
  説明: 樹冠長率 (%)
  値の範囲・例: 0〜51程度
  ────────────────────────────────────────
  属性名: 森林計測年
  型: DATE
  説明: 計測年月日
  値の範囲・例: 2021-06-21 など
  ────────────────────────────────────────
  属性名: 森林計測法
  型: TEXT(1)
  説明: 計測方法コード
  値の範囲・例: 1
  ────────────────────────────────────────
  属性名: 平均傾斜
  型: INT
  説明: 平均傾斜 (度)
  値の範囲・例: 0〜71
  ────────────────────────────────────────
  属性名: 最大傾斜
  型: INT
  説明: 最大傾斜 (度)
  値の範囲・例: 0〜89
  ────────────────────────────────────────
  属性名: 最小傾斜
  型: INT
  説明: 最小傾斜 (度)
  値の範囲・例: 0〜42
  ────────────────────────────────────────
  属性名: 最頻傾斜
  型: INT
  説明: 最頻傾斜 (度)
  値の範囲・例: 0〜88
  ────────────────────────────────────────
  属性名: 県code
  型: TEXT(2)
  説明: 都道府県コード
  値の範囲・例: 28 (兵庫県)
  ────────────────────────────────────────
  属性名: 市町村code
  型: TEXT(5)
  説明: 市町村コード
  値の範囲・例: 28585, 28586 など
  ---
  樹種分布（サンプルファイル）
  ┌────────────────┬───────┐
  │      樹種      │ 割合  │
  ├────────────────┼───────┤
  │ 非森林（NULL） │ 46.9% │
  ├────────────────┼───────┤
  │ 広葉樹         │ 36.4% │
  ├────────────────┼───────┤
  │ スギ           │ 7.5%  │
  ├────────────────┼───────┤
  │ その他         │ 4.5%  │
  ├────────────────┼───────┤
  │ ヒノキ類       │ 4.1%  │
  ├────────────────┼───────┤
  │ タケ           │ 0.4%  │
  ├────────────────┼───────┤
  │ マツ類         │ 0.1%  │
  └────────────────┴───────┘
*/
