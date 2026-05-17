import {
	createJmaNowcastFallbackEntry,
	type JmaNowcastConfig
} from '$routes/map/api/nowcast';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const config: JmaNowcastConfig = {
	id: 'jma_nowcast',
	name: '高解像度降水ナウキャスト',
	description:
		'気象庁の高解像度降水ナウキャスト。観測時刻ごとの降水分布や降水域の移動を確認する際に利用できる。',
	tags: ['地図'],
	xyzImageTile: { x: 7, y: 3, z: 4 },
	downloadUrl: 'https://www.jma.go.jp/jma/kishou/know/kurashi/highres_nowcast.html'
};

const entry = createJmaNowcastFallbackEntry(config);

const categoricalEntry = entry as unknown as RasterImageEntry<RasterCategoricalStyle>;
categoricalEntry.style = {
	...DEFAULT_RASTER_CATEGORICAL_STYLE,
	opacity: 0.7,
	legend: {
		type: 'category',
		name: '降水強度',
		colors: [
			'#f2f4fb',
			'#85b6f4',
			'#5c8ef0',
			'#54d7f7',
			'#ffe45c',
			'#ff9b4b',
			'#ff5b5b',
			'#c63a97'
		],
		labels: [
			'0 mm/h',
			'1 mm/h',
			'5 mm/h',
			'10 mm/h',
			'20 mm/h',
			'30 mm/h',
			'50 mm/h',
			'80 mm/h以上'
		]
	}
};

export default categoricalEntry;
