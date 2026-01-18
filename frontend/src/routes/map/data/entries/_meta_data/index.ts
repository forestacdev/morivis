import type { BaseMetaData } from '$routes/map/data/types';

import { WEB_MERCATOR_WORLD_BBOX } from './_bounds';

export const DEFAULT_CUSTOM_META_DATA: BaseMetaData = {
	name: 'カスタムデータ',
	description: 'ユーザーがアップロードしたデータ',
	attribution: 'カスタムデータ',
	location: '不明',
	maxZoom: 24,
	minZoom: 0,
	tags: [],
	bounds: WEB_MERCATOR_WORLD_BBOX,
	xyzImageTile: { x: 0, y: 0, z: 0 }
};
