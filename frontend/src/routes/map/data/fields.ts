import type { FieldDef } from '$routes/map/data/types/vector/properties';

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
		unit: 'ha'
	},
	{
		key: '森林計測年',
		label: '森林計測年',
		type: 'number'
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
