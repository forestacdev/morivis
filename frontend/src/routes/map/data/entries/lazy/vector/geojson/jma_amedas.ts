import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import {
	createAmedasFallbackEntry,
	type JmaAmedasConfig,
	loadAmedasPointEntry
} from '$routes/map/api/amedas';
import type { MorivisLayerEntryCatalogItem } from '$routes/map/data/types';

const config: JmaAmedasConfig = {
	id: 'jma_amedas',
	name: 'アメダス 観測値',
	description:
		'アメダスの観測値を観測所ごとの点で表したデータ。時刻を切り替えながら全国の気温や降水量などの分布を確認する際に利用できる。',
	tags: ['気象', '地図'],
	downloadUrl: 'https://www.jma.go.jp/bosai/amedas/',
	mapImage: `${MAP_IMAGE_BASE_PATH}/jma_amedas.webp`
};

const entry = createAmedasFallbackEntry(config);

const catalogItem: MorivisLayerEntryCatalogItem = {
	entry,
	loadEntry: () => loadAmedasPointEntry(config)
};

export default catalogItem;
