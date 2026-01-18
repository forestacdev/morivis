import type {
	FieldDef,
	Title,
	Relations,
	VectorProperties
} from '$routes/map/data/types/vector/properties';

// =============================================================================
// 樹種ポリゴン (Tree Species Polygon)
// =============================================================================

export const TREE_SPECIES_POPUP_KEYS: string[] = [
	'樹種',
	'解析樹種',
	'面積_ha',
	'森林計測年',
	'森林計測法',
	'樹種ID',
	'県code',
	'市町村code',
	'解析樹種ID'
];

export const TREE_SPECIES_TITLES: Title[] = [
	{
		conditions: ['樹種'],
		template: '{樹種}'
	}
];

export const TREE_SPECIES_RELATIONS: Relations = {
	cityCodeKey: '市町村code',
	iNaturalistNameKey: '樹種'
};

export const TREE_SPECIES_FIELDS: FieldDef[] = [
	{
		key: '解析樹種ID',
		label: '解析樹種ID',
		type: 'number'
	},
	{
		key: '解析樹種',
		label: '解析樹種',
		type: 'string'
	},
	{
		key: '樹種ID',
		label: '樹種ID',
		type: 'number'
	},
	{
		key: '樹種',
		label: '樹種',
		type: 'string'
	},
	{
		key: '面積_ha',
		label: '面積',
		type: 'number',
		unit: 'ha',
		format: { digits: 4 }
	},
	{
		key: '森林計測年',
		label: '森林計測年',
		type: 'date',
		format: {
			date: {
				inputPatterns: ['YYYY-MM-DDTHH:mm:ss'],
				invalidText: '不明'
			}
		}
	},
	{
		key: '森林計測法',
		label: '森林計測法',
		type: 'string',
		valueDict: {
			'1': '航空レーザ',
			'2': '航空写真',
			'3': 'UAVレーザ',
			'4': 'UAV写真',
			'5': '地上レーザ'
		}
	},
	{
		key: '県code',
		label: '県code',
		type: 'number'
	},
	{
		key: '市町村code',
		label: '市町村code',
		type: 'number'
	}
];

export const TREE_SPECIES_PROPERTIES: VectorProperties = {
	attributeView: {
		popupKeys: [...TREE_SPECIES_POPUP_KEYS],
		titles: [...TREE_SPECIES_TITLES],
		relations: {
			...TREE_SPECIES_RELATIONS
		}
	},
	fields: [...TREE_SPECIES_FIELDS]
};

// =============================================================================
// 森林資源量集計メッシュ (Forest Resource Mesh 20m)
// =============================================================================
export const FOREST_MESH_POPUP_KEYS: string[] = [
	'解析樹種ID',
	'解析樹種',
	'樹種ID',
	'樹種',
	'面積_ha',
	'立木本数',
	'立木密度',
	'平均樹高',
	'平均直径',
	'合計材積',
	'ha材積',
	'収量比数',
	'相対幹距比',
	'形状比',
	'樹冠長率',
	'森林計測年',
	'森林計測法',
	'平均傾斜',
	'最大傾斜',
	'最小傾斜',
	'最頻傾斜',
	'県code',
	'市町村code'
	// 'ID',
	// '樹冠高90',
	// '最大樹冠高'
];

export const FOREST_MESH_TITLES: Title[] = [
	{
		conditions: ['樹種'],
		template: '{樹種}'
	}
];

export const FOREST_MESH_RELATIONS: Relations = {
	cityCodeKey: '市町村code'
};

export const FOREST_MESH_FIELDS: FieldDef[] = [
	// -------------------------------------------------------------------------
	// 基本属性（●：必須）
	// -------------------------------------------------------------------------
	{
		key: 'JF20mID',
		label: 'Japan Forest 20mメッシュID',
		type: 'string'
	},
	{
		key: '解析樹種ID',
		label: '解析樹種ID',
		type: 'string'
	},
	{
		key: '解析樹種',
		label: '解析樹種',
		type: 'string'
	},
	{
		key: '樹種ID',
		label: '樹種ID',
		type: 'string'
	},
	{
		key: '樹種',
		label: '樹種',
		type: 'string'
	},
	{
		key: '面積_ha',
		label: '面積',
		type: 'number',
		unit: 'ha',
		format: { digits: 4 }
	},
	{
		key: '立木本数',
		label: '立木本数',
		type: 'integer',
		unit: '本'
		// format: {
		// 	empty: [{ values: [0], text: '不明' }]
		// }
	},
	{
		key: '立木密度',
		label: '立木密度',
		type: 'number',
		unit: '本/ha'
	},
	{
		key: '平均樹高',
		label: '平均樹高',
		type: 'number',
		unit: 'm',
		format: { digits: 1 }
	},
	{
		key: '平均直径',
		label: '平均直径',
		type: 'number',
		unit: 'cm',
		format: { digits: 1 }
	},
	{
		key: '合計材積',
		label: '合計材積',
		type: 'number',
		unit: 'm³',
		format: { digits: 3 }
	},
	{
		key: 'ha材積',
		label: 'ha材積',
		type: 'number',
		unit: 'm³/ha'
	},
	{
		key: '収量比数',
		label: '収量比数',
		type: 'number',
		format: { digits: 2 }
	},
	{
		key: '相対幹距比',
		label: '相対幹距比',
		type: 'number',
		unit: '%',
		format: { digits: 1 }
	},
	{
		key: '森林計測年',
		label: '森林計測年',
		type: 'date',
		format: {
			date: {
				inputPatterns: ['YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DD'],
				invalidText: '不明'
			}
		}
	},
	{
		key: '森林計測法',
		label: '森林計測法',
		type: 'string',
		valueDict: {
			'1': '航空レーザ',
			'2': '航空写真',
			'3': 'UAVレーザ',
			'4': 'UAV写真',
			'5': '地上レーザ'
		}
	},
	{
		key: '県code',
		label: '都道府県コード',
		type: 'string'
	},
	{
		key: '市町村code',
		label: '市町村コード',
		type: 'string'
	},
	// -------------------------------------------------------------------------
	// 推奨属性（○：推奨）
	// -------------------------------------------------------------------------
	{
		key: '形状比',
		label: '形状比',
		type: 'number',
		format: { digits: 1 }
	},
	{
		key: '樹冠長率',
		label: '樹冠長率',
		type: 'number',
		unit: '%'
	},
	{
		key: '平均傾斜',
		label: '平均傾斜',
		type: 'number',
		unit: '度'
	},
	{
		key: '最大傾斜',
		label: '最大傾斜',
		type: 'number',
		unit: '度'
	},
	{
		key: '最小傾斜',
		label: '最小傾斜',
		type: 'number',
		unit: '度'
	},
	{
		key: '最頻傾斜',
		label: '最頻傾斜',
		type: 'number',
		unit: '度'
	}
];

export const FOREST_MESH_PROPERTIES: VectorProperties = {
	attributeView: {
		popupKeys: [...FOREST_MESH_POPUP_KEYS],
		titles: [...FOREST_MESH_TITLES],
		relations: {
			...FOREST_MESH_RELATIONS
		}
	},
	fields: [...FOREST_MESH_FIELDS]
};
