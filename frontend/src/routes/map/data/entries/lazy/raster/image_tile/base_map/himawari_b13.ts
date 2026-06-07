import {
	createHimawariFallbackEntry,
	loadHimawariRasterEntry,
	type HimawariProductConfig
} from '$routes/map/api/himawari';
import type { GeoDataEntryCatalogItem } from '$routes/map/data/types';
import { MAP_IMAGE_BASE_PATH } from '$routes/constants';

const config: HimawariProductConfig = {
	id: 'himawari_b13',
	name: '気象衛星ひまわり 赤外画像',
	band: 'B13',
	prod: 'TBB',
	description:
		'気象衛星ひまわりの赤外輝度温度画像。観測時刻ごとの雲域や雲頂温度の変化を確認する際に利用できる。',
	tags: ['気象', '衛星'],
	xyzImageTile: { x: 7, y: 3, z: 3 },
	downloadUrl: 'https://www.data.jma.go.jp/mscweb/ja/prod/band_b13.html',
	mapImage: `${MAP_IMAGE_BASE_PATH}/himawari_b13.webp`
};

const entry = createHimawariFallbackEntry(config);

const catalogItem: GeoDataEntryCatalogItem = {
	entry,
	loadEntry: () => loadHimawariRasterEntry(config)
};

export default catalogItem;
