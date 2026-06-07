import {
	createAmedasFallbackEntry,
	loadAmedasPointEntry,
	type JmaAmedasConfig
} from '$routes/map/api/amedas';
import type { GeoDataEntryCatalogItem } from '$routes/map/data/types';

const config: JmaAmedasConfig = {
	id: 'jma_amedas',
	name: 'アメダス 最新観測値',
	description:
		'アメダスの最新観測値を観測所ごとの点で表したデータ。全国の気温や降水量などの分布を俯瞰して確認する際に利用できる。',
	tags: ['気象', '地図'],
	downloadUrl: 'https://www.jma.go.jp/bosai/amedas/'
};

const entry = createAmedasFallbackEntry(config);

const catalogItem: GeoDataEntryCatalogItem = {
	entry,
	loadEntry: () => loadAmedasPointEntry(config)
};

export default catalogItem;
