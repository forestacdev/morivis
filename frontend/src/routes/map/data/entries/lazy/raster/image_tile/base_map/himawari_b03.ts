import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import {
	createHimawariFallbackEntry,
	type HimawariProductConfig,
	loadHimawariRasterEntry
} from '$routes/map/api/himawari';
import type { GeoDataEntryCatalogItem } from '$routes/map/data/types';

const config: HimawariProductConfig = {
	id: 'himawari_b03',
	name: '気象衛星ひまわり 可視画像',
	band: 'B03',
	prod: 'ALBD',
	description:
		'気象衛星ひまわりの可視画像。観測時刻ごとの雲域や雲の形状の変化を確認する際に利用できる。',
	tags: ['気象', '衛星'],
	xyzImageTile: { x: 7, y: 3, z: 3 },
	downloadUrl: 'https://www.data.jma.go.jp/mscweb/ja/prod/band_b01tob03.html',
	mapImage: `${MAP_IMAGE_BASE_PATH}/himawari_b03.webp`
};

const entry = createHimawariFallbackEntry(config);

const catalogItem: GeoDataEntryCatalogItem = {
	entry,
	loadEntry: () => loadHimawariRasterEntry(config)
};

export default catalogItem;
