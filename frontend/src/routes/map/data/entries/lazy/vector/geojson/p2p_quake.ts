import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import {
	createEarthquakeFallbackEntry,
	loadEarthquakePointEntry,
	type QuakePointConfig
} from '$routes/map/api/quake';
import type { MorivisLayerEntryCatalogItem } from '$routes/map/data/types';

const config: QuakePointConfig = {
	id: '!p2p_quake',
	name: '地震情報 震源点',
	description:
		'地震情報 API の履歴から震源点を表したデータ。発生時刻や最大震度、マグニチュードを確認する際に利用できる。',
	tags: ['地震', '気象'],
	downloadUrl: 'https://www.p2pquake.net/develop/json_api_v2/',
	mapImage: `${MAP_IMAGE_BASE_PATH}/p2p_quake.webp`
};

const entry = createEarthquakeFallbackEntry(config);

const catalogItem: MorivisLayerEntryCatalogItem = {
	entry,
	loadEntry: () => loadEarthquakePointEntry(config)
};

export default catalogItem;
