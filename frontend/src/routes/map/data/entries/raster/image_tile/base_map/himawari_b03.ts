import {
	createHimawariFallbackEntry,
	type HimawariProductConfig
} from '$routes/map/api/himawari';

const config: HimawariProductConfig = {
	id: 'himawari_b03',
	name: '気象衛星ひまわり 可視画像',
	band: 'B03',
	prod: 'ALBD',
	description:
		'気象衛星ひまわりの可視画像。観測時刻ごとの雲域や雲の形状の変化を確認する際に利用できる。',
	tags: ['気象', '衛星'],
	xyzImageTile: { x: 7, y: 3, z: 3 },
	downloadUrl: 'https://www.data.jma.go.jp/mscweb/ja/prod/band_b01tob03.html'
};

const entry = createHimawariFallbackEntry(config);

export default entry;
