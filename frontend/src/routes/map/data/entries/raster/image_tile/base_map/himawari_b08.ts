import { createHimawariFallbackEntry, type HimawariProductConfig } from '$routes/map/api/himawari';

const config: HimawariProductConfig = {
	id: 'himawari_b08',
	name: '気象衛星ひまわり 水蒸気画像',
	band: 'B08',
	prod: 'TBB',
	description:
		'気象衛星ひまわりの水蒸気画像。観測時刻ごとの上空の湿りや大気の流れの変化を確認する際に利用できる。',
	tags: ['気象', '衛星'],
	xyzImageTile: { x: 7, y: 3, z: 3 },
	downloadUrl: 'https://www.data.jma.go.jp/mscweb/ja/prod/band_wv.html'
};

const entry = createHimawariFallbackEntry(config);

export default entry;
