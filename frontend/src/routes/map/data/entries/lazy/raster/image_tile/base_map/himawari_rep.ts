import {
	createHimawariFallbackEntry,
	loadHimawariRasterEntry,
	type HimawariProductConfig
} from '$routes/map/api/himawari';
import type { GeoDataEntryCatalogItem } from '$routes/map/data/types';
import { MAP_IMAGE_BASE_PATH } from '$routes/constants';

const config: HimawariProductConfig = {
	id: 'himawari_rep',
	name: '気象衛星ひまわり トゥルーカラー再現画像',
	band: 'REP',
	prod: 'ETC',
	description:
		'気象衛星ひまわりのトゥルーカラー再現画像。観測時刻ごとの雲域や地表の見え方を自然色に近い表現で確認する際に利用できる。',
	tags: ['気象', '衛星'],
	xyzImageTile: { x: 7, y: 3, z: 3 },
	downloadUrl: 'https://www.data.jma.go.jp/sat_info/himawari/satobs.html',
	mapImage: `${MAP_IMAGE_BASE_PATH}/himawari_rep.webp`
};

const entry = createHimawariFallbackEntry(config);

const catalogItem: GeoDataEntryCatalogItem = {
	entry,
	loadEntry: () => loadHimawariRasterEntry(config)
};

export default catalogItem;
